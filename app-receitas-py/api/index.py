import os
import sqlite3
import sys
from typing import List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend import mealdb
from backend.banco import BancoDeDados
from backend.caderno import Caderno
from backend.modelos import Avaliacao, Categoria, Ingrediente, ItemReceita, Receita
from backend.receita import nome_da_categoria, obter_ingredientes, preparar_passos
from backend.traducao import traduzir_lote, traduzir_texto

app = FastAPI(title="API do Buscador de Receitas")

with BancoDeDados() as _banco:
    Caderno(_banco).populador.popular_se_vazio()


def novo_cliente():
    return httpx.AsyncClient(timeout=10.0)


def obter_caderno():
    banco = BancoDeDados()
    try:
        yield Caderno(banco)
    finally:
        banco.fechar()


@app.exception_handler(httpx.HTTPError)
async def erro_de_rede(_request: Request, _erro: httpx.HTTPError):
    return JSONResponse(
        status_code=502,
        content={"detail": "Não foi possível consultar o TheMealDB agora."},
    )


@app.exception_handler(sqlite3.IntegrityError)
async def erro_de_integridade(_request: Request, _erro: sqlite3.IntegrityError):
    return JSONResponse(
        status_code=409,
        content={"detail": "Operação recusada: registro duplicado ou em uso por outra tabela."},
    )


@app.exception_handler(ValueError)
async def erro_de_validacao(_request: Request, erro: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(erro)})


class ItemEntrada(BaseModel):
    nome: str = Field(..., min_length=1, max_length=80)
    quantidade: str = Field("", max_length=80)


class ReceitaEntrada(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=120)
    categoria: str = Field("", max_length=60)
    origem: str = Field("", max_length=60)
    imagem: str = Field("", max_length=500)
    modo_preparo: str = Field(..., min_length=1, max_length=10000)
    itens: List[ItemEntrada] = Field(default_factory=list)


class CategoriaEntrada(BaseModel):
    nome: str = Field(..., min_length=1, max_length=60)
    descricao: str = Field("", max_length=200)


class IngredienteEntrada(BaseModel):
    nome: str = Field(..., min_length=1, max_length=80)


class AvaliacaoEntrada(BaseModel):
    nota: int = Field(..., ge=1, le=5)
    comentario: str = Field("", max_length=500)


class ImportacaoEntrada(BaseModel):
    id_mealdb: str = Field(..., pattern=r"^\d+$")
    favorita: bool = False


def nomes_categorias(caderno):
    return {categoria.id: categoria.nome for categoria in caderno.categorias.listar()}


def categoria_json(categoria):
    return {"id": categoria.id, "nome": categoria.nome, "descricao": categoria.descricao}


def ingrediente_json(ingrediente):
    return {"id": ingrediente.id, "nome": ingrediente.nome}


def avaliacao_json(avaliacao):
    return {
        "id": avaliacao.id,
        "nota": avaliacao.nota,
        "comentario": avaliacao.comentario,
        "criada_em": avaliacao.criada_em,
    }


def resumo_json(receita, nomes):
    return {
        "id": receita.id,
        "titulo": receita.titulo,
        "categoria": nomes.get(receita.categoria_id, ""),
        "origem": receita.origem,
        "imagem": receita.imagem,
        "favorita": receita.favorita,
        "id_mealdb": receita.id_mealdb,
    }


def detalhe_json(caderno, receita):
    media, total = caderno.avaliacoes.media(receita.id)
    return {
        **resumo_json(receita, nomes_categorias(caderno)),
        "passos": receita.passos,
        "itens": [
            {"id": item.ingrediente.id, "nome": item.ingrediente.nome, "quantidade": item.quantidade}
            for item in receita.itens
        ],
        "avaliacoes": [avaliacao_json(a) for a in caderno.avaliacoes.listar_por_receita(receita.id)],
        "media": round(media, 1) if media else None,
        "total_avaliacoes": total,
    }


def receita_ou_404(caderno, id_receita):
    receita = caderno.receitas.buscar(id_receita)
    if receita is None:
        raise HTTPException(status_code=404, detail="Receita não encontrada.")
    return receita


def montar_receita(caderno, dados, atual=None):
    categoria = dados.categoria.strip()
    return Receita(
        titulo=dados.titulo,
        modo_preparo=dados.modo_preparo,
        categoria_id=caderno.categorias.obter_ou_criar(categoria).id if categoria else None,
        origem=dados.origem.strip(),
        imagem=dados.imagem.strip(),
        favorita=atual.favorita if atual else False,
        id_mealdb=atual.id_mealdb if atual else None,
        id=atual.id if atual else None,
        itens=[
            ItemReceita(Ingrediente(item.nome), item.quantidade.strip())
            for item in dados.itens
            if item.nome.strip()
        ],
    )


async def resumos_traduzidos(cliente, receitas):
    titulos, _ = await traduzir_lote(cliente, [r["strMeal"] for r in receitas])
    return [
        {
            "idMeal": r["idMeal"],
            "strMeal": r["strMeal"],
            "strMealThumb": r["strMealThumb"],
            "tituloPt": titulo or r["strMeal"],
        }
        for r, titulo in zip(receitas, titulos)
    ]


async def receita_completa(cliente, receita):
    ingredientes = obter_ingredientes(receita)
    passos = preparar_passos(receita.get("strInstructions"))

    linhas, parcial = await traduzir_lote(
        cliente,
        [receita.get("strMeal"), receita.get("strArea") or "", *ingredientes, *passos],
    )
    total = len(ingredientes)

    return {
        "idMeal": receita["idMeal"],
        "strMeal": receita["strMeal"],
        "strMealThumb": receita["strMealThumb"],
        "tituloPt": linhas[0] or receita["strMeal"],
        "categoria": nome_da_categoria(receita.get("strCategory")),
        "area": linhas[1],
        "ingredientes": linhas[2 : 2 + total],
        "passos": linhas[2 + total :],
        "youtube": receita.get("strYoutube") or "",
        "parcial": parcial,
    }


@app.get("/api")
async def raiz():
    return {"ok": True}


@app.get("/api/categorias")
async def categorias():
    async with novo_cliente() as cliente:
        lista = await mealdb.listar_categorias(cliente)
    return [{"id": c, "nome": nome_da_categoria(c)} for c in lista]


@app.get("/api/buscar")
async def buscar(termo: str = Query(..., min_length=1, max_length=100)):
    async with novo_cliente() as cliente:
        try:
            termo_em_ingles = await traduzir_texto(cliente, termo, "pt", "en")
        except Exception:
            termo_em_ingles = termo
        receitas = await mealdb.buscar_por_nome(cliente, termo_em_ingles.lower())
        return await resumos_traduzidos(cliente, receitas)


@app.get("/api/categoria")
async def por_categoria(nome: str = Query(..., min_length=1, max_length=50)):
    async with novo_cliente() as cliente:
        receitas = await mealdb.buscar_por_categoria(cliente, nome)
        return await resumos_traduzidos(cliente, receitas)


@app.get("/api/receita/{id_receita}")
async def receita(id_receita: str):
    if not id_receita.isdigit():
        raise HTTPException(status_code=400, detail="ID de receita inválido.")

    async with novo_cliente() as cliente:
        dados = await mealdb.detalhes_receita(cliente, id_receita)
        if dados is None:
            raise HTTPException(status_code=404, detail="Receita não encontrada.")
        return await receita_completa(cliente, dados)


@app.get("/api/aleatoria")
async def aleatoria():
    async with novo_cliente() as cliente:
        dados = await mealdb.receita_aleatoria(cliente)
        if dados is None:
            raise HTTPException(status_code=502, detail="Nenhuma receita sorteada.")
        return await receita_completa(cliente, dados)


@app.get("/api/caderno/receitas")
def listar_receitas_caderno(favoritas: bool = False, caderno: Caderno = Depends(obter_caderno)):
    receitas = caderno.receitas.listar_favoritas() if favoritas else caderno.receitas.listar()
    nomes = nomes_categorias(caderno)
    return [resumo_json(r, nomes) for r in receitas]


@app.get("/api/caderno/receitas/{id_receita}")
def detalhar_receita_caderno(id_receita: int, caderno: Caderno = Depends(obter_caderno)):
    return detalhe_json(caderno, receita_ou_404(caderno, id_receita))


@app.post("/api/caderno/receitas", status_code=201)
def criar_receita_caderno(dados: ReceitaEntrada, caderno: Caderno = Depends(obter_caderno)):
    receita = caderno.receitas.criar(montar_receita(caderno, dados))
    return detalhe_json(caderno, caderno.receitas.buscar(receita.id))


@app.put("/api/caderno/receitas/{id_receita}")
def atualizar_receita_caderno(
    id_receita: int, dados: ReceitaEntrada, caderno: Caderno = Depends(obter_caderno)
):
    receita = montar_receita(caderno, dados, receita_ou_404(caderno, id_receita))
    caderno.receitas.atualizar_com_itens(receita)
    return detalhe_json(caderno, caderno.receitas.buscar(receita.id))


@app.patch("/api/caderno/receitas/{id_receita}/favorita")
def alternar_favorita(id_receita: int, caderno: Caderno = Depends(obter_caderno)):
    receita = receita_ou_404(caderno, id_receita)
    receita.alternar_favorita()
    caderno.receitas.atualizar(receita)
    return resumo_json(receita, nomes_categorias(caderno))


@app.delete("/api/caderno/receitas/{id_receita}", status_code=204)
def excluir_receita_caderno(id_receita: int, caderno: Caderno = Depends(obter_caderno)):
    if not caderno.receitas.excluir(id_receita):
        raise HTTPException(status_code=404, detail="Receita não encontrada.")
    return Response(status_code=204)


@app.post("/api/caderno/importar", status_code=201)
async def importar_receita(dados: ImportacaoEntrada, caderno: Caderno = Depends(obter_caderno)):
    async with novo_cliente() as cliente:
        bruto = await mealdb.detalhes_receita(cliente, dados.id_mealdb)
        if bruto is None:
            raise HTTPException(status_code=404, detail="Receita não encontrada no TheMealDB.")
        receita, parcial = await caderno.importador.importar(cliente, bruto, favorita=dados.favorita)
    return {**detalhe_json(caderno, caderno.receitas.buscar(receita.id)), "parcial": parcial}


@app.get("/api/caderno/categorias")
def listar_categorias_caderno(caderno: Caderno = Depends(obter_caderno)):
    return [categoria_json(c) for c in caderno.categorias.listar()]


@app.post("/api/caderno/categorias", status_code=201)
def criar_categoria(dados: CategoriaEntrada, caderno: Caderno = Depends(obter_caderno)):
    return categoria_json(caderno.categorias.criar(Categoria(dados.nome, dados.descricao.strip())))


@app.put("/api/caderno/categorias/{id_categoria}")
def atualizar_categoria(
    id_categoria: int, dados: CategoriaEntrada, caderno: Caderno = Depends(obter_caderno)
):
    if caderno.categorias.buscar(id_categoria) is None:
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    categoria = Categoria(dados.nome, dados.descricao.strip(), id_categoria)
    caderno.categorias.atualizar(categoria)
    return categoria_json(categoria)


@app.delete("/api/caderno/categorias/{id_categoria}", status_code=204)
def excluir_categoria(id_categoria: int, caderno: Caderno = Depends(obter_caderno)):
    if not caderno.categorias.excluir(id_categoria):
        raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    return Response(status_code=204)


@app.get("/api/caderno/ingredientes")
def listar_ingredientes(caderno: Caderno = Depends(obter_caderno)):
    return [ingrediente_json(i) for i in caderno.ingredientes.listar()]


@app.post("/api/caderno/ingredientes", status_code=201)
def criar_ingrediente(dados: IngredienteEntrada, caderno: Caderno = Depends(obter_caderno)):
    return ingrediente_json(caderno.ingredientes.criar(Ingrediente(dados.nome)))


@app.put("/api/caderno/ingredientes/{id_ingrediente}")
def atualizar_ingrediente(
    id_ingrediente: int, dados: IngredienteEntrada, caderno: Caderno = Depends(obter_caderno)
):
    if caderno.ingredientes.buscar(id_ingrediente) is None:
        raise HTTPException(status_code=404, detail="Ingrediente não encontrado.")
    ingrediente = Ingrediente(dados.nome, id_ingrediente)
    caderno.ingredientes.atualizar(ingrediente)
    return ingrediente_json(ingrediente)


@app.delete("/api/caderno/ingredientes/{id_ingrediente}", status_code=204)
def excluir_ingrediente(id_ingrediente: int, caderno: Caderno = Depends(obter_caderno)):
    if not caderno.ingredientes.excluir(id_ingrediente):
        raise HTTPException(status_code=404, detail="Ingrediente não encontrado.")
    return Response(status_code=204)


@app.post("/api/caderno/receitas/{id_receita}/avaliacoes", status_code=201)
def avaliar_receita(
    id_receita: int, dados: AvaliacaoEntrada, caderno: Caderno = Depends(obter_caderno)
):
    receita_ou_404(caderno, id_receita)
    avaliacao = Avaliacao(id_receita, dados.nota, dados.comentario.strip())
    return avaliacao_json(caderno.avaliacoes.criar(avaliacao))


@app.put("/api/caderno/avaliacoes/{id_avaliacao}")
def atualizar_avaliacao(
    id_avaliacao: int, dados: AvaliacaoEntrada, caderno: Caderno = Depends(obter_caderno)
):
    atual = caderno.avaliacoes.buscar(id_avaliacao)
    if atual is None:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
    avaliacao = Avaliacao(
        atual.receita_id, dados.nota, dados.comentario.strip(), atual.criada_em, id_avaliacao
    )
    caderno.avaliacoes.atualizar(avaliacao)
    return avaliacao_json(avaliacao)


@app.delete("/api/caderno/avaliacoes/{id_avaliacao}", status_code=204)
def excluir_avaliacao(id_avaliacao: int, caderno: Caderno = Depends(obter_caderno)):
    if not caderno.avaliacoes.excluir(id_avaliacao):
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
    return Response(status_code=204)
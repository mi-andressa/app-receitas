"""API em Python (FastAPI) do Buscador de Receitas."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from backend import mealdb
from backend.receita import nome_da_categoria, obter_ingredientes, preparar_passos
from backend.traducao import traduzir_lote, traduzir_texto

app = FastAPI(title="API do Buscador de Receitas")


def novo_cliente():
    return httpx.AsyncClient(timeout=10.0)


@app.exception_handler(httpx.HTTPError)
async def erro_de_rede(_request: Request, _erro: httpx.HTTPError):
    return JSONResponse(
        status_code=502,
        content={"detail": "Não foi possível consultar o TheMealDB agora."},
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
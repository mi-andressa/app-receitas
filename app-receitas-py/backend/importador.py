import sqlite3

from backend import mealdb
from backend.modelos import Ingrediente, ItemReceita, Receita
from backend.receita import converter_medida, nome_da_categoria, preparar_passos
from backend.traducao import traduzir_lote, traduzir_texto


class ErroImportacao(Exception):
    pass


class ImportadorMealDB:
    def __init__(self, receitas, categorias):
        self._receitas = receitas
        self._categorias = categorias

    async def pesquisar(self, cliente, termo):
        try:
            termo_en = await traduzir_texto(cliente, termo, "pt", "en")
        except Exception:
            termo_en = termo
        refeicoes = await mealdb.buscar_por_nome(cliente, termo_en.lower())
        titulos, _ = await traduzir_lote(cliente, [r["strMeal"] for r in refeicoes])
        for refeicao, titulo in zip(refeicoes, titulos):
            refeicao["tituloPt"] = titulo or refeicao["strMeal"]
        return refeicoes

    async def sortear(self, cliente):
        dados = await mealdb.receita_aleatoria(cliente)
        if not dados:
            raise ErroImportacao("O TheMealDB não retornou nenhuma receita.")
        return dados

    @staticmethod
    async def _traduzir(cliente, dados):
        nomes, medidas = [], []
        for i in range(1, 21):
            nome = (dados.get(f"strIngredient{i}") or "").strip()
            if nome:
                nomes.append(nome)
                medidas.append(converter_medida(dados.get(f"strMeasure{i}")))

        passos = preparar_passos(dados.get("strInstructions"))
        linhas, parcial = await traduzir_lote(
            cliente,
            [dados["strMeal"], dados.get("strArea") or "", *nomes, *medidas, *passos],
        )
        n = len(nomes)
        nomes_pt = [pt or en for pt, en in zip(linhas[2:2 + n], nomes)]
        return {
            "titulo": linhas[0] or dados["strMeal"],
            "origem": linhas[1],
            "itens": list(zip(nomes_pt, linhas[2 + n:2 + 2 * n])),
            "passos": linhas[2 + 2 * n:],
            "parcial": parcial,
        }

    async def importar(self, cliente, dados, favorita=False):
        existente = self._receitas.buscar_por_id_mealdb(dados["idMeal"])
        if existente:
            if favorita and not existente.favorita:
                existente.favorita = True
                self._receitas.atualizar(existente)
            return existente, False

        traduzida = await self._traduzir(cliente, dados)
        categoria = self._categorias.obter_ou_criar(
            nome_da_categoria(dados.get("strCategory")) or "Outros"
        )
        receita = Receita(
            titulo=traduzida["titulo"],
            modo_preparo="\n".join(traduzida["passos"]) or "Modo de preparo não informado.",
            categoria_id=categoria.id,
            origem=traduzida["origem"],
            imagem=dados.get("strMealThumb") or "",
            favorita=favorita,
            id_mealdb=dados["idMeal"],
            itens=[ItemReceita(Ingrediente(nome), medida) for nome, medida in traduzida["itens"]],
        )
        try:
            return self._receitas.criar(receita), traduzida["parcial"]
        except sqlite3.IntegrityError:
            existente = self._receitas.buscar_por_id_mealdb(dados["idMeal"])
            if existente is None:
                raise
            return existente, False
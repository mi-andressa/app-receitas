"""Comunicação com a API pública TheMealDB."""

MEALDB_URL = "https://www.themealdb.com/api/json/v1/1"


async def _pedir(cliente, caminho, parametros):
    resposta = await cliente.get(f"{MEALDB_URL}/{caminho}", params=parametros)
    resposta.raise_for_status()
    return resposta.json()


async def buscar_por_nome(cliente, termo):
    dados = await _pedir(cliente, "search.php", {"s": termo})
    return dados.get("meals") or []


async def listar_categorias(cliente):
    dados = await _pedir(cliente, "list.php", {"c": "list"})
    return [item["strCategory"] for item in dados.get("meals") or []]


async def buscar_por_categoria(cliente, categoria):
    dados = await _pedir(cliente, "filter.php", {"c": categoria})
    return dados.get("meals") or []


async def detalhes_receita(cliente, id_receita):
    dados = await _pedir(cliente, "lookup.php", {"i": id_receita})
    receitas = dados.get("meals") or []
    return receitas[0] if receitas else None


async def receita_aleatoria(cliente):
    dados = await _pedir(cliente, "random.php", {})
    receitas = dados.get("meals") or []
    return receitas[0] if receitas else None
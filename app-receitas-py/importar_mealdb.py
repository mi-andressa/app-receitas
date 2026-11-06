import argparse
import asyncio

import httpx

from backend import mealdb
from backend.banco import BancoDeDados
from backend.caderno import Caderno


async def importar_lote(caderno, por_categoria, filtro=None):
    novas = existentes = falhas = 0

    async with httpx.AsyncClient(timeout=15.0) as cliente:
        categorias = await mealdb.listar_categorias(cliente)
        if filtro:
            desejadas = {nome.lower() for nome in filtro}
            categorias = [c for c in categorias if c.lower() in desejadas]

        for categoria in categorias:
            resumos = (await mealdb.buscar_por_categoria(cliente, categoria))[:por_categoria]
            print(f"\n{categoria}: {len(resumos)} receita(s)")

            for resumo in resumos:
                if caderno.receitas.buscar_por_id_mealdb(resumo["idMeal"]):
                    existentes += 1
                    print(f"  = {resumo['strMeal']} (já estava no caderno)")
                    continue
                try:
                    bruto = await mealdb.detalhes_receita(cliente, resumo["idMeal"])
                    if bruto is None:
                        raise ValueError("não encontrada no TheMealDB")
                    receita, parcial = await caderno.importador.importar(cliente, bruto)
                    novas += 1
                    aviso = " (tradução parcial)" if parcial else ""
                    print(f"  ✔ {receita.titulo}{aviso}")
                except Exception as erro:
                    falhas += 1
                    print(f"  ✖ {resumo['strMeal']}: {erro}")
                await asyncio.sleep(0.3)

    return novas, existentes, falhas


def main():
    parser = argparse.ArgumentParser(description="Importa receitas do TheMealDB para o caderno.")
    parser.add_argument("--por-categoria", type=int, default=3,
                        help="quantas receitas importar de cada categoria (padrão: 3)")
    parser.add_argument("--categorias", nargs="*",
                        help="categorias em inglês, ex.: Dessert Chicken Pasta (padrão: todas)")
    args = parser.parse_args()

    print("Importando receitas do TheMealDB (com tradução)…")
    with BancoDeDados() as banco:
        caderno = Caderno(banco)
        try:
            novas, existentes, falhas = asyncio.run(
                importar_lote(caderno, args.por_categoria, args.categorias)
            )
        except httpx.HTTPError:
            print("⚠ Não foi possível acessar o TheMealDB. Verifique a internet.")
            return
        except KeyboardInterrupt:
            print("\nImportação interrompida. O que já foi importado ficou salvo.")
            return

    print(f"\n✔ {novas} nova(s) · {existentes} já existiam · {falhas} falha(s)")


if __name__ == "__main__":
    main()
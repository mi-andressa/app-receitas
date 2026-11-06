import asyncio
import json

import httpx

from backend.importador import ErroImportacao


class ImportadorTerminal:
    def __init__(self, importador):
        self._importador = importador
        self.traducao_parcial = False

    @staticmethod
    def _executar(metodo, *args):
        async def tarefa():
            async with httpx.AsyncClient(timeout=10.0) as cliente:
                return await metodo(cliente, *args)

        try:
            return asyncio.run(tarefa())
        except (httpx.HTTPError, json.JSONDecodeError) as erro:
            raise ErroImportacao("Não foi possível acessar o TheMealDB. Verifique a conexão.") from erro

    def pesquisar(self, termo):
        return self._executar(self._importador.pesquisar, termo)

    def sortear(self):
        return self._executar(self._importador.sortear)

    def importar(self, dados):
        receita, self.traducao_parcial = self._executar(self._importador.importar, dados)
        return receita
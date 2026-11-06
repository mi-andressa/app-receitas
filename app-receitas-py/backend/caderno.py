from backend.dados_iniciais import PopuladorDados
from backend.importador import ImportadorMealDB
from backend.repositorios import (
    AvaliacaoRepositorio,
    CategoriaRepositorio,
    IngredienteRepositorio,
    ReceitaRepositorio,
)


class Caderno:
    def __init__(self, banco):
        self.categorias = CategoriaRepositorio(banco)
        self.ingredientes = IngredienteRepositorio(banco)
        self.receitas = ReceitaRepositorio(banco, self.ingredientes)
        self.avaliacoes = AvaliacaoRepositorio(banco)
        self.importador = ImportadorMealDB(self.receitas, self.categorias)
        self.populador = PopuladorDados(self.categorias, self.receitas, self.avaliacoes)
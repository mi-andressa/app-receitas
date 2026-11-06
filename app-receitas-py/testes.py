import sqlite3
import unittest

from backend.banco import BancoDeDados
from backend.caderno import Caderno
from backend.modelos import Avaliacao, Categoria, Ingrediente, ItemReceita, Receita


class TestesCaderno(unittest.TestCase):
    def setUp(self):
        self.banco = BancoDeDados(":memory:")
        self.caderno = Caderno(self.banco)

    def tearDown(self):
        self.banco.fechar()

    def _receita(self):
        categoria = self.caderno.categorias.criar(Categoria("Sobremesa"))
        return self.caderno.receitas.criar(Receita(
            "Brigadeiro",
            "Misture tudo e leve ao fogo.",
            categoria.id,
            "Brasileira",
            itens=[
                ItemReceita(Ingrediente("Leite condensado"), "1 lata"),
                ItemReceita(Ingrediente("Chocolate em pó"), "2 colheres de sopa"),
            ],
        ))

    def test_criar_e_buscar_receita_com_ingredientes(self):
        receita = self.caderno.receitas.buscar(self._receita().id)
        self.assertEqual(receita.titulo, "Brigadeiro")
        self.assertEqual(len(receita.itens), 2)

    def test_atualizar_receita(self):
        receita = self._receita()
        receita.titulo = "Brigadeiro gourmet"
        self.caderno.receitas.atualizar(receita)
        self.assertEqual(self.caderno.receitas.buscar(receita.id).titulo, "Brigadeiro gourmet")

    def test_substituir_ingredientes(self):
        receita = self._receita()
        self.caderno.receitas.substituir_itens(receita.id, [ItemReceita(Ingrediente("Manteiga"), "1 colher")])
        self.assertEqual([i.ingrediente.nome for i in self.caderno.receitas.buscar(receita.id).itens], ["Manteiga"])

    def test_ingrediente_nao_duplica(self):
        self._receita()
        a = self.caderno.ingredientes.obter_ou_criar("leite condensado")
        b = self.caderno.ingredientes.obter_ou_criar("Leite condensado")
        self.assertEqual(a.id, b.id)
        self.assertEqual(len(self.caderno.ingredientes.listar()), 2)

    def test_excluir_receita_apaga_itens_e_avaliacoes(self):
        receita = self._receita()
        self.caderno.avaliacoes.criar(Avaliacao(receita.id, 5, "Perfeito"))
        self.caderno.receitas.excluir(receita.id)
        self.assertEqual(self.caderno.avaliacoes.listar(), [])
        self.assertEqual(self.banco.consultar("SELECT * FROM receita_ingredientes"), [])

    def test_ingrediente_em_uso_nao_pode_ser_excluido(self):
        self._receita()
        em_uso = self.caderno.ingredientes.obter_ou_criar("Leite condensado")
        with self.assertRaises(sqlite3.IntegrityError):
            self.caderno.ingredientes.excluir(em_uso.id)

    def test_excluir_categoria_deixa_receita_sem_categoria(self):
        receita = self._receita()
        self.caderno.categorias.excluir(receita.categoria_id)
        self.assertIsNone(self.caderno.receitas.buscar(receita.id).categoria_id)

    def test_media_das_avaliacoes(self):
        receita = self._receita()
        self.caderno.avaliacoes.criar(Avaliacao(receita.id, 4))
        self.caderno.avaliacoes.criar(Avaliacao(receita.id, 5))
        self.assertEqual(self.caderno.avaliacoes.media(receita.id), (4.5, 2))

    def test_dados_iniciais_carregam_uma_vez(self):
        self.assertEqual(self.caderno.populador.popular_se_vazio(), 8)
        self.assertEqual(self.caderno.populador.popular_se_vazio(), 0)

    def test_validacoes_das_entidades(self):
        with self.assertRaises(ValueError):
            Avaliacao(1, 9)
        with self.assertRaises(ValueError):
            Receita("   ", "preparo")


if __name__ == "__main__":
    unittest.main(verbosity=2)
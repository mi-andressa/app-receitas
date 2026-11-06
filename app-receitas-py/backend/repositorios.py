from abc import ABC, abstractmethod

from backend.modelos import Avaliacao, Categoria, Ingrediente, ItemReceita, Receita


class Repositorio(ABC):
    tabela = ""
    colunas = ()
    ordem = "id"

    def __init__(self, banco):
        self._banco = banco

    @abstractmethod
    def _para_objeto(self, linha):
        pass

    def _valores(self, objeto):
        return tuple(getattr(objeto, coluna) for coluna in self.colunas)

    def _varios(self, sql, parametros=()):
        return [self._para_objeto(linha) for linha in self._banco.consultar(sql, parametros)]

    def criar(self, objeto):
        campos = ", ".join(self.colunas)
        marcadores = ", ".join("?" * len(self.colunas))
        cursor = self._banco.executar(
            f"INSERT INTO {self.tabela} ({campos}) VALUES ({marcadores})",
            self._valores(objeto),
        )
        objeto.id = cursor.lastrowid
        return objeto

    def listar(self):
        return self._varios(f"SELECT * FROM {self.tabela} ORDER BY {self.ordem}")

    def buscar(self, id_):
        linha = self._banco.consultar_um(f"SELECT * FROM {self.tabela} WHERE id = ?", (id_,))
        return self._para_objeto(linha) if linha else None

    def atualizar(self, objeto):
        atribuicoes = ", ".join(f"{coluna} = ?" for coluna in self.colunas)
        self._banco.executar(
            f"UPDATE {self.tabela} SET {atribuicoes} WHERE id = ?",
            (*self._valores(objeto), objeto.id),
        )

    def excluir(self, id_):
        cursor = self._banco.executar(f"DELETE FROM {self.tabela} WHERE id = ?", (id_,))
        return cursor.rowcount > 0


class CategoriaRepositorio(Repositorio):
    tabela = "categorias"
    colunas = ("nome", "descricao")
    ordem = "nome"

    def _para_objeto(self, linha):
        return Categoria(linha["nome"], linha["descricao"] or "", linha["id"])

    def obter_ou_criar(self, nome):
        linha = self._banco.consultar_um("SELECT * FROM categorias WHERE nome = ?", (nome.strip(),))
        return self._para_objeto(linha) if linha else self.criar(Categoria(nome))


class IngredienteRepositorio(Repositorio):
    tabela = "ingredientes"
    colunas = ("nome",)
    ordem = "nome"

    def _para_objeto(self, linha):
        return Ingrediente(linha["nome"], linha["id"])

    def obter_ou_criar(self, nome):
        linha = self._banco.consultar_um("SELECT * FROM ingredientes WHERE nome = ?", (nome.strip(),))
        return self._para_objeto(linha) if linha else self.criar(Ingrediente(nome))


class ReceitaRepositorio(Repositorio):
    tabela = "receitas"
    colunas = ("titulo", "categoria_id", "origem", "modo_preparo", "imagem", "favorita", "id_mealdb")
    ordem = "titulo"

    def __init__(self, banco, ingredientes):
        super().__init__(banco)
        self._ingredientes = ingredientes

    def _para_objeto(self, linha):
        return Receita(
            titulo=linha["titulo"],
            modo_preparo=linha["modo_preparo"],
            categoria_id=linha["categoria_id"],
            origem=linha["origem"] or "",
            imagem=linha["imagem"] or "",
            favorita=bool(linha["favorita"]),
            id_mealdb=linha["id_mealdb"],
            id=linha["id"],
        )

    def criar(self, receita):
        try:
            with self._banco.transacao():
                super().criar(receita)
                for item in receita.itens:
                    self.adicionar_item(receita.id, item.ingrediente.nome, item.quantidade)
        except Exception:
            receita.id = None
            raise
        return receita

    def buscar(self, id_):
        receita = super().buscar(id_)
        if receita:
            receita.itens = self._itens_da_receita(id_)
        return receita

    def _itens_da_receita(self, receita_id):
        linhas = self._banco.consultar(
            """SELECT i.id, i.nome, ri.quantidade
                 FROM receita_ingredientes ri
                 JOIN ingredientes i ON i.id = ri.ingrediente_id
                WHERE ri.receita_id = ?
                ORDER BY i.nome""",
            (receita_id,),
        )
        return [
            ItemReceita(Ingrediente(linha["nome"], linha["id"]), linha["quantidade"] or "")
            for linha in linhas
        ]

    def adicionar_item(self, receita_id, nome_ingrediente, quantidade=""):
        ingrediente = self._ingredientes.obter_ou_criar(nome_ingrediente)
        self._banco.executar(
            """INSERT OR REPLACE INTO receita_ingredientes (receita_id, ingrediente_id, quantidade)
               VALUES (?, ?, ?)""",
            (receita_id, ingrediente.id, quantidade),
        )

    def substituir_itens(self, receita_id, itens):
        with self._banco.transacao():
            self._banco.executar(
                "DELETE FROM receita_ingredientes WHERE receita_id = ?", (receita_id,)
            )
            for item in itens:
                self.adicionar_item(receita_id, item.ingrediente.nome, item.quantidade)

    def atualizar_com_itens(self, receita):
        with self._banco.transacao():
            self.atualizar(receita)
            self.substituir_itens(receita.id, receita.itens)

    def remover_item(self, receita_id, ingrediente_id):
        cursor = self._banco.executar(
            "DELETE FROM receita_ingredientes WHERE receita_id = ? AND ingrediente_id = ?",
            (receita_id, ingrediente_id),
        )
        return cursor.rowcount > 0

    def pesquisar(self, termo):
        padrao = f"%{termo.strip()}%"
        return self._varios(
            """SELECT r.*
                 FROM receitas r
                 LEFT JOIN categorias c ON c.id = r.categoria_id
                WHERE r.titulo LIKE ? OR c.nome LIKE ? OR r.origem LIKE ?
                ORDER BY r.titulo""",
            (padrao, padrao, padrao),
        )

    def listar_favoritas(self):
        return self._varios("SELECT * FROM receitas WHERE favorita = 1 ORDER BY titulo")

    def buscar_por_id_mealdb(self, id_mealdb):
        linha = self._banco.consultar_um("SELECT id FROM receitas WHERE id_mealdb = ?", (id_mealdb,))
        return self.buscar(linha["id"]) if linha else None


class AvaliacaoRepositorio(Repositorio):
    tabela = "avaliacoes"
    colunas = ("receita_id", "nota", "comentario")
    ordem = "criada_em DESC"

    def _para_objeto(self, linha):
        return Avaliacao(
            linha["receita_id"],
            linha["nota"],
            linha["comentario"] or "",
            linha["criada_em"],
            linha["id"],
        )

    def listar_por_receita(self, receita_id):
        return self._varios(
            "SELECT * FROM avaliacoes WHERE receita_id = ? ORDER BY criada_em DESC, id DESC",
            (receita_id,),
        )

    def media(self, receita_id):
        linha = self._banco.consultar_um(
            "SELECT AVG(nota) AS media, COUNT(*) AS total FROM avaliacoes WHERE receita_id = ?",
            (receita_id,),
        )
        return linha["media"], linha["total"]
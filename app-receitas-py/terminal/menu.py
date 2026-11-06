import sqlite3
import textwrap

from backend.importador import ErroImportacao
from backend.modelos import Avaliacao, Categoria, Ingrediente, ItemReceita, Receita


class Menu:
    def __init__(self, categorias, ingredientes, receitas, avaliacoes, importador):
        self.categorias = categorias
        self.ingredientes = ingredientes
        self.receitas = receitas
        self.avaliacoes = avaliacoes
        self.importador = importador

    def executar(self):
        print("🍽️  Caderno de Receitas — POO + SQLite3")
        self._navegar("MENU PRINCIPAL", [
            ("Receitas", self._menu_receitas),
            ("Categorias", self._menu_categorias),
            ("Ingredientes", self._menu_ingredientes),
            ("Avaliações", self._menu_avaliacoes),
            ("Importar do TheMealDB", self._menu_importar),
        ], saida="Sair", pausar=False)
        print("Até a próxima! 👋")

    def _navegar(self, titulo, opcoes, saida="Voltar", pausar=True):
        atalho = None
        while True:
            if atalho is None:
                print(f"\n=== {titulo} ===")
                for numero, (rotulo, _) in enumerate(opcoes, start=1):
                    print(f"{numero}. {rotulo}")
                print(f"0. {saida}")
                escolha = self._ler_inteiro("Escolha", minimo=0, maximo=len(opcoes))
            else:
                escolha, atalho = atalho, None
            if escolha == 0:
                return
            try:
                opcoes[escolha - 1][1]()
            except ValueError as erro:
                print(f"⚠ {erro}")
            except sqlite3.IntegrityError:
                print("⚠ Operação recusada pelo banco: registro duplicado ou em uso por outra tabela.")
            except sqlite3.OperationalError:
                print("⚠ O banco está ocupado no momento. Tente novamente.")
            except sqlite3.Error:
                print("⚠ Erro inesperado no banco de dados. A operação foi cancelada.")
            except ErroImportacao as erro:
                print(f"⚠ {erro}")
            if pausar:
                resposta = input("\nEnter para ver o menu, ou digite a próxima opção: ").strip()
                if resposta.isdigit() and 0 <= int(resposta) <= len(opcoes):
                    atalho = int(resposta)

    @staticmethod
    def _ler_texto(rotulo, obrigatorio=True, padrao=""):
        exibicao = padrao if len(padrao) <= 40 else padrao[:37] + "..."
        sufixo = f" [{exibicao}]" if padrao else ""
        while True:
            valor = input(f"{rotulo}{sufixo}: ").strip()
            if valor:
                return valor
            if padrao:
                return padrao
            if not obrigatorio:
                return ""
            print("⚠ Campo obrigatório.")

    @staticmethod
    def _ler_inteiro(rotulo, minimo=None, maximo=None, padrao=None):
        sufixo = f" [{padrao}]" if padrao is not None else ""
        while True:
            bruto = input(f"{rotulo}{sufixo}: ").strip()
            if not bruto and padrao is not None:
                return padrao
            try:
                valor = int(bruto)
            except ValueError:
                print("⚠ Digite um número inteiro.")
                continue
            if (minimo is not None and valor < minimo) or (maximo is not None and valor > maximo):
                if minimo is not None and maximo is not None:
                    print(f"⚠ Digite um número de {minimo} a {maximo}.")
                else:
                    print(f"⚠ Digite um número a partir de {minimo}.")
                continue
            return valor

    @staticmethod
    def _confirmar(pergunta):
        return input(f"{pergunta} (s/n): ").strip().lower() == "s"

    @staticmethod
    def _listar(registros, vazio="Nenhum registro encontrado."):
        if not registros:
            print(vazio)
            return
        for registro in registros:
            print(f"  {registro}")

    def _selecionar(self, repositorio, rotulo="ID"):
        registro = repositorio.buscar(self._ler_inteiro(rotulo, minimo=1))
        if registro is None:
            print("⚠ Registro não encontrado.")
        return registro

    def _excluir(self, repositorio):
        registro = self._selecionar(repositorio)
        if registro and self._confirmar(f"Confirma a exclusão de {registro}?"):
            repositorio.excluir(registro.id)
            print("✔ Excluído.")

    def _menu_receitas(self):
        self._navegar("RECEITAS", [
            ("Listar todas", lambda: self._listar(self.receitas.listar())),
            ("Listar favoritas", lambda: self._listar(self.receitas.listar_favoritas())),
            ("Pesquisar (título, categoria ou origem)", self._pesquisar_receitas),
            ("Ver receita completa", self._detalhar_receita),
            ("Cadastrar receita", self._cadastrar_receita),
            ("Editar dados da receita", self._editar_receita),
            ("Adicionar/alterar ingrediente", self._adicionar_item),
            ("Remover ingrediente", self._remover_item),
            ("Favoritar/desfavoritar", self._alternar_favorita),
            ("Excluir receita", lambda: self._excluir(self.receitas)),
        ])

    def _escolher_categoria(self, atual=None):
        self._listar(self.categorias.listar(), "(Nenhuma categoria cadastrada.)")
        while True:
            id_ = self._ler_inteiro("ID da categoria (0 = sem categoria)", minimo=0, padrao=atual or 0)
            if id_ == 0:
                return None
            if self.categorias.buscar(id_):
                return id_
            print("⚠ Categoria não encontrada.")

    def _pesquisar_receitas(self):
        termo = self._ler_texto("Buscar por título, categoria ou origem")
        self._listar(self.receitas.pesquisar(termo), "Nenhuma receita encontrada.")

    def _detalhar_receita(self):
        receita = self._selecionar(self.receitas, "ID da receita")
        if not receita:
            return
        categoria = self.categorias.buscar(receita.categoria_id) if receita.categoria_id else None
        media, total = self.avaliacoes.media(receita.id)
        nota = f"{media:.1f} ★ ({total} avaliação(ões))" if total else "sem avaliações"
        print(f"\n{receita}")
        print(f"Categoria: {categoria.nome if categoria else '—'} | "
              f"Origem: {receita.origem or '—'} | Nota: {nota}")
        print("\nIngredientes:")
        self._listar(receita.itens, "  (nenhum)")
        print("\nModo de preparo:")
        for numero, passo in enumerate(receita.passos, start=1):
            print(textwrap.fill(passo, 80, initial_indent=f"  {numero}. ", subsequent_indent="     "))

    def _cadastrar_receita(self):
        titulo = self._ler_texto("Título")
        categoria_id = self._escolher_categoria()
        origem = self._ler_texto("Origem (ex.: Brasileira)", obrigatorio=False)
        preparo = self._ler_texto("Modo de preparo")
        itens = []
        print("Ingredientes — deixe o nome vazio para terminar.")
        while nome := self._ler_texto("  Ingrediente", obrigatorio=False):
            itens.append(ItemReceita(Ingrediente(nome), self._ler_texto("  Quantidade", obrigatorio=False)))
        receita = self.receitas.criar(Receita(titulo, preparo, categoria_id, origem, itens=itens))
        print(f"✔ Receita {receita} cadastrada com {len(itens)} ingrediente(s).")

    def _editar_receita(self):
        receita = self._selecionar(self.receitas, "ID da receita")
        if not receita:
            return
        print("(Enter mantém o valor atual)")
        receita.titulo = self._ler_texto("Título", padrao=receita.titulo)
        receita.categoria_id = self._escolher_categoria(receita.categoria_id)
        receita.origem = self._ler_texto("Origem", obrigatorio=False, padrao=receita.origem)
        receita.modo_preparo = self._ler_texto("Modo de preparo", padrao=receita.modo_preparo)
        self.receitas.atualizar(receita)
        print("✔ Receita atualizada.")

    def _adicionar_item(self):
        receita = self._selecionar(self.receitas, "ID da receita")
        if not receita:
            return
        nome = self._ler_texto("Ingrediente")
        quantidade = self._ler_texto("Quantidade", obrigatorio=False)
        self.receitas.adicionar_item(receita.id, nome, quantidade)
        print("✔ Ingrediente salvo na receita.")

    def _remover_item(self):
        receita = self._selecionar(self.receitas, "ID da receita")
        if not receita:
            return
        if not receita.itens:
            print("Esta receita não tem ingredientes.")
            return
        self._listar(receita.itens)
        ingrediente_id = self._ler_inteiro("ID do ingrediente", minimo=1)
        if self.receitas.remover_item(receita.id, ingrediente_id):
            print("✔ Ingrediente removido.")
        else:
            print("⚠ Esse ingrediente não está nesta receita.")

    def _alternar_favorita(self):
        receita = self._selecionar(self.receitas, "ID da receita")
        if receita:
            receita.alternar_favorita()
            self.receitas.atualizar(receita)
            print("♥ Favoritada!" if receita.favorita else "♡ Removida dos favoritos.")

    def _menu_categorias(self):
        self._navegar("CATEGORIAS", [
            ("Listar", lambda: self._listar(self.categorias.listar())),
            ("Cadastrar", self._cadastrar_categoria),
            ("Editar", self._editar_categoria),
            ("Excluir", lambda: self._excluir(self.categorias)),
        ])

    def _cadastrar_categoria(self):
        nome = self._ler_texto("Nome")
        descricao = self._ler_texto("Descrição", obrigatorio=False)
        print(f"✔ Categoria {self.categorias.criar(Categoria(nome, descricao))} cadastrada.")

    def _editar_categoria(self):
        categoria = self._selecionar(self.categorias)
        if not categoria:
            return
        print("(Enter mantém o valor atual)")
        categoria.nome = self._ler_texto("Nome", padrao=categoria.nome)
        categoria.descricao = self._ler_texto("Descrição", obrigatorio=False, padrao=categoria.descricao)
        self.categorias.atualizar(categoria)
        print("✔ Categoria atualizada.")

    def _menu_ingredientes(self):
        self._navegar("INGREDIENTES", [
            ("Listar", lambda: self._listar(self.ingredientes.listar())),
            ("Cadastrar", self._cadastrar_ingrediente),
            ("Renomear", self._editar_ingrediente),
            ("Excluir", lambda: self._excluir(self.ingredientes)),
        ])

    def _cadastrar_ingrediente(self):
        ingrediente = self.ingredientes.criar(Ingrediente(self._ler_texto("Nome")))
        print(f"✔ Ingrediente {ingrediente} cadastrado.")

    def _editar_ingrediente(self):
        ingrediente = self._selecionar(self.ingredientes)
        if ingrediente:
            ingrediente.nome = self._ler_texto("Novo nome", padrao=ingrediente.nome)
            self.ingredientes.atualizar(ingrediente)
            print("✔ Ingrediente atualizado.")

    def _menu_avaliacoes(self):
        self._navegar("AVALIAÇÕES", [
            ("Ver avaliações de uma receita", self._listar_avaliacoes),
            ("Avaliar receita", self._avaliar),
            ("Editar avaliação", self._editar_avaliacao),
            ("Excluir avaliação", lambda: self._excluir(self.avaliacoes)),
        ])

    def _listar_avaliacoes(self):
        receita = self._selecionar(self.receitas, "ID da receita")
        if receita:
            self._listar(self.avaliacoes.listar_por_receita(receita.id), "Ainda não há avaliações.")

    def _avaliar(self):
        receita = self._selecionar(self.receitas, "ID da receita")
        if not receita:
            return
        nota = self._ler_inteiro("Nota (1 a 5)", minimo=1, maximo=5)
        comentario = self._ler_texto("Comentário", obrigatorio=False)
        self.avaliacoes.criar(Avaliacao(receita.id, nota, comentario))
        print("✔ Avaliação registrada.")

    def _editar_avaliacao(self):
        avaliacao = self._selecionar(self.avaliacoes, "ID da avaliação")
        if not avaliacao:
            return
        avaliacao.nota = self._ler_inteiro("Nota (1 a 5)", minimo=1, maximo=5, padrao=avaliacao.nota)
        avaliacao.comentario = self._ler_texto("Comentário", obrigatorio=False, padrao=avaliacao.comentario)
        self.avaliacoes.atualizar(avaliacao)
        print("✔ Avaliação atualizada.")

    def _menu_importar(self):
        self._navegar("IMPORTAR DO THEMEALDB", [
            ("Pesquisar e importar", self._importar_pesquisa),
            ("Importar uma receita sorteada", self._importar_sorteada),
        ])

    def _importar_pesquisa(self):
        termo = self._ler_texto("O que você procura? (ex.: frango, bolo, sopa)")
        print("Buscando e traduzindo…")
        resultados = self.importador.pesquisar(termo)
        if not resultados:
            print("Nenhuma receita encontrada. Tente outro termo.")
            return
        for numero, dados in enumerate(resultados, start=1):
            print(f"{numero}. {dados['tituloPt']}  ({dados['strMeal']})")
        opcao_todas = len(resultados) + 1
        print(f"{opcao_todas}. Importar todas")
        print("0. Cancelar")
        escolha = self._ler_inteiro("Escolha", minimo=0, maximo=opcao_todas)
        if escolha == 0:
            return
        selecionadas = resultados if escolha == opcao_todas else [resultados[escolha - 1]]
        for dados in selecionadas:
            self._mostrar_importada(self.importador.importar(dados))

    def _importar_sorteada(self):
        print("Sorteando e traduzindo…")
        self._mostrar_importada(self.importador.importar(self.importador.sortear()))

    def _mostrar_importada(self, receita):
        print(f"✔ {receita}")
        if self.importador.traducao_parcial:
            print("  ⚠ Parte do texto não pôde ser traduzida agora e ficou em inglês.")
from backend.modelos import Avaliacao, Categoria, Ingrediente, ItemReceita, Receita

CATEGORIAS = [
    ("Sobremesas", "Doces, bolos e sobremesas geladas"),
    ("Lanches", "Salgados e quitutes para o café da tarde"),
    ("Pratos principais", "Refeições completas para almoço e jantar"),
    ("Sopas", "Caldos e sopas quentinhas"),
    ("Massas", "Macarrão e massas em geral"),
]

RECEITAS = [
    {
        "titulo": "Brigadeiro",
        "categoria": "Sobremesas",
        "origem": "Brasileira",
        "favorita": True,
        "itens": [
            ("Leite condensado", "1 lata (395 g)"),
            ("Chocolate em pó", "2 colheres de sopa"),
            ("Manteiga", "1 colher de sopa"),
            ("Chocolate granulado", "a gosto"),
        ],
        "passos": [
            "Em uma panela, misture o leite condensado, o chocolate em pó e a manteiga.",
            "Cozinhe em fogo baixo, mexendo sempre, até a massa desgrudar do fundo da panela.",
            "Transfira para um prato untado com manteiga e deixe esfriar.",
            "Com as mãos untadas, enrole bolinhas e passe no chocolate granulado.",
        ],
        "avaliacoes": [(5, "Clássico de festa, ficou perfeito!"), (4, "Bem docinho, como deve ser.")],
    },
    {
        "titulo": "Bolo de cenoura com cobertura de chocolate",
        "categoria": "Sobremesas",
        "origem": "Brasileira",
        "itens": [
            ("Cenoura", "3 médias, picadas"),
            ("Ovos", "3 unidades"),
            ("Óleo", "1 xícara"),
            ("Açúcar", "2 xícaras (massa) + 1 xícara (cobertura)"),
            ("Farinha de trigo", "2 xícaras"),
            ("Fermento em pó", "1 colher de sopa"),
            ("Chocolate em pó", "4 colheres de sopa"),
            ("Manteiga", "1 colher de sopa"),
            ("Leite", "3 colheres de sopa"),
        ],
        "passos": [
            "Preaqueça o forno a 180 °C e unte uma forma com manteiga e farinha.",
            "Bata no liquidificador a cenoura, os ovos e o óleo até ficar homogêneo.",
            "Em uma tigela, misture o açúcar e a farinha, junte o creme batido e, por último, o fermento.",
            "Asse por cerca de 40 minutos, até que um palito saia limpo.",
            "Para a cobertura, leve ao fogo a manteiga, o chocolate, o açúcar e o leite até engrossar e espalhe sobre o bolo.",
        ],
        "avaliacoes": [(5, "Igual ao da minha avó.")],
    },
    {
        "titulo": "Mousse de maracujá",
        "categoria": "Sobremesas",
        "origem": "Brasileira",
        "itens": [
            ("Leite condensado", "1 lata (395 g)"),
            ("Creme de leite", "1 caixinha (200 g)"),
            ("Suco de maracujá concentrado", "1 medida da lata de leite condensado"),
        ],
        "passos": [
            "Bata todos os ingredientes no liquidificador por 3 minutos.",
            "Despeje em taças ou em um refratário.",
            "Leve à geladeira por pelo menos 3 horas antes de servir.",
        ],
        "avaliacoes": [(4, "Rápida e muito gostosa."), (5, "")],
    },
    {
        "titulo": "Pão de queijo",
        "categoria": "Lanches",
        "origem": "Mineira",
        "favorita": True,
        "itens": [
            ("Polvilho azedo", "500 g"),
            ("Leite", "1 xícara"),
            ("Óleo", "1/2 xícara"),
            ("Ovos", "2 unidades"),
            ("Queijo meia cura ralado", "200 g"),
            ("Sal", "1 colher de chá"),
        ],
        "passos": [
            "Ferva o leite com o óleo e o sal.",
            "Escalde o polvilho com a mistura quente e mexa até formar uma massa.",
            "Espere amornar, junte os ovos um a um e depois o queijo, sovando bem.",
            "Faça bolinhas e asse a 200 °C por cerca de 25 minutos, até dourar.",
        ],
        "avaliacoes": [(5, "Sequinho por fora e macio por dentro."), (5, "Melhor do que de padaria.")],
    },
    {
        "titulo": "Strogonoff de frango",
        "categoria": "Pratos principais",
        "origem": "Brasileira",
        "itens": [
            ("Peito de frango", "500 g em cubos"),
            ("Cebola", "1 unidade picada"),
            ("Alho", "2 dentes picados"),
            ("Champignon", "100 g"),
            ("Ketchup", "2 colheres de sopa"),
            ("Mostarda", "1 colher de sopa"),
            ("Creme de leite", "1 caixinha (200 g)"),
            ("Sal", "a gosto"),
        ],
        "passos": [
            "Refogue a cebola e o alho em um fio de óleo.",
            "Junte o frango temperado com sal e doure bem.",
            "Acrescente o ketchup, a mostarda e o champignon e cozinhe por 5 minutos.",
            "Desligue o fogo, misture o creme de leite e sirva com arroz e batata palha.",
        ],
        "avaliacoes": [(4, "Ótimo para o dia a dia.")],
    },
    {
        "titulo": "Escondidinho de carne seca",
        "categoria": "Pratos principais",
        "origem": "Nordestina",
        "itens": [
            ("Carne seca", "500 g dessalgada e desfiada"),
            ("Mandioca", "1 kg"),
            ("Manteiga", "2 colheres de sopa"),
            ("Leite", "1/2 xícara"),
            ("Cebola", "1 unidade picada"),
            ("Alho", "2 dentes picados"),
            ("Queijo muçarela", "150 g ralado"),
        ],
        "passos": [
            "Cozinhe a mandioca até ficar bem macia e amasse com a manteiga e o leite.",
            "Refogue a cebola e o alho e junte a carne seca desfiada.",
            "Em um refratário, faça uma camada de purê, a carne e cubra com o restante do purê.",
            "Espalhe a muçarela e leve ao forno a 200 °C por 20 minutos, até gratinar.",
        ],
        "avaliacoes": [(5, "Comida de domingo!")],
    },
    {
        "titulo": "Caldo verde",
        "categoria": "Sopas",
        "origem": "Portuguesa",
        "itens": [
            ("Batata", "1 kg em pedaços"),
            ("Couve", "1 maço em tiras bem finas"),
            ("Linguiça calabresa", "1 unidade (cerca de 250 g) em rodelas"),
            ("Cebola", "1 unidade picada"),
            ("Alho", "2 dentes picados"),
            ("Azeite", "3 colheres de sopa"),
            ("Água", "2 litros"),
            ("Sal", "a gosto"),
        ],
        "passos": [
            "Doure a calabresa no azeite e reserve.",
            "Na mesma panela, refogue a cebola e o alho, junte a batata e a água e cozinhe até desmanchar.",
            "Bata no liquidificador e volte para a panela, acertando o sal.",
            "Acrescente a couve e a calabresa e cozinhe por mais 3 minutos.",
        ],
        "avaliacoes": [(5, "Perfeito para dias frios."), (4, "")],
    },
    {
        "titulo": "Macarrão alho e óleo",
        "categoria": "Massas",
        "origem": "Italiana",
        "itens": [
            ("Espaguete", "500 g"),
            ("Alho", "6 dentes fatiados"),
            ("Azeite", "1/2 xícara"),
            ("Pimenta calabresa", "a gosto"),
            ("Salsinha", "a gosto"),
            ("Sal", "a gosto"),
        ],
        "passos": [
            "Cozinhe o espaguete em água fervente com sal até ficar al dente.",
            "Em uma frigideira, aqueça o azeite em fogo baixo e doure levemente o alho.",
            "Junte a pimenta calabresa e o macarrão escorrido, misturando bem.",
            "Finalize com salsinha picada e sirva em seguida.",
        ],
        "avaliacoes": [(4, "Simples e rápido.")],
    },
]


class PopuladorDados:
    def __init__(self, categorias, receitas, avaliacoes):
        self._categorias = categorias
        self._receitas = receitas
        self._avaliacoes = avaliacoes

    def banco_vazio(self):
        return not self._categorias.listar() and not self._receitas.listar()

    def popular(self):
        ids = {}
        for nome, descricao in CATEGORIAS:
            ids[nome] = self._categorias.criar(Categoria(nome, descricao)).id

        for dados in RECEITAS:
            receita = self._receitas.criar(Receita(
                titulo=dados["titulo"],
                modo_preparo="\n".join(dados["passos"]),
                categoria_id=ids[dados["categoria"]],
                origem=dados["origem"],
                favorita=dados.get("favorita", False),
                itens=[ItemReceita(Ingrediente(nome), qtd) for nome, qtd in dados["itens"]],
            ))
            for nota, comentario in dados.get("avaliacoes", []):
                self._avaliacoes.criar(Avaliacao(receita.id, nota, comentario))

        return len(RECEITAS)

    def popular_se_vazio(self):
        return self.popular() if self.banco_vazio() else 0
from __future__ import annotations

from dataclasses import dataclass, field


def _obrigatorio(valor, campo):
    valor = (valor or "").strip()
    if not valor:
        raise ValueError(f"O campo '{campo}' é obrigatório.")
    return valor


@dataclass
class Categoria:
    nome: str
    descricao: str = ""
    id: int | None = None

    def __post_init__(self):
        self.nome = _obrigatorio(self.nome, "nome")

    def __str__(self):
        extra = f" — {self.descricao}" if self.descricao else ""
        return f"[{self.id}] {self.nome}{extra}"


@dataclass
class Ingrediente:
    nome: str
    id: int | None = None

    def __post_init__(self):
        self.nome = _obrigatorio(self.nome, "nome")

    def __str__(self):
        return f"[{self.id}] {self.nome}"


@dataclass
class ItemReceita:
    ingrediente: Ingrediente
    quantidade: str = ""

    def __str__(self):
        qtd = f" — {self.quantidade}" if self.quantidade else ""
        return f"[{self.ingrediente.id}] {self.ingrediente.nome}{qtd}"


@dataclass
class Receita:
    titulo: str
    modo_preparo: str
    categoria_id: int | None = None
    origem: str = ""
    imagem: str = ""
    favorita: bool = False
    id_mealdb: str | None = None
    id: int | None = None
    itens: list[ItemReceita] = field(default_factory=list)

    def __post_init__(self):
        self.titulo = _obrigatorio(self.titulo, "título")
        self.modo_preparo = _obrigatorio(self.modo_preparo, "modo de preparo")

    @property
    def passos(self):
        return [passo.strip() for passo in self.modo_preparo.splitlines() if passo.strip()]

    def alternar_favorita(self):
        self.favorita = not self.favorita

    def __str__(self):
        return f"[{self.id}] {'♥ ' if self.favorita else ''}{self.titulo}"


@dataclass
class Avaliacao:
    receita_id: int
    nota: int
    comentario: str = ""
    criada_em: str | None = None
    id: int | None = None

    def __post_init__(self):
        if not 1 <= self.nota <= 5:
            raise ValueError("A nota deve estar entre 1 e 5.")

    def __str__(self):
        estrelas = "★" * self.nota + "☆" * (5 - self.nota)
        return f"[{self.id}] {estrelas} {self.comentario}".rstrip()
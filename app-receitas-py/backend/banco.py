import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

ESQUEMA = """
CREATE TABLE IF NOT EXISTS categorias (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nome      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    descricao TEXT
);

CREATE TABLE IF NOT EXISTS receitas (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo       TEXT NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    origem       TEXT,
    modo_preparo TEXT NOT NULL,
    imagem       TEXT,
    favorita     INTEGER NOT NULL DEFAULT 0 CHECK (favorita IN (0, 1)),
    id_mealdb    TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS ingredientes (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS receita_ingredientes (
    receita_id     INTEGER NOT NULL REFERENCES receitas(id) ON DELETE CASCADE,
    ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id) ON DELETE RESTRICT,
    quantidade     TEXT,
    PRIMARY KEY (receita_id, ingrediente_id)
);

CREATE TABLE IF NOT EXISTS avaliacoes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    receita_id INTEGER NOT NULL REFERENCES receitas(id) ON DELETE CASCADE,
    nota       INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    criada_em  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
"""


def caminho_padrao():
    if os.environ.get("RECEITAS_DB"):
        return os.environ["RECEITAS_DB"]
    if os.environ.get("VERCEL"):
        return "/tmp/receitas.db"
    return str(Path(__file__).resolve().parent.parent / "receitas.db")


class BancoDeDados:
    def __init__(self, caminho=None):
        self._conexao = sqlite3.connect(caminho or caminho_padrao(), check_same_thread=False)
        self._conexao.row_factory = sqlite3.Row
        self._conexao.execute("PRAGMA foreign_keys = ON")
        self._conexao.executescript(ESQUEMA)
        self._em_transacao = False

    def executar(self, sql, parametros=()):
        if self._em_transacao:
            return self._conexao.execute(sql, parametros)
        with self._conexao:
            return self._conexao.execute(sql, parametros)

    @contextmanager
    def transacao(self):
        if self._em_transacao:
            yield
            return
        self._em_transacao = True
        try:
            with self._conexao:
                yield
        finally:
            self._em_transacao = False

    def consultar(self, sql, parametros=()):
        return self._conexao.execute(sql, parametros).fetchall()

    def consultar_um(self, sql, parametros=()):
        return self._conexao.execute(sql, parametros).fetchone()

    def fechar(self):
        self._conexao.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.fechar()
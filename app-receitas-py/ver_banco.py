import sqlite3

from backend.banco import caminho_padrao

conexao = sqlite3.connect(caminho_padrao())
print(f"Banco: {caminho_padrao()}\n")

tabelas = [
    linha[0]
    for linha in conexao.execute(
        "SELECT name FROM sqlite_master "
        "WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
]
for tabela in tabelas:
    total = conexao.execute(f"SELECT COUNT(*) FROM {tabela}").fetchone()[0]
    print(f"{tabela:22} {total} registro(s)")

print("\nReceitas e suas categorias:")
for titulo, categoria in conexao.execute(
    """SELECT r.titulo, COALESCE(c.nome, '—')
         FROM receitas r
         LEFT JOIN categorias c ON c.id = r.categoria_id
        ORDER BY r.titulo"""
):
    print(f"  • {titulo} ({categoria})")

conexao.close()
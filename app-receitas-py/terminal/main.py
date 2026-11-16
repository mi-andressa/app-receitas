import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from adaptador import ImportadorTerminal
from backend.banco import BancoDeDados
from backend.caderno import Caderno
from menu import Menu


def main():
    try:
        with BancoDeDados() as banco:
            caderno = Caderno(banco)

            quantidade = caderno.populador.popular_se_vazio()
            if quantidade:
                print(f"✔ Banco alimentado com {quantidade} receitas de exemplo.")

            Menu(
                caderno.categorias,
                caderno.ingredientes,
                caderno.receitas,
                caderno.avaliacoes,
                ImportadorTerminal(caderno.importador),
            ).executar()
    except (KeyboardInterrupt, EOFError):
        print("\n\nPrograma encerrado pelo usuário. Até a próxima! 👋")
    except sqlite3.Error as erro:
        print(f"⚠ Não foi possível usar o banco de dados: {erro}")


if __name__ == "__main__":
    main()
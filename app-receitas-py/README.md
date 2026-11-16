# 🍽️ Caderno de Receitas — POO + SQLite3

Aplicação em Python para gerenciar um caderno de receitas, construída com
Programação Orientada a Objetos e banco de dados SQLite3. Tem duas interfaces
que compartilham o mesmo núcleo (`backend/`):

- **Terminal** — menu interativo com CRUD completo (versão avaliada na disciplina);
- **Web** — API FastAPI + front-end React (evolução do projeto de Desenvolvimento Web Front-End).

Também importa receitas do [TheMealDB](https://www.themealdb.com), com tradução
automática para o português e conversão de medidas para o padrão brasileiro.

## Banco de dados (5 tabelas relacionais)

| Tabela | Descrição | Relacionamentos |
|---|---|---|
| `categorias` | Categorias das receitas | 1:N com `receitas` |
| `receitas` | Receitas do caderno | FK `categoria_id` → `categorias` (ON DELETE SET NULL) |
| `ingredientes` | Ingredientes únicos (sem duplicatas, ignora maiúsculas) | N:N com `receitas` |
| `receita_ingredientes` | Associação receita ↔ ingrediente + quantidade | PK composta; CASCADE na receita, RESTRICT no ingrediente |
| `avaliacoes` | Notas de 1 a 5 com comentário | FK `receita_id` → `receitas` (ON DELETE CASCADE) |

O arquivo `receitas.db` é criado automaticamente na raiz do projeto na primeira
execução e alimentado com 8 receitas de exemplo. Para usar outro arquivo, defina
a variável de ambiente `RECEITAS_DB`.

## Estrutura do projeto

```
backend/                 núcleo da aplicação (POO)
  banco.py               conexão SQLite, esquema das tabelas e transações
  modelos.py             entidades: Categoria, Ingrediente, ItemReceita, Receita, Avaliacao
  repositorios.py        CRUD: classe abstrata Repositorio + um repositório por tabela
  caderno.py             fachada que monta e reúne os repositórios
  dados_iniciais.py      receitas de exemplo carregadas na primeira execução
  importador.py          importação de receitas do TheMealDB
  mealdb.py              comunicação com a API do TheMealDB
  traducao.py            tradução automática (Google Translate / MyMemory)
  receita.py             adaptação de medidas, temperaturas e passos
terminal/                interface de terminal
  main.py                ponto de entrada
  menu.py                menus, leitura segura de dados e tratamento de exceções
  adaptador.py           adapta o importador assíncrono para o terminal
api/index.py             API FastAPI usada pelo front-end
src/                     front-end React
testes.py                testes automatizados (unittest)
importar_mealdb.py       importação em lote pela linha de comando
ver_banco.py             resumo do conteúdo do banco
```

## Requisitos

- Python 3.10 ou superior
- Node.js 20.19+ ou 22.12+ (apenas para a versão web)
- Internet (apenas para importar receitas do TheMealDB; o CRUD funciona offline)

## Bibliotecas utilizadas

| Biblioteca | Uso |
|---|---|
| `sqlite3`, `abc`, `dataclasses`, `contextlib`, `asyncio`, `argparse`, `textwrap`, `unittest` | Biblioteca padrão do Python (não precisam ser instaladas) |
| `httpx` | Requisições ao TheMealDB e aos serviços de tradução |
| `fastapi` | API da versão web |
| `uvicorn` | Servidor que executa a API |
| React 19, Vite 7, oxlint | Front-end (instalados com `npm install`) |

## Instalação

```bash
git clone <url-do-repositorio>
cd <pasta-do-projeto>
python3 -m venv .venv
```

Ative o ambiente virtual:

```bash
# Linux / macOS
source .venv/bin/activate
# Windows (PowerShell)
.venv\Scripts\Activate.ps1
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

## Como usar — versão de terminal

Na raiz do projeto:

```bash
python terminal/main.py
```

Digite o número da opção desejada. `0` volta ao menu anterior (ou sai, no menu
principal) e `Ctrl+C` encerra o programa com segurança a qualquer momento.

| Menu | Operações |
|---|---|
| Receitas | listar, listar favoritas, pesquisar, ver completa, cadastrar, editar, adicionar/alterar ingrediente, remover ingrediente, favoritar, excluir |
| Categorias | listar, cadastrar, editar, excluir |
| Ingredientes | listar, cadastrar, renomear, excluir (bloqueado se estiver em uso) |
| Avaliações | ver por receita, avaliar, editar, excluir |
| Importar do TheMealDB | pesquisar e importar, importar uma receita sorteada |

Entradas inválidas (letras em campos numéricos, IDs inexistentes, campos
obrigatórios vazios, notas fora de 1 a 5) são tratadas com mensagens, sem
encerrar o programa.

## Outros comandos

```bash
python testes.py                 # roda os testes automatizados
python ver_banco.py              # mostra as tabelas e a quantidade de registros
python importar_mealdb.py --por-categoria 2 --categorias Dessert Chicken
```

## Versão web (opcional)

```bash
npm install
./dev.sh          # Linux / macOS: sobe a API (porta 8000) e o front-end
```

No Windows, use dois terminais (com o ambiente virtual ativo no primeiro):

```bash
uvicorn api.index:app --reload --port 8000
npm run dev
```

Depois, abra o endereço exibido pelo Vite (normalmente http://localhost:5173).
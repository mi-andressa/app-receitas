# 🍽️ Buscador Inteligente de Receitas

Projeto da **Atividade Avaliativa 04** de Desenvolvimento Web Front End (ADS – IFSP).

**Autora:** Mirela Andressa de Oliveira
**Aplicação publicada:** https://app-receitas-dusky.vercel.app
**Repositório:** https://github.com/mi-andressa/app-receitas

## 📌 Sobre o projeto

Aplicação que reúne receitas do mundo todo **em português**. Você pode buscar digitando em português, filtrar por categoria, sortear uma receita surpresa e salvar favoritas. Ao abrir uma receita, o título, os ingredientes e o modo de preparo aparecem traduzidos e com medidas adaptadas ao padrão brasileiro.

A interface é feita em **React**, e toda a lógica de busca, tradução e conversão roda em uma **API própria em Python (FastAPI)**.

## 🏗️ Arquitetura

```
Navegador (React)  →  /api/... (Python · FastAPI)  →  TheMealDB + Google Translate / MyMemory
```

| Camada | Pasta | Responsabilidade |
| --- | --- | --- |
| Interface | `src/` | Telas, componentes e favoritos (React) |
| Rotas da API | `api/index.py` | Endpoints FastAPI |
| Receitas | `backend/mealdb.py` | Comunicação com o TheMealDB |
| Tradução | `backend/traducao.py` | Google Translate + MyMemory, com cache e lote |
| Regras | `backend/receita.py` | Categorias, medidas, temperaturas e passos |

### Endpoints

| Rota | Descrição |
| --- | --- |
| `GET /api/categorias` | Lista as categorias traduzidas |
| `GET /api/buscar?termo=frango` | Busca por nome (termo em português) |
| `GET /api/categoria?nome=Beef` | Receitas de uma categoria |
| `GET /api/receita/{id}` | Receita completa, traduzida e convertida |
| `GET /api/aleatoria` | Receita sorteada |

Com a API rodando localmente, a documentação interativa fica em `http://127.0.0.1:8000/docs`.

## ✨ Funcionalidades

- 🔎 **Busca em português**: "frango" vira "chicken" antes de consultar a API.
- 🏷️ **Filtro por categoria** (carne, massas, sobremesas, vegano…).
- 🎲 **Surpreenda-me**: sorteia uma receita aleatória.
- ♥ **Favoritos** salvos no navegador (`localStorage`).
- 🌐 **Tradução completa**: título, ingredientes, passos, categoria e origem.
- 📏 **Adaptação ao Brasil**: `tbsp` → colher de sopa, `oz`/`lb` → gramas, °F → °C.
- ✅ **Lista de ingredientes interativa** com barra de progresso.
- 🔢 **Modo de preparo em passos numerados**.
- ♿ Acessível: navegação por teclado, `<dialog>` nativo, leitores de tela, movimento reduzido.
- 🌙 Modo escuro automático e layout responsivo.

## 🧰 Tecnologias

**Backend:** Python 3, FastAPI, httpx (requisições assíncronas), expressões regulares (`re`).
**Frontend:** React 19, Vite, oxlint, Fetch API, `AbortController`, `localStorage`.
**Deploy:** Vercel (frontend estático + função Python serverless).

## 📦 Como executar localmente

Requisitos: **Node.js 20.19+** e **Python 3.9+**.

```bash
git clone https://github.com/mi-andressa/app-receitas.git
cd app-receitas/app-receitas
npm install
```

**Terminal 1 — API em Python:**

```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt uvicorn
uvicorn api.index:app --reload --port 8000
```

**Terminal 2 — Interface React:**

```bash
npm run dev
```

Acesse `http://localhost:5173`. O Vite repassa as chamadas `/api` para o Python automaticamente.

Outros comandos:

```bash
npm run build   # gera a versão de produção em /dist
npm run lint    # roda o oxlint
```

## 🚀 Deploy

Publicado na Vercel a partir deste repositório (Root Directory: `app-receitas`). O Vercel compila o React com o Vite e publica `api/index.py` como função Python. O `vercel.json` direciona as rotas `/api/*` para o FastAPI.

> A tradução é automática e pode conter imprecisões. Se os dois serviços de tradução falharem, o texto aparece em inglês com um aviso.
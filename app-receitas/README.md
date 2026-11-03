# 🍽️ Buscador Inteligente de Receitas

Projeto da **Atividade Avaliativa 04** de Desenvolvimento Web Front End (ADS – IFSP).

**Autora:** Mirela Andressa de Oliveira
**Aplicação publicada:** <COLE AQUI O LINK DA VERCEL>
**Repositório:** <COLE AQUI O LINK DO GITHUB>

## 📌 Sobre o projeto

Aplicação que reúne receitas do mundo todo **em português**. Você pode buscar digitando em português (o termo é traduzido para a API), filtrar por categoria, sortear uma receita surpresa e salvar favoritas. Ao abrir uma receita, o título, os ingredientes e o modo de preparo são traduzidos automaticamente.

## ✨ Funcionalidades

- 🔎 **Busca em português**: "frango" vira "chicken" antes de consultar a API.
- 🏷️ **Filtro por categoria** (carne, massas, sobremesas, vegano…).
- 🎲 **Surpreenda-me**: sorteia uma receita aleatória.
- ♥ **Favoritos** salvos no navegador (`localStorage`).
- 🌐 **Tradução completa**: título, ingredientes, passos, categoria e origem.
- 📏 **Adaptação ao Brasil**: `tbsp` → colher de sopa, `oz`/`lb` → gramas, °F → °C.
- ✅ **Lista de ingredientes interativa** (marque o que já separou).
- 🔢 **Modo de preparo em passos numerados**.
- ♿ Acessível: navegação por teclado, modal nativo `<dialog>`, contraste AA, leitores de tela.
- 📱 Layout responsivo.

## 🌐 APIs consumidas (gratuitas, sem cadastro)

| API | Uso |
| --- | --- |
| [TheMealDB](https://www.themealdb.com/api.php) | Busca, categorias, detalhes e receita aleatória |
| [Google Translate (endpoint público)](https://translate.google.com) | Tradução principal EN ⇄ PT |
| [MyMemory Translation](https://mymemory.translated.net/doc/spec.php) | Tradução de reserva (se a principal falhar) |

> A tradução é automática e pode conter imprecisões. Se ambos os serviços falharem, o app mostra o texto original em inglês com um aviso.

## 🧰 Tecnologias e bibliotecas

- **React 19** e **React DOM**: interface com Hooks (`useState`, `useEffect`, `useRef`, `useMemo`) e um hook próprio (`useFavoritos`)
- **Vite** + **@vitejs/plugin-react**: servidor de desenvolvimento e build
- **oxlint**: análise estática do código
- **Fetch API**, `AbortController`, `localStorage` e elemento `<dialog>` nativos (sem bibliotecas extras)
- Fontes: Fraunces e DM Sans (Google Fonts)

## 🗂️ Estrutura

```
src/
├── components/   BuscadorReceitas, CartaoReceita, ModalReceita (+ CSS)
├── hooks/        useFavoritos
├── services/     api.js (TheMealDB) e traducao.js
├── utils/        receita.js (medidas, temperaturas, passos)
├── App.jsx
├── index.css     (variáveis e base)
└── main.jsx
```

## 📦 Como executar localmente

Requisito: **Node.js 20.19+ ou 22.12+**.

```bash
git clone <URL-DO-REPOSITORIO>
cd app-receitas
npm install
npm run dev
```

Acesse o endereço exibido no terminal (normalmente `http://localhost:5173`).

Outros comandos:

```bash
npm run build   # gera a versão de produção em /dist
npm run lint    # roda o oxlint
```

> A pasta `node_modules` não é versionada (está no `.gitignore`); o `npm install` a recria.

## 🚀 Deploy

Publicado na [Vercel](https://vercel.com) a partir deste repositório (framework detectado: Vite; comando de build `npm run build`; pasta de saída `dist`).

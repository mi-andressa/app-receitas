const MENSAGENS_POR_STATUS = {
  404: 'Não encontrado. Ele pode ter sido excluído.',
  409: 'Operação recusada: registro duplicado ou em uso.',
  422: 'Verifique os campos preenchidos.',
};

async function pedir(caminho, { signal, metodo = 'GET', corpo } = {}) {
  let resposta;
  try {
    resposta = await fetch(`/api/${caminho}`, {
      method: metodo,
      signal,
      headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch (erro) {
    if (erro.name === 'AbortError') throw erro;
    throw new Error('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
  }

  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => null);
    const padrao =
      MENSAGENS_POR_STATUS[resposta.status] ??
      (resposta.status >= 500
        ? 'O servidor está indisponível no momento. Tente novamente.'
        : 'Não foi possível concluir a operação.');
    const detalhe =
      resposta.status !== 422 && typeof dados?.detail === 'string' ? dados.detail : padrao;
    throw new Error(detalhe);
  }

  return resposta.status === 204 ? null : resposta.json();
}

export const listarCategorias = (signal) => pedir('categorias', { signal });

export const buscarPorNome = (termo, signal) =>
  pedir(`buscar?${new URLSearchParams({ termo })}`, { signal });

export const buscarPorCategoria = (categoria, signal) =>
  pedir(`categoria?${new URLSearchParams({ nome: categoria })}`, { signal });

export const detalhesReceita = (id, signal) =>
  pedir(`receita/${encodeURIComponent(id)}`, { signal });

export const receitaAleatoria = (signal) => pedir('aleatoria', { signal });

export const listarCaderno = (signal) => pedir('caderno/receitas', { signal });

export const detalhesCaderno = (id, signal) => pedir(`caderno/receitas/${id}`, { signal });

export const criarReceita = (dados) =>
  pedir('caderno/receitas', { metodo: 'POST', corpo: dados });

export const atualizarReceita = (id, dados) =>
  pedir(`caderno/receitas/${id}`, { metodo: 'PUT', corpo: dados });

export const excluirReceita = (id) => pedir(`caderno/receitas/${id}`, { metodo: 'DELETE' });

export const alternarFavoritaCaderno = (id) =>
  pedir(`caderno/receitas/${id}/favorita`, { metodo: 'PATCH' });

export const importarReceita = (idMealdb, favorita = false) =>
  pedir('caderno/importar', { metodo: 'POST', corpo: { id_mealdb: idMealdb, favorita } });

export const listarCategoriasCaderno = (signal) => pedir('caderno/categorias', { signal });

export const listarIngredientes = (signal) => pedir('caderno/ingredientes', { signal });

export const avaliarReceita = (id, dados) =>
  pedir(`caderno/receitas/${id}/avaliacoes`, { metodo: 'POST', corpo: dados });

export const excluirAvaliacao = (id) => pedir(`caderno/avaliacoes/${id}`, { metodo: 'DELETE' });
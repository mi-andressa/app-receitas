async function pedir(caminho, signal) {
  const resposta = await fetch(`/api/${caminho}`, { signal });
  if (!resposta.ok) throw new Error(`API: HTTP ${resposta.status}`);
  return resposta.json();
}

export const listarCategorias = (signal) => pedir('categorias', signal);

export const buscarPorNome = (termo, signal) =>
  pedir(`buscar?${new URLSearchParams({ termo })}`, signal);

export const buscarPorCategoria = (categoria, signal) =>
  pedir(`categoria?${new URLSearchParams({ nome: categoria })}`, signal);

export const detalhesReceita = (id, signal) =>
  pedir(`receita/${encodeURIComponent(id)}`, signal);

export const receitaAleatoria = (signal) => pedir('aleatoria', signal);
const MEALDB_URL = 'https://www.themealdb.com/api/json/v1/1';

async function pedir(caminho, parametros, signal) {
  const consulta = new URLSearchParams(parametros);
  const resposta = await fetch(`${MEALDB_URL}/${caminho}?${consulta}`, { signal });

  if (!resposta.ok) throw new Error(`TheMealDB: HTTP ${resposta.status}`);
  return resposta.json();
}

export async function buscarPorNome(termo, signal) {
  const dados = await pedir('search.php', { s: termo }, signal);
  return dados.meals ?? [];
}

export async function listarCategorias(signal) {
  const dados = await pedir('list.php', { c: 'list' }, signal);
  return (dados.meals ?? []).map((item) => item.strCategory);
}

export async function buscarPorCategoria(categoria, signal) {
  const dados = await pedir('filter.php', { c: categoria }, signal);
  return dados.meals ?? [];
}

export async function detalhesReceita(id, signal) {
  const dados = await pedir('lookup.php', { i: id }, signal);
  const receita = dados.meals?.[0];
  if (!receita) throw new Error('Receita não encontrada');
  return receita;
}

export async function receitaAleatoria(signal) {
  const dados = await pedir('random.php', {}, signal);
  const receita = dados.meals?.[0];
  if (!receita) throw new Error('Nenhuma receita sorteada');
  return receita;
}
const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single';
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

const LIMITE_GOOGLE = 1500;
const LIMITE_MYMEMORY = 450;

const cache = new Map();

const chaveDe = (texto, de, para) => `${de}|${para}|${texto}`;
const foiCancelado = (erro) => erro?.name === 'AbortError';

function dividirEmBlocos(texto, limite) {
  const sentencas = texto.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) ?? [texto];
  const blocos = [];
  let atual = '';

  for (const sentenca of sentencas) {
    if (atual && (atual + sentenca).length > limite) {
      blocos.push(atual);
      atual = '';
    }
    atual += sentenca;
  }

  if (atual) blocos.push(atual);
  return blocos;
}

async function viaGoogle(texto, de, para, signal) {
  const parametros = new URLSearchParams({ client: 'gtx', sl: de, tl: para, dt: 't', q: texto });
  const resposta = await fetch(`${GOOGLE_URL}?${parametros}`, { signal });

  if (!resposta.ok) throw new Error(`Google Translate: HTTP ${resposta.status}`);

  const dados = await resposta.json();
  return dados[0].map((trecho) => trecho[0]).join('');
}

async function viaMyMemory(texto, de, para, signal) {
  const blocos = dividirEmBlocos(texto, LIMITE_MYMEMORY);

  const traduzidos = await Promise.all(
    blocos.map(async (bloco) => {
      const parametros = new URLSearchParams({ q: bloco.trim(), langpair: `${de}|${para}` });
      const resposta = await fetch(`${MYMEMORY_URL}?${parametros}`, { signal });
      if (!resposta.ok) throw new Error(`MyMemory: HTTP ${resposta.status}`);

      const dados = await resposta.json();
      if (Number(dados.responseStatus) !== 200) throw new Error('MyMemory: cota esgotada');

      return dados.responseData.translatedText + (bloco.match(/\s*$/)?.[0] ?? '');
    }),
  );

  return traduzidos.join('');
}

export async function traduzirTexto(texto, de = 'en', para = 'pt', signal) {
  const limpo = texto?.trim();
  if (!limpo) return '';

  const chave = chaveDe(limpo, de, para);
  if (cache.has(chave)) return cache.get(chave);

  let resultado;

  try {
    const blocos = dividirEmBlocos(limpo, LIMITE_GOOGLE);
    const partes = await Promise.all(blocos.map((b) => viaGoogle(b, de, para, signal)));
    resultado = partes.join('');
  } catch (erro) {
    if (foiCancelado(erro)) throw erro;
    resultado = await viaMyMemory(limpo, de, para, signal);
  }

  cache.set(chave, resultado);
  return resultado;
}

export async function traduzirLote(linhas, signal, de = 'en', para = 'pt') {
  const resultado = linhas.map((linha) => (linha ?? '').replace(/\s*\n\s*/g, ' ').trim());
  let parcial = false;

  const pendentes = [];
  resultado.forEach((linha, i) => {
    if (!linha) return;
    const chave = chaveDe(linha, de, para);
    if (cache.has(chave)) resultado[i] = cache.get(chave);
    else pendentes.push(i);
  });

  const grupos = [];
  let atual = [];
  let tamanho = 0;
  for (const i of pendentes) {
    const custo = resultado[i].length + 1;
    if (atual.length && tamanho + custo > LIMITE_GOOGLE) {
      grupos.push(atual);
      atual = [];
      tamanho = 0;
    }
    atual.push(i);
    tamanho += custo;
  }
  if (atual.length) grupos.push(atual);

  await Promise.all(
    grupos.map(async (grupo) => {
      const originais = grupo.map((i) => resultado[i]);
      let traduzidas = null;

      try {
        const saida = (await viaGoogle(originais.join('\n'), de, para, signal)).split('\n');
        if (saida.length === originais.length) traduzidas = saida.map((s) => s.trim());
      } catch (erro) {
        if (foiCancelado(erro)) throw erro;
      }

      if (!traduzidas) {
        traduzidas = await Promise.all(
          originais.map((linha) =>
            traduzirTexto(linha, de, para, signal).catch((erro) => {
              if (foiCancelado(erro)) throw erro;
              parcial = true;
              return linha;
            }),
          ),
        );
      }

      grupo.forEach((indice, j) => {
        if (traduzidas[j] !== originais[j]) cache.set(chaveDe(originais[j], de, para), traduzidas[j]);
        resultado[indice] = traduzidas[j];
      });
    }),
  );

  return { linhas: resultado, parcial };
}
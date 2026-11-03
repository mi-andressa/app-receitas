export const CATEGORIAS_PT = {
  Beef: 'Carne bovina',
  Breakfast: 'Café da manhã',
  Chicken: 'Frango',
  Dessert: 'Sobremesa',
  Goat: 'Cabrito',
  Lamb: 'Cordeiro',
  Miscellaneous: 'Variados',
  Pasta: 'Massas',
  Pork: 'Porco',
  Seafood: 'Frutos do mar',
  Side: 'Acompanhamentos',
  Starter: 'Entradas',
  Vegan: 'Vegano',
  Vegetarian: 'Vegetariano',
};

export const nomeDaCategoria = (categoria) => CATEGORIAS_PT[categoria] ?? categoria;

const arredondarPara5 = (valor) => Math.max(5, Math.round(valor / 5) * 5);

function quantidadeInicial(texto) {
  const misto = texto.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (misto) return Number(misto[1]) + Number(misto[2]) / Number(misto[3]);

  const fracao = texto.match(/^(\d+)\/(\d+)/);
  if (fracao) return Number(fracao[1]) / Number(fracao[2]);

  const numero = texto.match(/^(\d+(?:[.,]\d+)?)/);
  if (numero) return parseFloat(numero[1].replace(',', '.'));

  return 1;
}

const QUANTIDADE = String.raw`(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)`;

const formatarPeso = (gramas) =>
  gramas >= 1000
    ? `${(gramas / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`
    : `${gramas}g`;

const CONVERSOES_METRICAS = [
  [new RegExp(`${QUANTIDADE}\\s?(?:fl\\.?\\s?oz|fluid\\s+ounces?)\\b\\.?`, 'gi'), 29.57, (ml) => `${ml} ml`],
  [new RegExp(`${QUANTIDADE}\\s?(?:oz|ounces?)\\b\\.?`, 'gi'), 28.35, formatarPeso],
  [new RegExp(`${QUANTIDADE}\\s?(?:lbs?|pounds?)\\b\\.?`, 'gi'), 453.6, formatarPeso],
];

const UNIDADES = [
  [/\b(?:tbsp|tbs|tblsp|tablespoons?)\b\.?/gi, 'colher de sopa', 'colheres de sopa'],
  [/\b(?:tsp|teaspoons?)\b\.?/gi, 'colher de chá', 'colheres de chá'],
  [/\bcups?\b/gi, 'xícara', 'xícaras'],
  [/\bpinch(?:es)?\b/gi, 'pitada', 'pitadas'],
  [/\bcloves?\b/gi, 'dente', 'dentes'],
  [/\bslices?\b/gi, 'fatia', 'fatias'],
  [/\b(?:cans?|tins?)\b/gi, 'lata', 'latas'],
  [/\bbunch(?:es)?\b/gi, 'maço', 'maços'],
  [/\bsprigs?\b/gi, 'ramo', 'ramos'],
  [/\bhandfuls?\b/gi, 'punhado', 'punhados'],
  [/\bdash(?:es)?\b/gi, 'toque', 'toques'],
];

export function converterMedida(medida = '') {
  let texto = medida.trim();
  if (!texto) return '';

  const plural = quantidadeInicial(texto) > 1;

  for (const [expressao, fator, formatar] of CONVERSOES_METRICAS) {
    texto = texto.replace(expressao, (_, quantidade) =>
      formatar(arredondarPara5(quantidadeInicial(quantidade) * fator)),
    );
  }

  texto = texto.replace(/\bto taste\b/gi, 'a gosto');

  for (const [expressao, singular, pluralTexto] of UNIDADES) {
    texto = texto.replace(expressao, plural ? pluralTexto : singular);
  }

  return texto;
}

export function obterIngredientes(receita) {
  const linhas = [];

  for (let i = 1; i <= 20; i++) {
    const nome = receita[`strIngredient${i}`]?.trim();
    if (!nome) continue;

    const medida = converterMedida(receita[`strMeasure${i}`]);
    linhas.push(medida ? `${medida} ${nome}` : nome);
  }

  return linhas;
}

export function converterTemperaturas(texto) {
  const paraCelsius = (f) => Math.round((((f - 32) * 5) / 9) / 5) * 5;

  return texto
    .replace(/(\d{2,3})\s?°?\s?C\s?\/\s?(?:Gas\s?(?:Mark\s?)?\d+|\d{3}\s?°?\s?F)/gi, '$1°C')
    .replace(/(\d{3})\s?(?:°|º|degrees?)?\s?F\b/g, (_, f) => `${paraCelsius(Number(f))}°C`);
}

export function prepararPassos(instrucoes = '') {
  let passos = converterTemperaturas(instrucoes)
    .split(/\r?\n+/)
    .map((trecho) => trecho.trim())
    .filter(Boolean)
    .filter((trecho) => !/^(?:step\s*)?\d+\s*[.:)]?$/i.test(trecho))
    .map((trecho) => trecho.replace(/^(?:step\s*\d+\s*[-:.)]?\s*|\d+[.)]\s+)/i, ''));

  if (passos.length === 1) {
    passos = passos[0].split(/(?<=[.!?])\s+(?=[A-Z])/);
  }

  return passos.filter(Boolean);
}
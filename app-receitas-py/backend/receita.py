"""Adaptação das receitas ao padrão brasileiro: categorias, medidas, temperaturas e passos."""
import re

CATEGORIAS_PT = {
    "Beef": "Carne bovina",
    "Breakfast": "Café da manhã",
    "Chicken": "Frango",
    "Dessert": "Sobremesa",
    "Goat": "Cabrito",
    "Lamb": "Cordeiro",
    "Miscellaneous": "Variados",
    "Pasta": "Massas",
    "Pork": "Porco",
    "Seafood": "Frutos do mar",
    "Side": "Acompanhamentos",
    "Starter": "Entradas",
    "Vegan": "Vegano",
    "Vegetarian": "Vegetariano",
}


def nome_da_categoria(categoria):
    return CATEGORIAS_PT.get(categoria, categoria) if categoria else ""


def _arredondar(valor, passo=5):
    """Arredonda para o múltiplo de `passo` mais próximo (como o Math.round do JS)."""
    return int(valor / passo + 0.5) * passo


def _arredondar_para_5(valor):
    return max(5, _arredondar(valor))


def quantidade_inicial(texto):
    misto = re.match(r"(\d+)\s+(\d+)/(\d+)", texto)
    if misto:
        return int(misto[1]) + int(misto[2]) / (int(misto[3]) or 1)

    fracao = re.match(r"(\d+)/(\d+)", texto)
    if fracao:
        return int(fracao[1]) / (int(fracao[2]) or 1)

    numero = re.match(r"(\d+(?:[.,]\d+)?)", texto)
    if numero:
        return float(numero[1].replace(",", "."))

    return 1


QUANTIDADE = r"(\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?)"


def formatar_peso(gramas):
    if gramas >= 1000:
        kg = f"{gramas / 1000:.1f}".rstrip("0").rstrip(".").replace(".", ",")
        return f"{kg} kg"
    return f"{gramas}g"


CONVERSOES_METRICAS = [
    (re.compile(QUANTIDADE + r"\s?(?:fl\.?\s?oz|fluid\s+ounces?)\b\.?", re.I), 29.57, lambda ml: f"{ml} ml"),
    (re.compile(QUANTIDADE + r"\s?(?:oz|ounces?)\b\.?", re.I), 28.35, formatar_peso),
    (re.compile(QUANTIDADE + r"\s?(?:lbs?|pounds?)\b\.?", re.I), 453.6, formatar_peso),
]

UNIDADES = [
    (re.compile(r"\b(?:tbsp|tbs|tblsp|tablespoons?)\b\.?", re.I), "colher de sopa", "colheres de sopa"),
    (re.compile(r"\b(?:tsp|teaspoons?)\b\.?", re.I), "colher de chá", "colheres de chá"),
    (re.compile(r"\bcups?\b", re.I), "xícara", "xícaras"),
    (re.compile(r"\bpinch(?:es)?\b", re.I), "pitada", "pitadas"),
    (re.compile(r"\bcloves?\b", re.I), "dente", "dentes"),
    (re.compile(r"\bslices?\b", re.I), "fatia", "fatias"),
    (re.compile(r"\b(?:cans?|tins?)\b", re.I), "lata", "latas"),
    (re.compile(r"\bbunch(?:es)?\b", re.I), "maço", "maços"),
    (re.compile(r"\bsprigs?\b", re.I), "ramo", "ramos"),
    (re.compile(r"\bhandfuls?\b", re.I), "punhado", "punhados"),
    (re.compile(r"\bdash(?:es)?\b", re.I), "toque", "toques"),
]


def converter_medida(medida):
    texto = (medida or "").strip()
    if not texto:
        return ""

    plural = quantidade_inicial(texto) > 1

    for expressao, fator, formatar in CONVERSOES_METRICAS:
        texto = expressao.sub(
            lambda m: formatar(_arredondar_para_5(quantidade_inicial(m.group(1)) * fator)),
            texto,
        )

    texto = re.sub(r"\bto taste\b", "a gosto", texto, flags=re.I)

    for expressao, singular, plural_texto in UNIDADES:
        texto = expressao.sub(plural_texto if plural else singular, texto)

    return texto


def obter_ingredientes(receita):
    linhas = []
    for i in range(1, 21):
        nome = (receita.get(f"strIngredient{i}") or "").strip()
        if not nome:
            continue
        medida = converter_medida(receita.get(f"strMeasure{i}"))
        linhas.append(f"{medida} {nome}" if medida else nome)
    return linhas


def converter_temperaturas(texto):
    def para_celsius(fahrenheit):
        return _arredondar((fahrenheit - 32) * 5 / 9)

    texto = re.sub(
        r"(\d{2,3})\s?°?\s?C\s?/\s?(?:Gas\s?(?:Mark\s?)?\d+|\d{3}\s?°?\s?F)",
        r"\1°C",
        texto,
        flags=re.I,
    )
    return re.sub(
        r"(\d{3})\s?(?:°|º|degrees?)?\s?F\b",
        lambda m: f"{para_celsius(int(m[1]))}°C",
        texto,
    )


def preparar_passos(instrucoes):
    trechos = [t.strip() for t in re.split(r"\r?\n+", converter_temperaturas(instrucoes or ""))]
    passos = [
        re.sub(r"^(?:step\s*\d+\s*[-:.)]?\s*|\d+[.)]\s+)", "", trecho, flags=re.I)
        for trecho in trechos
        if trecho and not re.fullmatch(r"(?:step\s*)?\d+\s*[.:)]?", trecho, flags=re.I)
    ]

    if len(passos) == 1:
        passos = re.split(r"(?<=[.!?])\s+(?=[A-Z])", passos[0])

    return [p for p in passos if p]
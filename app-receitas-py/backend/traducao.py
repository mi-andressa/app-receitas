"""Tradução com Google Translate (principal) e MyMemory (reserva), com cache e lote."""
import asyncio
import re

GOOGLE_URL = "https://translate.googleapis.com/translate_a/single"
MYMEMORY_URL = "https://api.mymemory.translated.net/get"

LIMITE_GOOGLE = 1500
LIMITE_MYMEMORY = 450

_cache = {}


def _chave(texto, de, para):
    return f"{de}|{para}|{texto}"


def dividir_em_blocos(texto, limite):
    """Quebra o texto em blocos de até `limite` caracteres, sem cortar frases."""
    sentencas = re.findall(r"[^.!?]+[.!?]+\s*|[^.!?]+$", texto) or [texto]
    blocos = []
    atual = ""

    for sentenca in sentencas:
        if atual and len(atual + sentenca) > limite:
            blocos.append(atual)
            atual = ""
        atual += sentenca

    if atual:
        blocos.append(atual)
    return blocos


async def _via_google(cliente, texto, de, para):
    parametros = {"client": "gtx", "sl": de, "tl": para, "dt": "t", "q": texto}
    resposta = await cliente.get(GOOGLE_URL, params=parametros)
    resposta.raise_for_status()
    dados = resposta.json()
    return "".join(trecho[0] or "" for trecho in dados[0])


async def _via_mymemory(cliente, texto, de, para):
    async def traduzir_bloco(bloco):
        parametros = {"q": bloco.strip(), "langpair": f"{de}|{para}"}
        resposta = await cliente.get(MYMEMORY_URL, params=parametros)
        resposta.raise_for_status()
        dados = resposta.json()
        if int(dados.get("responseStatus", 0)) != 200:
            raise RuntimeError("MyMemory: cota esgotada")
        espaco_final = re.search(r"\s*$", bloco).group(0)
        return dados["responseData"]["translatedText"] + espaco_final

    blocos = dividir_em_blocos(texto, LIMITE_MYMEMORY)
    partes = await asyncio.gather(*(traduzir_bloco(b) for b in blocos))
    return "".join(partes)


async def traduzir_texto(cliente, texto, de="en", para="pt"):
    limpo = (texto or "").strip()
    if not limpo:
        return ""

    chave = _chave(limpo, de, para)
    if chave in _cache:
        return _cache[chave]

    try:
        blocos = dividir_em_blocos(limpo, LIMITE_GOOGLE)
        partes = await asyncio.gather(*(_via_google(cliente, b, de, para) for b in blocos))
        resultado = "".join(partes)
    except Exception:
        resultado = await _via_mymemory(cliente, limpo, de, para)

    _cache[chave] = resultado
    return resultado


async def traduzir_lote(cliente, linhas, de="en", para="pt"):
    """Traduz várias linhas com o mínimo de requisições.

    Retorna (linhas_traduzidas, parcial). `parcial` é True se algo ficou em inglês.
    """
    resultado = [re.sub(r"\s*\n\s*", " ", linha or "").strip() for linha in linhas]
    estado = {"parcial": False}

    pendentes = []
    for i, linha in enumerate(resultado):
        if not linha:
            continue
        chave = _chave(linha, de, para)
        if chave in _cache:
            resultado[i] = _cache[chave]
        else:
            pendentes.append(i)

    grupos, atual, tamanho = [], [], 0
    for i in pendentes:
        custo = len(resultado[i]) + 1
        if atual and tamanho + custo > LIMITE_GOOGLE:
            grupos.append(atual)
            atual, tamanho = [], 0
        atual.append(i)
        tamanho += custo
    if atual:
        grupos.append(atual)

    async def traduzir_uma(linha):
        try:
            return await traduzir_texto(cliente, linha, de, para)
        except Exception:
            estado["parcial"] = True
            return linha

    async def traduzir_grupo(grupo):
        originais = [resultado[i] for i in grupo]
        traduzidas = None

        try:
            saida = (await _via_google(cliente, "\n".join(originais), de, para)).split("\n")
            if len(saida) == len(originais):
                traduzidas = [s.strip() for s in saida]
        except Exception:
            pass

        if traduzidas is None:
            traduzidas = await asyncio.gather(*(traduzir_uma(l) for l in originais))

        for indice, original, traduzida in zip(grupo, originais, traduzidas):
            if traduzida != original:
                _cache[_chave(original, de, para)] = traduzida
            resultado[indice] = traduzida

    await asyncio.gather(*(traduzir_grupo(g) for g in grupos))
    return resultado, estado["parcial"]
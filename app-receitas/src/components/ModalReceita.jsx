import { useEffect, useMemo, useRef, useState } from 'react';
import { detalhesReceita } from '../services/api';
import { traduzirLote } from '../services/traducao';
import { nomeDaCategoria, obterIngredientes, prepararPassos } from '../utils/receita';
import './ModalReceita.css';

export default function ModalReceita({ resumo, favorito, aoFavoritar, aoFechar }) {
  const refDialogo = useRef(null);
  const [detalhes, setDetalhes] = useState(null);
  const [traduzido, setTraduzido] = useState(null);
  const [parcial, setParcial] = useState(false);
  const [erro, setErro] = useState(false);
  const [marcados, setMarcados] = useState(() => new Set());

  useEffect(() => {
    const dialogo = refDialogo.current;
    if (!dialogo.open) dialogo.showModal();
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    const { signal } = controlador;

    (async () => {
      try {
        const completa = resumo.strInstructions
          ? resumo
          : await detalhesReceita(resumo.idMeal, signal);
        setDetalhes(completa);

        const ingredientes = obterIngredientes(completa);
        const passos = prepararPassos(completa.strInstructions);

        const { linhas, parcial: incompleta } = await traduzirLote(
          [completa.strMeal, completa.strArea ?? '', ...ingredientes, ...passos],
          signal,
        );

        setTraduzido({
          titulo: linhas[0],
          area: linhas[1],
          ingredientes: linhas.slice(2, 2 + ingredientes.length),
          passos: linhas.slice(2 + ingredientes.length),
        });
        setParcial(incompleta);
      } catch (e) {
        if (e.name !== 'AbortError') setErro(true);
      }
    })();

    return () => controlador.abort();
  }, [resumo]);

  const original = useMemo(
    () =>
      detalhes && {
        titulo: detalhes.strMeal,
        area: detalhes.strArea ?? '',
        ingredientes: obterIngredientes(detalhes),
        passos: prepararPassos(detalhes.strInstructions),
      },
    [detalhes],
  );

  const conteudo = traduzido ?? original;
  const traduzindo = detalhes && !traduzido && !erro;
  const meta = [nomeDaCategoria(detalhes?.strCategory), conteudo?.area].filter(Boolean).join(' · ');

  const totalIngredientes = conteudo?.ingredientes.length ?? 0;
  const tudoSeparado = totalIngredientes > 0 && marcados.size === totalIngredientes;
  const percentual = totalIngredientes ? (marcados.size / totalIngredientes) * 100 : 0;

  const alternarIngrediente = (indice) =>
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(indice)) novo.delete(indice);
      else novo.add(indice);
      return novo;
    });

  return (
    <dialog
      ref={refDialogo}
      className="modal"
      aria-labelledby="titulo-modal"
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="modal__layout">
        <div className="modal__midia">
          <img
            src={resumo.strMealThumb}
            alt={`Foto do prato ${conteudo?.titulo ?? resumo.strMeal}`}
          />
          <button
            type="button"
            className="modal__favorito"
            aria-pressed={favorito}
            onClick={() => aoFavoritar(resumo)}
          >
            <span aria-hidden="true">{favorito ? '♥' : '♡'}</span>{' '}
            {favorito ? 'Favoritada' : 'Favoritar'}
          </button>
        </div>

        <div className="modal__corpo">
          <button
            type="button"
            className="modal__fechar"
            aria-label="Fechar receita"
            onClick={() => refDialogo.current.close()}
          >
            ×
          </button>

          {meta && <p className="modal__meta">{meta}</p>}
          <h2 id="titulo-modal">{conteudo?.titulo ?? resumo.strMeal}</h2>

          <p className="modal__aviso" role="status">
            {!detalhes && !erro && 'Carregando receita…'}
            {traduzindo && 'Traduzindo para o português…'}
            {erro && 'Não foi possível carregar a receita. Feche e tente novamente.'}
            {parcial && 'Parte do texto não pôde ser traduzida agora e aparece em inglês.'}
          </p>

          {conteudo && (
            <>
              <section className="modal__secao" aria-labelledby="titulo-ingredientes">
                <h3 id="titulo-ingredientes">Ingredientes</h3>

                <p className="progresso" aria-live="polite">
                  {tudoSeparado
                    ? 'Tudo separado! Hora de cozinhar 🍳'
                    : `${marcados.size} de ${totalIngredientes} separados`}
                </p>
                <div className="progresso__barra" aria-hidden="true">
                  <span style={{ width: `${percentual}%` }} />
                </div>

                <ul className="ingredientes">
                  {conteudo.ingredientes.map((item, indice) => (
                    <li key={indice}>
                      <label
                        className={
                          marcados.has(indice) ? 'ingredientes__item riscado' : 'ingredientes__item'
                        }
                      >
                        <input
                          type="checkbox"
                          checked={marcados.has(indice)}
                          onChange={() => alternarIngrediente(indice)}
                        />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="modal__secao" aria-labelledby="titulo-preparo">
                <h3 id="titulo-preparo">Modo de preparo</h3>
                <ol className="passos">
                  {conteudo.passos.map((passo, indice) => (
                    <li key={indice}>{passo}</li>
                  ))}
                </ol>
              </section>

              {detalhes.strYoutube && (
                <a
                  className="modal__video"
                  href={detalhes.strYoutube}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ▶ Assistir ao vídeo (YouTube, em inglês)
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
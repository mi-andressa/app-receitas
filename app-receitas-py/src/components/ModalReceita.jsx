import { useEffect, useRef, useState } from 'react';
import { detalhesReceita } from '../services/api';
import ListaIngredientes from './ListaIngredientes';
import './ModalReceita.css';

export default function ModalReceita({ resumo, favorito, aoFavoritar, aoFechar }) {
  const refDialogo = useRef(null);
  const [buscada, setBuscada] = useState(null);
  const [erro, setErro] = useState(false);

  const completa = resumo.ingredientes ? resumo : buscada;

  useEffect(() => {
    const dialogo = refDialogo.current;
    if (!dialogo.open) dialogo.showModal();
  }, []);

  useEffect(() => {
    if (resumo.ingredientes) return undefined;

    const controlador = new AbortController();
    detalhesReceita(resumo.idMeal, controlador.signal)
      .then(setBuscada)
      .catch((e) => {
        if (e.name !== 'AbortError') setErro(true);
      });

    return () => controlador.abort();
  }, [resumo]);

  const titulo = completa?.tituloPt ?? resumo.tituloPt ?? resumo.strMeal;
  const meta = [completa?.categoria, completa?.area].filter(Boolean).join(' · ');

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
          <img src={resumo.strMealThumb} alt={`Foto do prato ${titulo}`} />
          <button
            type="button"
            className="modal__favorito"
            aria-pressed={favorito}
            onClick={() => aoFavoritar({ ...resumo, tituloPt: titulo })}
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
          <h2 id="titulo-modal">{titulo}</h2>

          <p className="modal__aviso" role="status">
            {!completa && !erro && 'Carregando e traduzindo a receita…'}
            {erro && 'Não foi possível carregar a receita. Feche e tente novamente.'}
            {completa?.parcial && 'Parte do texto não pôde ser traduzida agora e aparece em inglês.'}
          </p>

          {completa && (
            <>
              <ListaIngredientes itens={completa.ingredientes} />

              <section className="modal__secao" aria-labelledby="titulo-preparo">
                <h3 id="titulo-preparo">Modo de preparo</h3>
                <ol className="passos">
                  {completa.passos.map((passo, indice) => (
                    <li key={indice}>{passo}</li>
                  ))}
                </ol>
              </section>

              {completa.youtube && (
                <a
                  className="modal__video"
                  href={completa.youtube}
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
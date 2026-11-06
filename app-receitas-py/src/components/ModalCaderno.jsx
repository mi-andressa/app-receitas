import { useEffect, useRef, useState } from 'react';
import { avaliarReceita, detalhesCaderno, excluirAvaliacao, excluirReceita } from '../services/api';
import ListaIngredientes from './ListaIngredientes';
import './ModalReceita.css';

const NOTAS = [1, 2, 3, 4, 5];

const estrelas = (nota) => '★'.repeat(nota) + '☆'.repeat(5 - nota);

export default function ModalCaderno({ id, favorito, aoFavoritar, aoEditar, aoAlterar, aoFechar }) {
  const refDialogo = useRef(null);
  const [receita, setReceita] = useState(null);
  const [erro, setErro] = useState('');
  const [versao, setVersao] = useState(0);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const dialogo = refDialogo.current;
    if (!dialogo.open) dialogo.showModal();
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    detalhesCaderno(id, controlador.signal)
      .then((dados) => {
        setReceita(dados);
        setErro('');
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setErro('Não foi possível carregar a receita.');
      });
    return () => controlador.abort();
  }, [id, versao]);

  const recarregar = () => setVersao((atual) => atual + 1);

  const enviarAvaliacao = async (evento) => {
    evento.preventDefault();
    setEnviando(true);
    try {
      await avaliarReceita(id, { nota, comentario });
      setNota(5);
      setComentario('');
      recarregar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  };

  const apagarAvaliacao = async (idAvaliacao) => {
    try {
      await excluirAvaliacao(idAvaliacao);
      recarregar();
    } catch (falha) {
      setErro(falha.message);
    }
  };

  const apagarReceita = async () => {
    if (!window.confirm(`Excluir “${receita.titulo}” do seu caderno?`)) return;
    try {
      await excluirReceita(id);
      await aoAlterar();
      refDialogo.current?.close();
    } catch (falha) {
      setErro(falha.message);
    }
  };

  const titulo = receita?.titulo ?? 'Carregando…';
  const meta = ['📒 Meu caderno', receita?.categoria, receita?.origem].filter(Boolean).join(' · ');
  const itens = receita?.itens.map((item) =>
    item.quantidade ? `${item.nome} — ${item.quantidade}` : item.nome,
  );

  return (
    <dialog
      ref={refDialogo}
      className="modal"
      aria-labelledby="titulo-caderno"
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="modal__layout">
        <div className="modal__midia">
          {receita?.imagem ? (
            <img src={receita.imagem} alt={`Foto do prato ${titulo}`} />
          ) : (
            <span className="modal__sem-foto" aria-hidden="true">
              🍽️
            </span>
          )}
          {receita && (
            <button
              type="button"
              className="modal__favorito"
              aria-pressed={favorito}
              onClick={aoFavoritar}
            >
              <span aria-hidden="true">{favorito ? '♥' : '♡'}</span>{' '}
              {favorito ? 'Favoritada' : 'Favoritar'}
            </button>
          )}
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

          <p className="modal__meta">{meta}</p>
          <h2 id="titulo-caderno">{titulo}</h2>

          <p className="modal__aviso" role="status">
            {erro}
          </p>

          {receita && (
            <>
              <div className="caderno__acoes">
                <button
                  type="button"
                  className="botao botao--fantasma botao--pequeno"
                  onClick={() => aoEditar(receita)}
                >
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  className="botao botao--perigo botao--pequeno"
                  onClick={apagarReceita}
                >
                  🗑️ Excluir
                </button>
              </div>

              <ListaIngredientes itens={itens} />

              <section className="modal__secao" aria-labelledby="titulo-preparo-caderno">
                <h3 id="titulo-preparo-caderno">Modo de preparo</h3>
                <ol className="passos">
                  {receita.passos.map((passo, indice) => (
                    <li key={indice}>{passo}</li>
                  ))}
                </ol>
              </section>

              <section className="modal__secao" aria-labelledby="titulo-avaliacoes">
                <h3 id="titulo-avaliacoes">Avaliações</h3>

                <p className="progresso">
                  {receita.total_avaliacoes
                    ? `${estrelas(Math.round(receita.media))} ${receita.media.toLocaleString('pt-BR')} de 5 · ${receita.total_avaliacoes} ${receita.total_avaliacoes === 1 ? 'avaliação' : 'avaliações'}`
                    : 'Ainda não avaliada. Seja a primeira!'}
                </p>

                {receita.avaliacoes.length > 0 && (
                  <ul className="avaliacoes">
                    {receita.avaliacoes.map((avaliacao) => (
                      <li key={avaliacao.id} className="avaliacoes__item">
                        <span className="avaliacoes__nota" aria-label={`${avaliacao.nota} de 5`}>
                          {estrelas(avaliacao.nota)}
                        </span>
                        <span className="avaliacoes__texto">
                          {avaliacao.comentario || 'Sem comentário.'}
                        </span>
                        <button
                          type="button"
                          className="avaliacoes__excluir"
                          aria-label="Excluir avaliação"
                          onClick={() => apagarAvaliacao(avaliacao.id)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <form className="avaliar" onSubmit={enviarAvaliacao}>
                  <fieldset className="avaliar__estrelas">
                    <legend>Sua nota</legend>
                    {NOTAS.map((valor) => (
                      <label key={valor}>
                        <input
                          type="radio"
                          name="nota"
                          value={valor}
                          checked={nota === valor}
                          onChange={() => setNota(valor)}
                        />
                        <span aria-hidden="true">{valor <= nota ? '★' : '☆'}</span>
                        <span className="visualmente-oculto">
                          {valor} {valor === 1 ? 'estrela' : 'estrelas'}
                        </span>
                      </label>
                    ))}
                  </fieldset>

                  <label htmlFor="comentario-avaliacao" className="visualmente-oculto">
                    Comentário
                  </label>
                  <textarea
                    id="comentario-avaliacao"
                    className="campo"
                    rows={2}
                    maxLength={500}
                    placeholder="Conte como ficou (opcional)"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                  />

                  <button type="submit" className="botao botao--primario" disabled={enviando}>
                    {enviando ? 'Enviando…' : 'Avaliar'}
                  </button>
                </form>
              </section>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
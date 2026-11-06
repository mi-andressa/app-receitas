export default function CartaoReceita({ imagem, titulo, subtitulo, favorito, aoAbrir, aoFavoritar }) {
  return (
    <article className="cartao">
      <button type="button" className="cartao__abrir" onClick={aoAbrir}>
        <span className="cartao__moldura">
          {imagem ? (
            <img
              className="cartao__imagem"
              src={imagem}
              alt=""
              loading="lazy"
              width="350"
              height="350"
            />
          ) : (
            <span className="cartao__imagem cartao__imagem--vazia" aria-hidden="true">
              🍽️
            </span>
          )}
        </span>
        <span className="cartao__titulo">{titulo}</span>
        {subtitulo && <span className="cartao__original">{subtitulo}</span>}
      </button>

      <button
        type="button"
        className="cartao__favorito"
        aria-pressed={favorito}
        aria-label={`${favorito ? 'Remover dos' : 'Adicionar aos'} favoritos: ${titulo}`}
        onClick={aoFavoritar}
      >
        <span aria-hidden="true">{favorito ? '♥' : '♡'}</span>
      </button>
    </article>
  );
}
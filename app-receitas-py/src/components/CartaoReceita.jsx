export default function CartaoReceita({ receita, titulo, favorito, aoAbrir, aoFavoritar }) {
  const traduzido = titulo && titulo.toLowerCase() !== receita.strMeal.toLowerCase();

  return (
    <article className="cartao">
      <button type="button" className="cartao__abrir" onClick={() => aoAbrir(receita)}>
        <span className="cartao__moldura">
          <img
            className="cartao__imagem"
            src={`${receita.strMealThumb}/medium`}
            alt=""
            loading="lazy"
            width="350"
            height="350"
          />
        </span>
        <span className="cartao__titulo">{titulo || receita.strMeal}</span>
        {traduzido && <span className="cartao__original">{receita.strMeal}</span>}
      </button>

      <button
        type="button"
        className="cartao__favorito"
        aria-pressed={favorito}
        aria-label={`${favorito ? 'Remover dos' : 'Adicionar aos'} favoritos: ${titulo || receita.strMeal}`}
        onClick={() => aoFavoritar(receita)}
      >
        <span aria-hidden="true">{favorito ? '♥' : '♡'}</span>
      </button>
    </article>
  );
}
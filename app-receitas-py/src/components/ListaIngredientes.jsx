import { useState } from 'react';

export default function ListaIngredientes({ itens }) {
  const [marcados, setMarcados] = useState(() => new Set());

  const total = itens.length;
  const tudoSeparado = total > 0 && marcados.size === total;
  const percentual = total ? (marcados.size / total) * 100 : 0;

  const alternar = (indice) =>
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(indice)) novo.delete(indice);
      else novo.add(indice);
      return novo;
    });

  return (
    <section className="modal__secao" aria-labelledby="titulo-ingredientes">
      <h3 id="titulo-ingredientes">Ingredientes</h3>

      {total === 0 ? (
        <p className="progresso">Nenhum ingrediente cadastrado.</p>
      ) : (
        <>
          <p className="progresso" aria-live="polite">
            {tudoSeparado
              ? 'Tudo separado! Hora de cozinhar 🍳'
              : `${marcados.size} de ${total} separados`}
          </p>
          <div className="progresso__barra" aria-hidden="true">
            <span style={{ width: `${percentual}%` }} />
          </div>

          <ul className="ingredientes">
            {itens.map((item, indice) => (
              <li key={indice}>
                <label
                  className={
                    marcados.has(indice) ? 'ingredientes__item riscado' : 'ingredientes__item'
                  }
                >
                  <input
                    type="checkbox"
                    checked={marcados.has(indice)}
                    onChange={() => alternar(indice)}
                  />
                  <span>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
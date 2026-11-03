import { useEffect, useState } from 'react';

const CHAVE = 'receitas-favoritas';

function lerDoArmazenamento() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) ?? [];
  } catch {
    return [];
  }
}

export default function useFavoritos() {
  const [favoritos, setFavoritos] = useState(lerDoArmazenamento);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(favoritos));
    } catch {
      return;
    }
  }, [favoritos]);

  const ehFavorito = (id) => favoritos.some((item) => item.idMeal === id);

  const alternar = ({ idMeal, strMeal, strMealThumb }) => {
    setFavoritos((atual) =>
      atual.some((item) => item.idMeal === idMeal)
        ? atual.filter((item) => item.idMeal !== idMeal)
        : [...atual, { idMeal, strMeal, strMealThumb }],
    );
  };

  return { favoritos, ehFavorito, alternar };
}
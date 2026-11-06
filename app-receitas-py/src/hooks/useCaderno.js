import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { alternarFavoritaCaderno, importarReceita, listarCaderno } from '../services/api';

const TEMPO_AVISO = 5000;

export default function useCaderno() {
  const [receitas, setReceitas] = useState([]);
  const [status, setStatus] = useState('carregando');
  const [aviso, setAviso] = useState('');
  const [importando, setImportando] = useState(() => new Set());

  const emAndamento = useRef(new Set());
  const temporizador = useRef(null);
  const controladorAtual = useRef(null);

  const mostrarAviso = useCallback((texto) => {
    clearTimeout(temporizador.current);
    setAviso(texto);
    if (texto) temporizador.current = setTimeout(() => setAviso(''), TEMPO_AVISO);
  }, []);

  const recarregar = useCallback(async () => {
    controladorAtual.current?.abort();
    const controlador = new AbortController();
    controladorAtual.current = controlador;
    setStatus((atual) => (atual === 'erro' ? 'carregando' : atual));
    try {
      setReceitas(await listarCaderno(controlador.signal));
      setStatus('sucesso');
    } catch (erro) {
      if (erro.name !== 'AbortError') setStatus('erro');
    }
  }, []);

  useEffect(() => {
    recarregar();
    return () => {
      controladorAtual.current?.abort();
      clearTimeout(temporizador.current);
    };
  }, [recarregar]);

  const favoritos = useMemo(() => receitas.filter((r) => r.favorita), [receitas]);

  const porMealdb = useMemo(
    () => new Map(receitas.filter((r) => r.id_mealdb).map((r) => [r.id_mealdb, r])),
    [receitas],
  );

  const ehFavorito = useCallback(
    (idMeal) => importando.has(idMeal) || Boolean(porMealdb.get(idMeal)?.favorita),
    [importando, porMealdb],
  );

  const comTrava = useCallback(
    async (chave, acao) => {
      if (emAndamento.current.has(chave)) return;
      emAndamento.current.add(chave);
      try {
        await acao();
      } catch (erro) {
        mostrarAviso(erro.message);
      } finally {
        emAndamento.current.delete(chave);
      }
    },
    [mostrarAviso],
  );

  const alternarFavorita = useCallback(
    (receita) =>
      comTrava(`caderno-${receita.id}`, async () => {
        await alternarFavoritaCaderno(receita.id);
        await recarregar();
      }),
    [comTrava, recarregar],
  );

  const alternarMealdb = useCallback(
    (idMeal) => {
      const existente = porMealdb.get(idMeal);
      if (existente) return alternarFavorita(existente);

      return comTrava(`mealdb-${idMeal}`, async () => {
        setImportando((atual) => new Set(atual).add(idMeal));
        try {
          const importada = await importarReceita(idMeal, true);
          await recarregar();
          if (importada.parcial) {
            mostrarAviso('Receita salva! Parte do texto não pôde ser traduzida e ficou em inglês.');
          }
        } finally {
          setImportando((atual) => {
            const novo = new Set(atual);
            novo.delete(idMeal);
            return novo;
          });
        }
      });
    },
    [porMealdb, alternarFavorita, comTrava, recarregar, mostrarAviso],
  );

  return {
    receitas,
    favoritos,
    status,
    aviso,
    recarregar,
    alternarFavorita,
    alternarMealdb,
    ehFavorito,
  };
}
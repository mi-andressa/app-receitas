import { useEffect, useState } from 'react';
import {
  buscarPorCategoria,
  buscarPorNome,
  listarCategorias,
  receitaAleatoria,
} from '../services/api';
import useFavoritos from '../hooks/useFavoritos';
import CartaoReceita from './CartaoReceita';
import ModalReceita from './ModalReceita';
import './BuscadorReceitas.css';

const CONSULTA_INICIAL = { tipo: 'nome', valor: 'frango' };

const SUGESTOES = ['Bolo', 'Frango', 'Peixe', 'Sopa', 'Torta'];

const foiCancelado = (erro) => erro?.name === 'AbortError';

export default function BuscadorReceitas() {
  const { favoritos, ehFavorito, alternar } = useFavoritos();

  const [termoDigitado, setTermoDigitado] = useState(CONSULTA_INICIAL.valor);
  const [consulta, setConsulta] = useState(CONSULTA_INICIAL);
  const [categorias, setCategorias] = useState([]);
  const [receitas, setReceitas] = useState([]);
  const [statusBusca, setStatusBusca] = useState('carregando');
  const [aberta, setAberta] = useState(null);
  const [sorteando, setSorteando] = useState(false);
  const [erroSorteio, setErroSorteio] = useState(false);

  const verFavoritos = consulta.tipo === 'favoritos';
  const lista = verFavoritos ? favoritos : receitas;
  const status = verFavoritos ? 'sucesso' : statusBusca;

  useEffect(() => {
    const controlador = new AbortController();
    listarCategorias(controlador.signal)
      .then(setCategorias)
      .catch(() => setCategorias([]));
    return () => controlador.abort();
  }, []);

  useEffect(() => {
    if (consulta.tipo === 'favoritos') return undefined;

    const controlador = new AbortController();
    const { signal } = controlador;

    const pedido =
      consulta.tipo === 'categoria'
        ? buscarPorCategoria(consulta.valor, signal)
        : buscarPorNome(consulta.valor, signal);

    pedido
      .then((resultado) => {
        setReceitas(resultado);
        setStatusBusca('sucesso');
      })
      .catch((erro) => {
        if (!foiCancelado(erro)) setStatusBusca('erro');
      });

    return () => controlador.abort();
  }, [consulta]);

  const iniciarConsulta = (novaConsulta) => {
    setErroSorteio(false);
    if (novaConsulta.tipo !== 'favoritos') setStatusBusca('carregando');
    setConsulta(novaConsulta);
  };

  const buscar = (evento) => {
    evento.preventDefault();
    const termo = termoDigitado.trim();
    if (!termo) return;

    iniciarConsulta({ tipo: 'nome', valor: termo });
  };

  const buscarSugestao = (sugestao) => {
    const termo = sugestao.toLowerCase();
    setTermoDigitado(termo);
    iniciarConsulta({ tipo: 'nome', valor: termo });
  };

  const escolherCategoria = (categoria) => {
    setTermoDigitado('');
    iniciarConsulta({ tipo: 'categoria', valor: categoria.id, nome: categoria.nome });
  };

  const mostrarFavoritos = () => {
    setTermoDigitado('');
    iniciarConsulta({ tipo: 'favoritos', valor: '' });
  };

  const sortear = async () => {
    setSorteando(true);
    setErroSorteio(false);
    try {
      setAberta(await receitaAleatoria());
    } catch {
      setErroSorteio(true);
    } finally {
      setSorteando(false);
    }
  };

  const titulosDaLista = {
    nome: `Resultados para “${consulta.valor}”`,
    categoria: `Categoria: ${consulta.nome}`,
    favoritos: 'Suas receitas favoritas',
  };

  const mensagem = erroSorteio
    ? 'Não foi possível sortear uma receita agora. Tente novamente.'
    : {
        carregando: '',
        erro: 'Não foi possível carregar as receitas. Verifique a conexão e tente novamente.',
        sucesso:
          lista.length > 0
            ? ''
            : verFavoritos
              ? 'Você ainda não favoritou nenhuma receita. Toque no ♡ de um prato.'
              : 'Nenhuma receita encontrada. Tente outro termo, como “bolo”, “sopa” ou “arroz”.',
      }[status];

  const carregando = status === 'carregando';
  const mostrarContagem = !carregando && status !== 'erro' && lista.length > 0;

  return (
    <div className="app">
      <header className="hero">
        <p className="hero__selo">Receitas do mundo, em português</p>
        <h1>
          O que vamos <em>cozinhar</em> hoje?
        </h1>

        <form className="busca" role="search" onSubmit={buscar}>
          <label htmlFor="campo-busca" className="visualmente-oculto">
            Buscar receita
          </label>
          <input
            id="campo-busca"
            className="busca__campo"
            type="search"
            value={termoDigitado}
            onChange={(e) => setTermoDigitado(e.target.value)}
            placeholder="Frango, bolo, sopa, arroz…"
            autoComplete="off"
          />
          <button type="submit" className="botao botao--primario">
            Buscar
          </button>
        </form>

        <div className="sugestoes" role="group" aria-label="Sugestões de busca">
          {SUGESTOES.map((sugestao) => (
            <button
              key={sugestao}
              type="button"
              className="sugestao"
              onClick={() => buscarSugestao(sugestao)}
            >
              {sugestao}
            </button>
          ))}
        </div>

        <button type="button" className="botao botao--fantasma" onClick={sortear} disabled={sorteando}>
          {sorteando ? 'Sorteando…' : '🎲 Surpreenda-me'}
        </button>
      </header>

      <nav className="categorias" aria-label="Filtrar por categoria">
        <button
          type="button"
          className="chip chip--favoritos"
          aria-pressed={verFavoritos}
          onClick={mostrarFavoritos}
        >
          ♥ Favoritos ({favoritos.length})
        </button>
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            className="chip"
            aria-pressed={consulta.tipo === 'categoria' && consulta.valor === categoria.id}
            onClick={() => escolherCategoria(categoria)}
          >
            {categoria.nome}
          </button>
        ))}
      </nav>

      <main className="conteudo">
        <h2 className="conteudo__titulo">
          {titulosDaLista[consulta.tipo]}
          {mostrarContagem && (
            <span className="conteudo__contagem">
              {lista.length} {lista.length === 1 ? 'receita' : 'receitas'}
            </span>
          )}
        </h2>

        <p className="mensagem" role="status">
          {mensagem}
        </p>

        {status === 'erro' && (
          <button
            type="button"
            className="botao botao--primario"
            onClick={() => iniciarConsulta({ ...consulta })}
          >
            Tentar novamente
          </button>
        )}

        {carregando && (
          <ul className="grade" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="esqueleto" />
            ))}
          </ul>
        )}

        {!carregando && status !== 'erro' && lista.length > 0 && (
          <ul className="grade">
            {lista.map((receita) => (
              <li key={receita.idMeal}>
                <CartaoReceita
                  receita={receita}
                  titulo={receita.tituloPt}
                  favorito={ehFavorito(receita.idMeal)}
                  aoAbrir={setAberta}
                  aoFavoritar={alternar}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="rodape">
        Receitas: <a href="https://www.themealdb.com">TheMealDB</a> · Tradução automática
        (Google Translate / MyMemory): pode conter imprecisões.
      </footer>

      {aberta && (
        <ModalReceita
          key={aberta.idMeal}
          resumo={aberta}
          favorito={ehFavorito(aberta.idMeal)}
          aoFavoritar={alternar}
          aoFechar={() => setAberta(null)}
        />
      )}
    </div>
  );
}
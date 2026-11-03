import { useEffect, useState } from 'react';
import {
  buscarPorCategoria,
  buscarPorNome,
  listarCategorias,
  receitaAleatoria,
} from '../services/api';
import { traduzirLote, traduzirTexto } from '../services/traducao';
import { nomeDaCategoria } from '../utils/receita';
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
  const [titulosPt, setTitulosPt] = useState({});
  const [status, setStatus] = useState('carregando');
  const [aberta, setAberta] = useState(null);
  const [sorteando, setSorteando] = useState(false);
  const [erroSorteio, setErroSorteio] = useState(false);

  const lista = consulta.tipo === 'favoritos' ? favoritos : receitas;

  useEffect(() => {
    const controlador = new AbortController();
    listarCategorias(controlador.signal)
      .then(setCategorias)
      .catch(() => setCategorias([]));
    return () => controlador.abort();
  }, []);

  useEffect(() => {
    if (consulta.tipo === 'favoritos') {
      setStatus('sucesso');
      return undefined;
    }

    const controlador = new AbortController();
    const { signal } = controlador;

    (async () => {
      try {
        let resultado;

        if (consulta.tipo === 'categoria') {
          resultado = await buscarPorCategoria(consulta.valor, signal);
        } else {
          const termoEmIngles = await traduzirTexto(consulta.valor, 'pt', 'en', signal).catch(
            (erro) => {
              if (foiCancelado(erro)) throw erro;
              return consulta.valor;
            },
          );
          resultado = await buscarPorNome(termoEmIngles.toLowerCase(), signal);
        }

        setReceitas(resultado);
        setStatus('sucesso');
      } catch (erro) {
        if (!foiCancelado(erro)) setStatus('erro');
      }
    })();

    return () => controlador.abort();
  }, [consulta]);

  useEffect(() => {
    if (lista.length === 0) return undefined;

    const controlador = new AbortController();

    traduzirLote(
      lista.map((receita) => receita.strMeal),
      controlador.signal,
    )
      .then(({ linhas }) => {
        setTitulosPt((atual) => {
          const novo = { ...atual };
          lista.forEach((receita, i) => {
            novo[receita.idMeal] = linhas[i];
          });
          return novo;
        });
      })
      .catch(() => {});

    return () => controlador.abort();
  }, [lista]);

  const iniciarConsulta = (novaConsulta) => {
    setErroSorteio(false);
    if (novaConsulta.tipo !== 'favoritos') setStatus('carregando');
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
    iniciarConsulta({ tipo: 'categoria', valor: categoria });
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
    categoria: `Categoria: ${nomeDaCategoria(consulta.valor)}`,
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
            : consulta.tipo === 'favoritos'
              ? 'Você ainda não favoritou nenhuma receita. Toque no ♡ de um prato.'
              : 'Nenhuma receita encontrada. Tente outro termo, como “bolo”, “sopa” ou “arroz”.',
      }[status];

  const carregando = status === 'carregando' && consulta.tipo !== 'favoritos';
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
          aria-pressed={consulta.tipo === 'favoritos'}
          onClick={mostrarFavoritos}
        >
          ♥ Favoritos ({favoritos.length})
        </button>
        {categorias.map((categoria) => (
          <button
            key={categoria}
            type="button"
            className="chip"
            aria-pressed={consulta.tipo === 'categoria' && consulta.valor === categoria}
            onClick={() => escolherCategoria(categoria)}
          >
            {nomeDaCategoria(categoria)}
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

        {status === 'erro' && consulta.tipo !== 'favoritos' && (
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
                  titulo={titulosPt[receita.idMeal]}
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
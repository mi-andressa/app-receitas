import { useEffect, useState } from 'react';
import {
  buscarPorCategoria,
  buscarPorNome,
  listarCategorias,
  receitaAleatoria,
} from '../services/api';
import useCaderno from '../hooks/useCaderno';
import CartaoReceita from './CartaoReceita';
import FormReceita from './FormReceita';
import ModalCaderno from './ModalCaderno';
import ModalReceita from './ModalReceita';
import './BuscadorReceitas.css';
import './Caderno.css';

const CONSULTA_INICIAL = { tipo: 'nome', valor: 'frango' };

const SUGESTOES = ['Bolo', 'Frango', 'Peixe', 'Sopa', 'Torta'];

const VISOES_DO_BANCO = ['favoritos', 'caderno'];

const foiCancelado = (erro) => erro?.name === 'AbortError';

const tituloOriginal = (receita) =>
  receita.tituloPt && receita.tituloPt.toLowerCase() !== receita.strMeal.toLowerCase()
    ? receita.strMeal
    : '';

export default function BuscadorReceitas() {
  const caderno = useCaderno();

  const [termoDigitado, setTermoDigitado] = useState(CONSULTA_INICIAL.valor);
  const [consulta, setConsulta] = useState(CONSULTA_INICIAL);
  const [categorias, setCategorias] = useState([]);
  const [receitas, setReceitas] = useState([]);
  const [statusBusca, setStatusBusca] = useState('carregando');
  const [aberta, setAberta] = useState(null);
  const [abertaCaderno, setAbertaCaderno] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [sorteando, setSorteando] = useState(false);
  const [erroSorteio, setErroSorteio] = useState(false);

  const doBanco = VISOES_DO_BANCO.includes(consulta.tipo);
  const lista =
    { favoritos: caderno.favoritos, caderno: caderno.receitas }[consulta.tipo] ?? receitas;
  const status = doBanco ? caderno.status : statusBusca;
  const receitaAberta = caderno.receitas.find((receita) => receita.id === abertaCaderno);

  useEffect(() => {
    const controlador = new AbortController();
    listarCategorias(controlador.signal)
      .then(setCategorias)
      .catch(() => setCategorias([]));
    return () => controlador.abort();
  }, []);

  useEffect(() => {
    if (VISOES_DO_BANCO.includes(consulta.tipo)) return undefined;

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
    if (!VISOES_DO_BANCO.includes(novaConsulta.tipo)) setStatusBusca('carregando');
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

  const mostrarDoBanco = (tipo) => {
    setTermoDigitado('');
    iniciarConsulta({ tipo, valor: '' });
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

  const tentarNovamente = () =>
    doBanco ? caderno.recarregar() : iniciarConsulta({ ...consulta });

  const salvarReceita = async (salva) => {
    setFormulario(null);
    await caderno.recarregar();
    setAbertaCaderno(salva.id);
  };

  const editarReceita = (receita) => {
    setAbertaCaderno(null);
    setFormulario({ receita });
  };

  const fecharFormulario = () => {
    const idEditado = formulario?.receita?.id;
    setFormulario(null);
    if (idEditado) setAbertaCaderno(idEditado);
  };

  const titulosDaLista = {
    nome: `Resultados para “${consulta.valor}”`,
    categoria: `Categoria: ${consulta.nome}`,
    favoritos: 'Suas receitas favoritas',
    caderno: 'Meu caderno de receitas',
  };

  const mensagemVazia =
    {
      favoritos: 'Você ainda não favoritou nenhuma receita. Toque no ♡ de um prato.',
      caderno: 'Seu caderno está vazio. Cadastre uma receita ou favorite um prato.',
    }[consulta.tipo] ??
    'Nenhuma receita encontrada. Tente outro termo, como “bolo”, “sopa” ou “arroz”.';

  const mensagem = erroSorteio
    ? 'Não foi possível sortear uma receita agora. Tente novamente.'
    : caderno.aviso ||
      {
        carregando: '',
        erro: 'Não foi possível carregar as receitas. Verifique a conexão e tente novamente.',
        sucesso: lista.length > 0 ? '' : mensagemVazia,
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
          aria-pressed={consulta.tipo === 'favoritos'}
          onClick={() => mostrarDoBanco('favoritos')}
        >
          ♥ Favoritos ({caderno.favoritos.length})
        </button>
        <button
          type="button"
          className="chip chip--favoritos"
          aria-pressed={consulta.tipo === 'caderno'}
          onClick={() => mostrarDoBanco('caderno')}
        >
          📒 Meu caderno ({caderno.receitas.length})
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
        <div className="conteudo__cabecalho">
          <h2 className="conteudo__titulo">
            {titulosDaLista[consulta.tipo]}
            {mostrarContagem && (
              <span className="conteudo__contagem">
                {lista.length} {lista.length === 1 ? 'receita' : 'receitas'}
              </span>
            )}
          </h2>
          {consulta.tipo === 'caderno' && (
            <button
              type="button"
              className="botao botao--primario"
              onClick={() => setFormulario({ receita: null })}
            >
              + Nova receita
            </button>
          )}
        </div>

        <p className="mensagem" role="status">
          {mensagem}
        </p>

        {status === 'erro' && (
          <button type="button" className="botao botao--primario" onClick={tentarNovamente}>
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
            {lista.map((receita) =>
              doBanco ? (
                <li key={`caderno-${receita.id}`}>
                  <CartaoReceita
                    imagem={receita.imagem}
                    titulo={receita.titulo}
                    subtitulo={receita.categoria}
                    favorito={receita.favorita}
                    aoAbrir={() => setAbertaCaderno(receita.id)}
                    aoFavoritar={() => caderno.alternarFavorita(receita)}
                  />
                </li>
              ) : (
                <li key={receita.idMeal}>
                  <CartaoReceita
                    imagem={`${receita.strMealThumb}/medium`}
                    titulo={receita.tituloPt || receita.strMeal}
                    subtitulo={tituloOriginal(receita)}
                    favorito={caderno.ehFavorito(receita.idMeal)}
                    aoAbrir={() => setAberta(receita)}
                    aoFavoritar={() => caderno.alternarMealdb(receita.idMeal)}
                  />
                </li>
              ),
            )}
          </ul>
        )}
      </main>

      <footer className="rodape">
        Receitas: <a href="https://www.themealdb.com">TheMealDB</a> · Tradução automática
        (Google Translate / MyMemory): pode conter imprecisões · Seu caderno fica salvo em um
        banco SQLite.
      </footer>

      {aberta && (
        <ModalReceita
          key={aberta.idMeal}
          resumo={aberta}
          favorito={caderno.ehFavorito(aberta.idMeal)}
          aoFavoritar={(receita) => caderno.alternarMealdb(receita.idMeal)}
          aoFechar={() => setAberta(null)}
        />
      )}

      {abertaCaderno !== null && (
        <ModalCaderno
          key={abertaCaderno}
          id={abertaCaderno}
          favorito={Boolean(receitaAberta?.favorita)}
          aoFavoritar={() => receitaAberta && caderno.alternarFavorita(receitaAberta)}
          aoEditar={editarReceita}
          aoAlterar={caderno.recarregar}
          aoFechar={() => setAbertaCaderno(null)}
        />
      )}

      {formulario && (
        <FormReceita
          key={formulario.receita?.id ?? 'nova'}
          receita={formulario.receita}
          aoSalvar={salvarReceita}
          aoFechar={fecharFormulario}
        />
      )}
    </div>
  );
}
import { useEffect, useRef, useState } from 'react';
import {
  atualizarReceita,
  criarReceita,
  listarCategoriasCaderno,
  listarIngredientes,
} from '../services/api';
import './ModalReceita.css';

let proximaChave = 0;

const novoItem = (nome = '', quantidade = '') => {
  proximaChave += 1;
  return { chave: proximaChave, nome, quantidade };
};

export default function FormReceita({ receita, aoSalvar, aoFechar }) {
  const refDialogo = useRef(null);
  const editando = Boolean(receita);

  const [campos, setCampos] = useState(() => ({
    titulo: receita?.titulo ?? '',
    categoria: receita?.categoria ?? '',
    origem: receita?.origem ?? '',
    imagem: receita?.imagem ?? '',
    modo_preparo: receita?.passos?.join('\n') ?? '',
  }));
  const [itens, setItens] = useState(() =>
    receita?.itens?.length
      ? receita.itens.map((item) => novoItem(item.nome, item.quantidade))
      : [novoItem()],
  );
  const [sugestoes, setSugestoes] = useState({ categorias: [], ingredientes: [] });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const dialogo = refDialogo.current;
    if (!dialogo.open) dialogo.showModal();
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    Promise.all([
      listarCategoriasCaderno(controlador.signal),
      listarIngredientes(controlador.signal),
    ])
      .then(([categorias, ingredientes]) => setSugestoes({ categorias, ingredientes }))
      .catch(() => setSugestoes({ categorias: [], ingredientes: [] }));
    return () => controlador.abort();
  }, []);

  const alterarCampo = (evento) =>
    setCampos((atual) => ({ ...atual, [evento.target.name]: evento.target.value }));

  const alterarItem = (chave, campo, valor) =>
    setItens((atual) =>
      atual.map((item) => (item.chave === chave ? { ...item, [campo]: valor } : item)),
    );

  const adicionarItem = () => setItens((atual) => [...atual, novoItem()]);

  const removerItem = (chave) =>
    setItens((atual) =>
      atual.length > 1 ? atual.filter((item) => item.chave !== chave) : [novoItem()],
    );

  const fechar = () => refDialogo.current.close();

  const salvar = async (evento) => {
    evento.preventDefault();
    setSalvando(true);
    setErro('');

    const dados = {
      ...campos,
      itens: itens
        .filter((item) => item.nome.trim())
        .map(({ nome, quantidade }) => ({ nome: nome.trim(), quantidade: quantidade.trim() })),
    };

    try {
      const salva = editando
        ? await atualizarReceita(receita.id, dados)
        : await criarReceita(dados);
      await aoSalvar(salva);
    } catch (falha) {
      setErro(falha.message);
      setSalvando(false);
    }
  };

  return (
    <dialog
      ref={refDialogo}
      className="modal modal--form"
      aria-labelledby="titulo-formulario"
      onClose={aoFechar}
    >
      <form className="formulario" onSubmit={salvar}>
        <div className="formulario__topo">
          <h2 id="titulo-formulario">{editando ? 'Editar receita' : 'Nova receita'}</h2>
          <button type="button" className="modal__fechar" aria-label="Fechar" onClick={fechar}>
            ×
          </button>
        </div>

        <label className="formulario__campo">
          Título *
          <input
            className="campo"
            name="titulo"
            required
            maxLength={120}
            value={campos.titulo}
            onChange={alterarCampo}
          />
        </label>

        <div className="formulario__linha">
          <label className="formulario__campo">
            Categoria
            <input
              className="campo"
              name="categoria"
              list="lista-categorias"
              maxLength={60}
              placeholder="Ex.: Sobremesas"
              value={campos.categoria}
              onChange={alterarCampo}
            />
          </label>
          <label className="formulario__campo">
            Origem
            <input
              className="campo"
              name="origem"
              maxLength={60}
              placeholder="Ex.: Brasileira"
              value={campos.origem}
              onChange={alterarCampo}
            />
          </label>
        </div>

        <datalist id="lista-categorias">
          {sugestoes.categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.nome} />
          ))}
        </datalist>

        <label className="formulario__campo">
          Link da foto <small>(opcional)</small>
          <input
            className="campo"
            type="url"
            name="imagem"
            maxLength={500}
            placeholder="https://…"
            value={campos.imagem}
            onChange={alterarCampo}
          />
        </label>

        <fieldset className="formulario__itens">
          <legend>Ingredientes</legend>
          {itens.map((item, indice) => (
            <div key={item.chave} className="formulario__item">
              <input
                className="campo"
                aria-label={`Ingrediente ${indice + 1}`}
                placeholder="Ingrediente"
                list="lista-ingredientes"
                maxLength={80}
                value={item.nome}
                onChange={(e) => alterarItem(item.chave, 'nome', e.target.value)}
              />
              <input
                className="campo"
                aria-label={`Quantidade do ingrediente ${indice + 1}`}
                placeholder="Quantidade"
                maxLength={80}
                value={item.quantidade}
                onChange={(e) => alterarItem(item.chave, 'quantidade', e.target.value)}
              />
              <button
                type="button"
                className="formulario__remover"
                aria-label={`Remover ingrediente ${indice + 1}`}
                onClick={() => removerItem(item.chave)}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="botao botao--fantasma botao--pequeno"
            onClick={adicionarItem}
          >
            + Ingrediente
          </button>
        </fieldset>

        <datalist id="lista-ingredientes">
          {sugestoes.ingredientes.map((ingrediente) => (
            <option key={ingrediente.id} value={ingrediente.nome} />
          ))}
        </datalist>

        <label className="formulario__campo">
          Modo de preparo * <small>(um passo por linha)</small>
          <textarea
            className="campo"
            name="modo_preparo"
            required
            rows={6}
            maxLength={10000}
            value={campos.modo_preparo}
            onChange={alterarCampo}
          />
        </label>

        <p className="modal__aviso" role="status">
          {erro}
        </p>

        <div className="formulario__acoes">
          <button type="button" className="botao botao--fantasma" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" className="botao botao--primario" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar receita'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
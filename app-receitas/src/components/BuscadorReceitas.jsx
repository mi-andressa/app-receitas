import { useState, useEffect } from 'react';

export default function BuscadorReceitas() {
  const [receitas, setReceitas] = useState([]);
  const [busca, setBusca] = useState('chicken');
  const [receitaSelecionada, setReceitaSelecionada] = useState(null);
  const [traduzindo, setTraduzindo] = useState(false); 

  const buscarReceitas = async () => {
    try {
      const resposta = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${busca}`);
      const dados = await resposta.json();
      setReceitas(dados.meals || []);
    } catch (erro) {
      console.error("Erro ao buscar dados da API", erro);
    }
  };

  useEffect(() => {
    buscarReceitas();
  }, []);

  const traduzirTexto = async (texto) => {
    if (!texto) return "";
    try {
      const textoSeguro = texto.length > 490 ? texto.substring(0, 490) + "..." : texto;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textoSeguro)}&langpair=en|pt`;
      
      const resposta = await fetch(url);
      const dados = await resposta.json();
      
      if (dados && dados.responseData && dados.responseData.translatedText) {
        return dados.responseData.translatedText;
      }
      return texto;
    } catch (erro) {
      console.error("Erro na tradução:", erro);
      return texto;
    }
  };

  const abrirReceita = async (receita) => {
    setReceitaSelecionada(receita); 
    setTraduzindo(true);

    try {
    
      const tituloTraduzido = await traduzirTexto(receita.strMeal);
      const instrucoesTraduzidas = await traduzirTexto(receita.strInstructions);

      setReceitaSelecionada({
        ...receita,
        strMeal: tituloTraduzido,
        strInstructions: instrucoesTraduzidas
      });
    } catch (erro) {
      console.error("Falha ao atualizar tradução", erro);
    } finally {
      setTraduzindo(false);
    }
  };

  const obterIngredientes = (receita) => {
    let ingredientes = [];
    for (let i = 1; i <= 20; i++) {
      if (receita[`strIngredient${i}`] && receita[`strIngredient${i}`].trim() !== "") {
        ingredientes.push(`${receita[`strMeasure${i}`]} de ${receita[`strIngredient${i}`]}`);
      }
    }
    return ingredientes;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', position: 'relative' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>🍽️ Buscador Inteligente de Receitas</h1>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
        <input 
          type="text" 
          value={busca} 
          onChange={(e) => setBusca(e.target.value)} 
          placeholder="Digita um ingrediente em inglês (ex: beef, chicken)..."
          style={{ padding: '10px', width: '300px', borderRadius: '4px', border: '1px solid #ccc', marginRight: '10px' }}
        />
        <button 
          onClick={buscarReceitas} 
          style={{ padding: '10px 20px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Pesquisar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        {receitas.length > 0 ? (
          receitas.map((receita) => (
            <div 
              key={receita.idMeal} 
              onClick={() => abrirReceita(receita)} 
              style={{ 
                border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#f9f9f9', 
                textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img 
                src={receita.strMealThumb} 
                alt={receita.strMeal} 
                style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }} 
              />
              <h3 style={{ fontSize: '1.2rem', margin: '10px 0', color: '#222' }}>{receita.strMeal}</h3>
              <p style={{ margin: '5px 0', color: '#007BFF', fontSize: '0.9rem', fontWeight: 'bold' }}>Clique para ver e traduzir</p>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', width: '100%', color: 'red' }}>
            Nenhuma receita encontrada. Tenta novamente.
          </p>
        )}
      </div>

      {/* JANELE MODAL */}
      {receitaSelecionada && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '700px', width: '90%', 
            maxHeight: '90vh', overflowY: 'auto', position: 'relative'
          }}>
            <button 
              onClick={() => setReceitaSelecionada(null)} 
              style={{ 
                position: 'absolute', top: '15px', right: '15px', background: '#dc3545', color: 'white', 
                border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', 
                fontWeight: 'bold', fontSize: '1.2rem' 
              }}
            >
              X
            </button>
            
            <h2 style={{ marginTop: 0, color: '#333' }}>
              {receitaSelecionada.strMeal}
              {traduzindo && <span style={{ fontSize: '1rem', color: '#ff9900', marginLeft: '10px' }}>(A traduzir...)</span>}
            </h2>

            <img 
              src={receitaSelecionada.strMealThumb} 
              alt={receitaSelecionada.strMeal} 
              style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: '8px', marginBottom: '20px' }} 
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={{ color: '#007BFF' }}>Ingredientes originais:</h3>
                <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                  {obterIngredientes(receitaSelecionada).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 style={{ color: '#007BFF' }}>Instruções:</h3>
                {traduzindo ? (
                  <p style={{ color: '#ff9900', fontWeight: 'bold' }}>A carregar tradução...</p>
                ) : (
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', textAlign: 'justify' }}>
                    {receitaSelecionada.strInstructions}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
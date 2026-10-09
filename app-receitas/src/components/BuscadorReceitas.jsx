import { useState, useEffect } from 'react';

export default function BuscadorReceitas() {
  const [receitas, setReceitas] = useState([]);
  const [busca, setBusca] = useState('chicken');
  
  const [receitaSelecionada, setReceitaSelecionada] = useState(null); 

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

  const obterIngredientes = (receita) => {
    let ingredientes = [];
    for (let i = 1; i <= 20; i++) {
      if (receita[`strIngredient${i}`]) {
        ingredientes.push(
          `${receita[`strMeasure${i}`]} de ${receita[`strIngredient${i}`]}`
        );
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
          placeholder="Digita um ingrediente (ex: beef, chicken, pasta)..."
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
              onClick={() => setReceitaSelecionada(receita)} 
              style={{ 
                border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#f9f9f9', 
                textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'} // Efeito visual de hover
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <img 
                src={receita.strMealThumb} 
                alt={receita.strMeal} 
                style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }} 
              />
              <h3 style={{ fontSize: '1.2rem', margin: '10px 0', color: '#222' }}>{receita.strMeal}</h3>
              <p style={{ margin: '5px 0', color: '#666' }}><strong>Categoria:</strong> {receita.strCategory}</p>
              <p style={{ margin: '5px 0', color: '#007BFF', fontSize: '0.9rem', fontWeight: 'bold' }}>Clique para ver a receita</p>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', width: '100%', color: 'red' }}>
            Nenhuma receita encontrada para "{busca}".
          </p>
        )}
      </div>

      {/* JANELE MODAL: Só aparece se houver uma "receitaSelecionada" */}
      {receitaSelecionada && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '700px', width: '90%', 
            maxHeight: '90vh', overflowY: 'auto', position: 'relative'
          }}>
            {/* Botão de Fechar */}
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
            
            <h2 style={{ marginTop: 0, color: '#333' }}>{receitaSelecionada.strMeal}</h2>
            <img 
              src={receitaSelecionada.strMealThumb} 
              alt={receitaSelecionada.strMeal} 
              style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: '8px', marginBottom: '20px' }} 
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h3 style={{ color: '#007BFF' }}>Ingredientes:</h3>
                <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                  {obterIngredientes(receitaSelecionada).map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 style={{ color: '#007BFF' }}>Modo de Preparação:</h3>
                {/* O white-space "pre-wrap" garante que os parágrafos da API são respeitados */}
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', textAlign: 'justify' }}>
                  {receitaSelecionada.strInstructions}
                </p>
              </div>
            </div>

            {/* Link para o vídeo, caso a receita tenha um */}
            {receitaSelecionada.strYoutube && (
              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <a 
                  href={receitaSelecionada.strYoutube} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ 
                    display: 'inline-block', padding: '12px 25px', backgroundColor: '#FF0000', 
                    color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold' 
                  }}
                >
                  ▶ Assistir Vídeo no YouTube
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
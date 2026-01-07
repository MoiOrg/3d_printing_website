import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TRANSLATIONS } from '../translations';

export default function Menu({ lang }) {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];
  const [cart, setCart] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // Charger le panier au démarrage
  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch("http://localhost:8000/cart");
      const data = await res.json();
      setCart(data);
    } catch (err) {
      console.error("Erreur chargement panier", err);
    }
  };

  // Calcul du total
  useEffect(() => {
    const total = cart.reduce((sum, item) => {
      return sum + (item.config.price * item.quantity);
    }, 0);
    setTotalPrice(total);
  }, [cart]);

  const updateQty = async (id, newQty) => {
    if (newQty < 1) return;
    await fetch("http://localhost:8000/cart/update-qty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: id, quantity: newQty })
    });
    fetchCart();
  };

  const deleteItem = async (id) => {
    if(!confirm(t.btn_delete + "?")) return;
    await fetch("http://localhost:8000/cart/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: id, quantity: 0 })
    });
    fetchCart();
  };

  const launchProduction = async () => {
    try {
      const res = await fetch("http://localhost:8000/production/launch", { method: "POST" });
      if (res.ok) {
        alert("Production lancée ! Le dossier a été envoyé à l'usine.");
        setCart([]); // Vider le panier visuellement
      }
    } catch (err) {
      alert("Erreur lors du lancement");
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>{t.menu_title}</h1>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button className="upload-btn" onClick={() => navigate('/editor')}>
          + {t.menu_add}
        </button>
      </div>

      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', background: '#f8f9fa', borderRadius: '8px' }}>
          <h3>{t.menu_empty}</h3>
        </div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>{t.col_name}</th>
                <th style={{ padding: '10px' }}>{t.col_config}</th>
                <th style={{ padding: '10px' }}>{t.col_qty}</th>
                <th style={{ padding: '10px' }}>{t.col_price}</th>
                <th style={{ padding: '10px' }}>{t.col_actions}</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}><strong>{item.filename}</strong></td>
                  <td style={{ padding: '10px', fontSize: '0.9rem', color: '#555' }}>
                    {item.config.tech} - {item.config.material}<br/>
                    {item.config.infill}% Infill
                  </td>
                  <td style={{ padding: '10px' }}>
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => updateQty(item.id, parseInt(e.target.value))}
                      style={{ width: '60px', padding: '5px' }}
                      min="1"
                    />
                  </td>
                  <td style={{ padding: '10px' }}>
                    {(item.config.price * item.quantity).toFixed(2)} €
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button 
                      onClick={() => deleteItem(item.id)}
                      style={{ background: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {t.btn_delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e9ecef', padding: '20px', borderRadius: '8px' }}>
            <h2 style={{ margin: 0 }}>{t.menu_total}: {totalPrice.toFixed(2)} €</h2>
            <button 
              onClick={launchProduction}
              className="order-btn" 
              style={{ width: 'auto', padding: '15px 40px' }}
            >
              🚀 {t.menu_launch}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
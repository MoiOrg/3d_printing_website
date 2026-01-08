import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TRANSLATIONS } from '../translations';
import MiniViewer from '../components/MiniViewer';
import { MATERIAL_COLORS } from '../constants';

export default function Menu({ lang }) {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];
  const [cart, setCart] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const res = await fetch("http://localhost:8000/cart");
      const data = await res.json();
      setCart(data);
    } catch (err) {
      console.error("Error loading cart", err);
    }
  };

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
        setCart([]); 
        navigate('/success'); 
      }
    } catch (err) {
      alert("Error during launch");
    }
  };

  const getFileUrl = (item) => {
      const filename = item.filepath.split(/[/\\]/).pop();
      return `http://localhost:8000/files/cart/${filename}`;
  };

  return (
    <div className="container section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, marginRight: '10px' }}>{t.menu_title}</h1>
        <button className="btn btn-primary" onClick={() => navigate('/editor')}>
          + {t.menu_add}
        </button>
      </div>

      {cart.length === 0 ? (
        <div className="text-center" style={{ padding: '60px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <h3 style={{ color: 'var(--text-light)', marginBottom: '20px' }}>{t.menu_empty}</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/editor')}>
             {t.menu_add}
          </button>
        </div>
      ) : (
        <>
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>{t.col_name}</th>
                <th>{t.col_config}</th>
                <th>{t.col_qty}</th>
                <th>{t.col_price}</th>
                <th>{t.col_actions}</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                        <MiniViewer 
                           url={getFileUrl(item)} 
                           color={MATERIAL_COLORS[item.config.material]} // PASS COLOR
                        />
                        <strong>{item.filename}</strong>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                    {item.config.tech} - {item.config.material}
                    {item.config.tech === 'FDM' && (
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8' }}>
                        {item.config.infill}% Infill
                      </span>
                    )}
                  </td>
                  <td>
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => updateQty(item.id, parseInt(e.target.value))}
                      style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid var(--border)', textAlign: 'center' }}
                      min="1"
                    />
                  </td>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                    {(item.config.price * item.quantity).toFixed(2)} €
                  </td>
                  <td>
                    <button onClick={() => deleteItem(item.id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                      {t.btn_delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="dashboard-total">
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{t.menu_total}: {totalPrice.toFixed(2)} €</h2>
            <button onClick={launchProduction} className="btn btn-primary" style={{ padding: '12px 30px', fontSize: '1.1rem' }}>
              🚀 {t.menu_launch}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
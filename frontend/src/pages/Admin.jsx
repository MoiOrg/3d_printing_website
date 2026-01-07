import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TRANSLATIONS } from '../translations';

export default function Admin({ lang }) {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];
  
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [manifestContent, setManifestContent] = useState("");

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/batches");
      const data = await res.json();
      setBatches(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadManifest = async (batchId) => {
    setSelectedBatch(batchId);
    setManifestContent("Chargement...");
    try {
      const res = await fetch(`http://localhost:8000/admin/batch/${batchId}`);
      const data = await res.json();
      setManifestContent(data.content);
    } catch (e) {
      setManifestContent("Erreur de chargement");
    }
  };

  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🛡️ {t.admin_title || "Admin"}</h1>
        <button onClick={() => navigate("/")} className="upload-btn" style={{ background: '#6c757d' }}>
          {t.admin_back || "Back"}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* Colonne de gauche : Liste */}
        <div style={{ width: '300px', overflowY: 'auto', borderRight: '1px solid #ddd', paddingRight: '10px' }}>
          <h3>{t.admin_batches || "Batches"}</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {batches.map(b => (
              <li key={b} style={{ marginBottom: '10px' }}>
                <button 
                  onClick={() => loadManifest(b)}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    textAlign: 'left',
                    background: selectedBatch === b ? '#007bff' : '#f8f9fa',
                    color: selectedBatch === b ? 'white' : 'black',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  📁 {b}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne de droite : Détails */}
        <div style={{ flex: 1, background: '#1e1e1e', color: '#00ff00', padding: '20px', borderRadius: '8px', overflowY: 'auto', fontFamily: 'monospace' }}>
          {selectedBatch ? (
            <pre style={{ whiteSpace: 'pre-wrap' }}>{manifestContent}</pre>
          ) : (
            <div style={{ color: '#888', paddingTop: '50px', textAlign: 'center' }}>
              {t.admin_select || "Select a batch"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
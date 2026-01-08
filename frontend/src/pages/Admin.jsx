import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TRANSLATIONS } from '../translations';

export default function Admin({ lang }) {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];
  
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [batchData, setBatchData] = useState({ content: "", items: [] });

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

  const loadBatchDetails = async (batchId) => {
    setSelectedBatchId(batchId);
    setBatchData({ content: "Loading...", items: [] });
    try {
      const res = await fetch(`http://localhost:8000/admin/batch/${batchId}`);
      const data = await res.json();
      setBatchData(data);
    } catch (e) {
      setBatchData({ content: "Load error", items: [] });
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Completed') return '#28a745';
    if (status === 'In Progress') return '#ffc107';
    return '#dc3545';
  };

  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🛡️ {t.admin_title || "Admin"}</h1>
        {/* Changed from inline style to standard btn-secondary class */}
        <button onClick={() => navigate("/")} className="btn btn-secondary">
          {t.admin_back || "Back to Site"}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* Left column: List */}
        <div style={{ width: '350px', overflowY: 'auto', borderRight: '1px solid #ddd', paddingRight: '10px' }}>
          <h3>{t.admin_batches || "Batches"}</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {batches.map(b => (
              <li key={b.id} style={{ marginBottom: '10px' }}>
                <button 
                  onClick={() => loadBatchDetails(b.id)}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    textAlign: 'left',
                    background: selectedBatchId === b.id ? '#007bff' : '#f8f9fa',
                    color: selectedBatchId === b.id ? 'white' : 'black',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{b.id}</span>
                  <span style={{ 
                    fontSize: '0.8em', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    background: getStatusColor(b.status),
                    color: b.status === 'In Progress' ? 'black' : 'white'
                  }}>
                    {b.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Right column: Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Part list and status */}
          <div style={{ padding: '15px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            <h4>Production Status</h4>
            {batchData.items.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <tbody>
                   {batchData.items.map((item, idx) => (
                     <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                       <td style={{ padding: '5px' }}>{item.filename}</td>
                       <td style={{ padding: '5px', textAlign: 'right' }}>
                         {item.status === 'done' ? '✅ Produced' : '⏳ Pending'}
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            ) : <p style={{ color: '#888' }}>Select a batch to see items.</p>}
          </div>

          {/* Text Manifest */}
          <div style={{ flex: 1, background: '#1e1e1e', color: '#00ff00', padding: '20px', borderRadius: '8px', overflowY: 'auto', fontFamily: 'monospace' }}>
            {selectedBatchId ? (
              <pre style={{ whiteSpace: 'pre-wrap' }}>{batchData.content}</pre>
            ) : (
              <div style={{ color: '#888', paddingTop: '50px', textAlign: 'center' }}>
                {t.admin_select || "Select a batch"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
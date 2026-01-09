import React, { useEffect, useState } from 'react';
import { TRANSLATIONS } from '../translations';
import MiniViewer from '../components/MiniViewer';
import { MATERIAL_COLORS } from '../constants';

export default function History({ lang }) {
  const t = TRANSLATIONS[lang];
  const [batches, setBatches] = useState([]);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("https://threed-printing-website-xq1q.onrender.com/admin/batches");
      if (res.ok) {
        const data = await res.json();
        setBatches(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleBatch = async (batchId) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
      return;
    }
    
    setExpandedBatch(batchId);
    
    // Fetch details if not already cached
    if (!batchDetails[batchId]) {
      try {
        const res = await fetch(`https://threed-printing-website-xq1q.onrender.com/admin/batch/${batchId}`);
        if (res.ok) {
          const data = await res.json();
          setBatchDetails(prev => ({ ...prev, [batchId]: data.items }));
        }
      } catch (e) {
        console.error("Error fetching details", e);
      }
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'Completed') return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
    if (status === 'In Progress') return { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' };
    return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
  };

  return (
    <div className="container section">
      <h1 style={{ marginBottom: '30px' }}>📜 {t.history_title}</h1>

      {loading ? (
        <p>{t.calc}</p>
      ) : batches.length === 0 ? (
        <div className="text-center" style={{ padding: '60px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <h3 style={{ color: 'var(--text-light)' }}>{t.history_empty}</h3>
        </div>
      ) : (
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>{t.col_date}</th>
              <th>{t.col_status}</th>
              <th>{t.col_progress}</th>
              <th></th> 
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <React.Fragment key={batch.id}>
                <tr 
                    onClick={() => toggleBatch(batch.id)} 
                    style={{ cursor: 'pointer', background: expandedBatch === batch.id ? 'var(--bg-surface)' : 'transparent' }}
                >
                  <td style={{ fontWeight: '600' }}>{batch.id}</td>
                  <td>
                    <span style={{ 
                      ...getStatusStyle(batch.status),
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: '500'
                    }}>
                      {batch.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-light)' }}>
                     {batch.progress} parts
                  </td>
                  <td>
                    {expandedBatch === batch.id ? '▼' : '▶'}
                  </td>
                </tr>
                {expandedBatch === batch.id && (
                    <tr>
                        <td colSpan="4" style={{ background: '#f8fafc', padding: '20px' }}>
                             {!batchDetails[batch.id] ? (
                                 <div>Loading details...</div>
                             ) : (
                                 <div style={{ display: 'grid', gap: '15px' }}>
                                     {batchDetails[batch.id].map(item => (
                                         <div key={item.id} style={{ 
                                             display: 'flex', alignItems: 'center', gap: '20px', 
                                             background: 'white', padding: '15px', borderRadius: '8px', 
                                             border: '1px solid #e2e8f0' 
                                         }}>
                                             <MiniViewer 
                                                url={`https://threed-printing-website-xq1q.onrender.com/files/production/${batch.id}/${item.stl_disk_name}`} 
                                                color={MATERIAL_COLORS[item.config.material]} // PASS COLOR
                                             />
                                             <div style={{ flex: 1 }}>
                                                 <h4 style={{ margin: '0 0 5px 0' }}>{item.filename}</h4>
                                                 <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', color: '#64748b' }}>
                                                     <span>Tech: <strong>{item.config.tech}</strong></span>
                                                     <span>Material: <strong>{item.config.material}</strong></span>
                                                     {item.config.tech === 'FDM' && <span>Infill: <strong>{item.config.infill}%</strong></span>}
                                                     <span>Qty: <strong>{item.quantity}</strong></span>
                                                 </div>
                                             </div>
                                             <div style={{ textAlign: 'right' }}>
                                                 <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                                     {(item.config.price * item.quantity).toFixed(2)} €
                                                 </div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                        </td>
                    </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
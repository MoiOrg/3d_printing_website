import React, { useEffect, useState } from 'react';
import { TRANSLATIONS } from '../translations';

export default function History({ lang }) {
  const t = TRANSLATIONS[lang];
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for handling row expansion
  const [expandedBatchId, setExpandedBatchId] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:8000/admin/batches");
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

  const toggleDetails = async (batchId) => {
    if (expandedBatchId === batchId) {
      // Collapse if already open
      setExpandedBatchId(null);
      setBatchDetails(null);
      return;
    }

    // Open and fetch details
    setExpandedBatchId(batchId);
    setLoadingDetails(true);
    setBatchDetails(null);

    try {
      const res = await fetch(`http://localhost:8000/admin/batch/${batchId}`);
      if (res.ok) {
        const data = await res.json();
        setBatchDetails(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'Completed' || status === 'done') return { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
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
              <th></th> {/* Empty column for actions */}
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <React.Fragment key={batch.id}>
                <tr>
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
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => toggleDetails(batch.id)}
                      style={{
                        padding: '6px 12px',
                        background: expandedBatchId === batch.id ? 'var(--text-light)' : 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {expandedBatchId === batch.id ? 'Close' : 'Details'}
                    </button>
                  </td>
                </tr>
                {/* Expanded Details Row */}
                {expandedBatchId === batch.id && (
                  <tr>
                    <td colSpan="4" style={{ background: '#f8fafc', padding: '20px' }}>
                      {loadingDetails ? (
                        <p style={{ margin: 0, color: 'var(--text-light)' }}>Loading details...</p>
                      ) : batchDetails ? (
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1rem' }}>Batch Contents</h4>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left' }}>
                                <th style={{ padding: '8px', color: 'var(--text-light)' }}>{t.col_name}</th>
                                <th style={{ padding: '8px', color: 'var(--text-light)' }}>{t.col_status}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {batchDetails.items && batchDetails.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px' }}>{item.filename}</td>
                                  <td style={{ padding: '8px' }}>
                                    <span style={{ 
                                        ...getStatusStyle(item.status),
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem'
                                      }}>
                                      {item.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {/* Optional: Show manifest text if needed */}
                          {/* <pre style={{ marginTop: '20px', fontSize: '0.75rem', color: '#666' }}>{batchDetails.content}</pre> */}
                        </div>
                      ) : (
                        <p>No details found.</p>
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
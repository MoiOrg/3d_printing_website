import React, { useEffect, useState } from 'react';
import { TRANSLATIONS } from '../translations';

export default function History({ lang }) {
  const t = TRANSLATIONS[lang];
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // Reusing the admin endpoint as it provides the list of all batches
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
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
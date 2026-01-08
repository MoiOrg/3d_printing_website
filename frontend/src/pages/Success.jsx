import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TRANSLATIONS } from '../translations';

export default function Success({ lang }) {
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];

  return (
    <div className="container section text-center" style={{ padding: '100px 20px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '15px', color: '#166534' }}>{t.success_title}</h1>
      <p style={{ fontSize: '1.2rem', color: '#15803d', fontWeight: '500' }}>
        {t.success_msg}
      </p>
      <p style={{ color: '#64748b', maxWidth: '500px', margin: '10px auto 40px', lineHeight: '1.6' }}>
        {t.success_sub}
      </p>
      
      <button 
        className="btn btn-primary"
        onClick={() => navigate('/dashboard')}
        style={{ padding: '12px 30px', fontSize: '1.1rem' }}
      >
        {t.btn_back_dash}
      </button>
    </div>
  );
}
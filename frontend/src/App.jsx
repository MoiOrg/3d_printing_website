import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Menu from './pages/Menu';
import Editor from './pages/Editor';
import Admin from './pages/Admin';
import { TRANSLATIONS } from './translations';
import './App.css';

function App() {
  const [lang, setLang] = useState('EN'); 
  const t = TRANSLATIONS[lang];

  return (
    <Router>
      <div className="app-layout">
        <header className="navbar">
          <div className="navbar-brand">
            <Link to="/" style={{ color: 'white', textDecoration: 'none', marginRight: '20px' }}>
              {t.title}
            </Link>
            
            <Link to="/admin" style={{ fontSize: '0.8rem', color: '#ffffff80', textDecoration: 'none' }}>
              [Admin]
            </Link>
          </div>
          
          <div className="navbar-actions">
            <div className="lang-select">
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="EN">🇬🇧 EN</option>
                <option value="CN">🇨🇳 CN</option>
              </select>
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Menu lang={lang} />} />
          <Route path="/editor" element={<Editor lang={lang} />} />
          <Route path="/admin" element={<Admin lang={lang} />} /> 
        </Routes>

      </div>
    </Router>
  );
}

export default App;
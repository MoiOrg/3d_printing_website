import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Menu from './pages/Menu';
import Editor from './pages/Editor';
import { TRANSLATIONS } from './translations';
import './App.css';

function App() {
  const [lang, setLang] = useState('FR');
  const t = TRANSLATIONS[lang];

  return (
    <Router>
      <div className="app-layout">
        {/* --- HEADER COMMUN --- */}
        <header className="navbar">
          <div className="navbar-brand">
            <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
              {t.title}
            </Link>
          </div>
          <div className="navbar-actions">
            {/* Vous pouvez ajouter des liens ici */}
            <div className="lang-select">
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="FR">🇫🇷 FR</option>
                <option value="EN">🇬🇧 EN</option>
                <option value="CN">🇨🇳 CN</option>
              </select>
            </div>
          </div>
        </header>

        {/* --- CONTENU --- */}
        <Routes>
          <Route path="/" element={<Menu lang={lang} />} />
          <Route path="/editor" element={<Editor lang={lang} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
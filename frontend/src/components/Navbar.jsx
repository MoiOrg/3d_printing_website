import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TRANSLATIONS } from '../translations';

export default function Navbar({ lang, setLang }) {
  const t = TRANSLATIONS[lang];
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="nav-brand">
          🖨️ 3D PrintStudio
        </Link>

        <div className="nav-links">
          <Link to="/" className={`nav-link ${isActive('/')}`}>{t.nav_home}</Link>
          <Link to="/services" className={`nav-link ${isActive('/services')}`}>{t.nav_services}</Link>
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>{t.nav_dashboard}</Link>
          
          {/* New Flag Switcher */}
          <div className="lang-switcher">
            <button 
              className={`lang-btn ${lang === 'EN' ? 'active' : ''}`} 
              onClick={() => setLang('EN')}
              title="English"
            >
              EN 🇺🇸
            </button>
            <button 
              className={`lang-btn ${lang === 'CN' ? 'active' : ''}`} 
              onClick={() => setLang('CN')}
              title="Chinese"
            >
              CN 🇨🇳
            </button>
          </div>

          <Link to="/editor" className="btn btn-primary">
            + {t.nav_get_quote}
          </Link>
        </div>
      </div>
    </nav>
  );
}
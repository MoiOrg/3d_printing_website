import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TRANSLATIONS } from '../translations';

export default function Navbar({ lang, setLang }) {
  // Retrieve the translation object based on the current language prop
  const t = TRANSLATIONS[lang];
  const location = useLocation();

  // Helper to determine if a nav link is active based on the current path
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
          
          <div className="lang-switcher">
             {/* Dropdown with enhanced styling for better visibility and clickability */}
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              className="lang-select"
              aria-label="Select Language"
              style={{
                fontSize: '1.1rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #ccc',
                cursor: 'pointer',
                backgroundColor: '#f8f9fa'
              }}
            >
              <option value="EN">🇬🇧 EN</option>
              <option value="CN">🇨🇳 CN</option>
            </select>
          </div>

          <Link to="/editor" className="btn btn-primary">
            + {t.nav_get_quote}
          </Link>
        </div>
      </div>
    </nav>
  );
}
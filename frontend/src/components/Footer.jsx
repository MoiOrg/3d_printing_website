import React from 'react';
import { Link } from 'react-router-dom';
import { TRANSLATIONS } from '../translations';

export default function Footer({ lang }) {
  const t = lang ? TRANSLATIONS[lang] : TRANSLATIONS['EN'];

  return (
    <footer className="footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <strong>3D PrintStudio</strong>
        </div>
        <div className="footer-text">
          &copy; {new Date().getFullYear()} 3D PrintStudio. All rights reserved.
          
          <span style={{ margin: '0 10px', opacity: 0.3 }}>|</span>
          
          <Link to="/admin" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.8 }}>
            {t ? t.nav_admin : "Admin"}
          </Link>
        </div>
      </div>
    </footer>
  );
}
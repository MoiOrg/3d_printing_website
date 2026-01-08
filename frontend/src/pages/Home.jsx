import React from 'react';
import { Link } from 'react-router-dom';
import { TRANSLATIONS } from '../translations';

export default function Home({ lang }) {
  const t = TRANSLATIONS[lang];

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>{t.home_hero_title}</h1>
          <p>{t.home_hero_subtitle}</p>
          <Link to="/editor" className="btn btn-primary" style={{ padding: '15px 30px', fontSize: '1.1rem' }}>
            {t.home_cta}
          </Link>
        </div>
      </section>

      {/* Steps Section */}
      <section className="section">
        <div className="container">
          <div className="grid-3">
            <div className="feature-card text-center">
              <span className="feature-icon">YZ</span>
              <h3 className="feature-title">{t.step_1_title}</h3>
              <p className="feature-desc">{t.step_1_desc}</p>
            </div>
            <div className="feature-card text-center">
              <span className="feature-icon">⚙️</span>
              <h3 className="feature-title">{t.step_2_title}</h3>
              <p className="feature-desc">{t.step_2_desc}</p>
            </div>
            <div className="feature-card text-center">
              <span className="feature-icon">📦</span>
              <h3 className="feature-title">{t.step_3_title}</h3>
              <p className="feature-desc">{t.step_3_desc}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
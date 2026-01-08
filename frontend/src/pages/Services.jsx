import React from 'react';
import { TRANSLATIONS } from '../translations';

export default function Services({ lang }) {
  const t = TRANSLATIONS[lang];

  return (
    <div className="container section">
      <div className="text-center" style={{ marginBottom: '50px' }}>
        <h1>{t.services_title}</h1>
        <p style={{ color: '#64748b' }}>{t.services_intro}</p>
      </div>

      <div className="grid-3">
        {/* FDM Card */}
        <div className="feature-card">
          <h3 className="feature-title" style={{color: '#FF8C00'}}>FDM (Fused Deposition Modeling)</h3>
          <p className="feature-desc">Best for rapid prototyping and low-cost parts.</p>
          <ul style={{ marginTop: '15px', color: '#334155' }}>
            <li>• PLA (Standard)</li>
            <li>• PETG (Durable)</li>
            <li>• ABS (Heat Resistant)</li>
            <li>• TPU (Flexible)</li>
          </ul>
        </div>

        {/* Resin Card */}
        <div className="feature-card">
          <h3 className="feature-title" style={{color: '#00CED1'}}>SLA (Stereolithography)</h3>
          <p className="feature-desc">High detail and smooth surface finish for visual models.</p>
          <ul style={{ marginTop: '15px', color: '#334155' }}>
            <li>• Standard Resin</li>
            <li>• Tough Engineering Resin</li>
          </ul>
        </div>

        {/* SLS Card */}
        <div className="feature-card">
          <h3 className="feature-title" style={{color: '#64748b'}}>SLS (Selective Laser Sintering)</h3>
          <p className="feature-desc">Industrial strength nylon parts with no support structures.</p>
          <ul style={{ marginTop: '15px', color: '#334155' }}>
            <li>• Nylon PA12</li>
            <li>• Glass-Filled Nylon</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <strong>3D PrintStudio</strong>
        </div>
        <div className="footer-text">
          &copy; {new Date().getFullYear()} 3D PrintStudio. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
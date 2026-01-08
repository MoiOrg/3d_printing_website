import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Services from './pages/Services';
import Menu from './pages/Menu';
import Editor from './pages/Editor';
import Admin from './pages/Admin';
import './App.css';

function App() {
  const [lang, setLang] = useState('EN'); 

  return (
    <Router>
      <div className="app-layout">
        {/* Navbar is persistent */}
        <Navbar lang={lang} setLang={setLang} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Home lang={lang} />} />
            <Route path="/services" element={<Services lang={lang} />} />
            {/* Renamed Menu route to Dashboard conceptually, but keeping file name */}
            <Route path="/dashboard" element={<Menu lang={lang} />} />
            <Route path="/editor" element={<Editor lang={lang} />} />
            <Route path="/admin" element={<Admin lang={lang} />} /> 
          </Routes>
        </div>

        {/* Footer is persistent, but maybe you want to hide it on Editor for full screen? 
            For simplicity, we keep it or handle check inside Footer */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;
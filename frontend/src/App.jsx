import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Services from './pages/Services';
import Menu from './pages/Menu';
import Editor from './pages/Editor';
import Admin from './pages/Admin';
import Success from './pages/Success';
import History from './pages/History';
import './App.css';

function App() {
  const [lang, setLang] = useState('EN'); 

  return (
    <Router>
      <div className="app-layout">
        {/* Main Navigation */}
        <Navbar lang={lang} setLang={setLang} />

        {/* Page Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<Home lang={lang} />} />
            <Route path="/services" element={<Services lang={lang} />} />
            <Route path="/dashboard" element={<Menu lang={lang} />} />
            <Route path="/history" element={<History lang={lang} />} />
            <Route path="/editor" element={<Editor lang={lang} />} />
            <Route path="/success" element={<Success lang={lang} />} />
            <Route path="/admin" element={<Admin lang={lang} />} /> 
          </Routes>
        </div>

        <Footer lang={lang} />
      </div>
    </Router>
  );
}

export default App;
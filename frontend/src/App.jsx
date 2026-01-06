import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Grid } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { useLoader } from '@react-three/fiber';

// On importe le CSS qu'on vient de créer
import './App.css';

// --- COMPOSANT 3D ---
function Model({ url, color }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

// --- APP PRINCIPALE ---
function App() {
  const [fileUrl, setFileUrl] = useState(null);
  const [material, setMaterial] = useState('PLA');
  const [infill, setInfill] = useState(20);
  const [color, setColor] = useState('#1e90ff');
  const [price, setPrice] = useState(0);

  const colors = ['#1e90ff', '#ff4500', '#28a745', '#333333', '#f0f0f0'];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileUrl(URL.createObjectURL(file));
      setPrice(15.50); // Simulation
    }
  };

  return (
    <div className="app-container">
      
      {/* --- SIDEBAR --- */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>3D Print Studio</h1>
          <p>Configurez votre impression</p>
        </div>

        {/* Upload */}
        <div className="form-section">
          <label className="label-title">1. Fichier 3D (.stl)</label>
          <label className="upload-btn">
            {fileUrl ? "Changer de fichier" : "📂 Importer un fichier STL"}
            <input type="file" accept=".stl" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Matériau */}
        <div className="form-section">
          <label className="label-title">2. Matériau</label>
          <select className="select-input" value={material} onChange={(e) => setMaterial(e.target.value)}>
            <option value="PLA">PLA (Standard)</option>
            <option value="PETG">PETG (Résistant)</option>
            <option value="ABS">ABS (Technique)</option>
          </select>
        </div>

        {/* Couleur */}
        <div className="form-section">
          <label className="label-title">3. Couleur</label>
          <div className="color-picker">
             {colors.map((c) => (
               <div 
                key={c}
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={`color-swatch ${color === c ? 'active' : 'inactive'}`}
               />
             ))}
          </div>
        </div>

        {/* Infill */}
        <div className="form-section">
          <label className="label-title">4. Remplissage: {infill}%</label>
          <input 
            type="range" min="10" max="100" step="5" 
            value={infill} onChange={(e) => setInfill(e.target.value)} 
            className="range-input"
          />
        </div>

        {/* Prix */}
        <div className="price-box">
          <div className="price-label">Estimation du coût</div>
          <h2 className="price-value">{fileUrl ? `${price} €` : "-- €"}</h2>
          <button className="order-btn" disabled={!fileUrl}>
            Lancer la production
          </button>
        </div>
      </aside>

      {/* --- VIEWER --- */}
      <main className="viewer-container">
        {!fileUrl && (
          <div className="empty-state">
            <h2>Aucun modèle chargé</h2>
            <p>Utilisez le panneau de gauche pour importer un fichier STL.</p>
          </div>
        )}

        <Canvas shadows camera={{ position: [0, 0, 100], fov: 45 }}>
          <color attach="background" args={['#f5f5f7']} />
          <ambientLight intensity={0.7} />
          <spotLight position={[50, 50, 50]} angle={0.25} penumbra={1} castShadow intensity={1} />
          
          <Suspense fallback={null}>
            {fileUrl && (
              <Stage environment="city" intensity={0.4} adjustCamera={true}>
                <Model url={fileUrl} color={color} />
              </Stage>
            )}
          </Suspense>

          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.7} />
          <Grid infiniteGrid fadeDistance={400} sectionColor="#cccccc" cellColor="#e5e5e5"/>
        </Canvas>
      </main>

    </div>
  );
}

export default App;
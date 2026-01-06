import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, Center, useBounds } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import './App.css';

// --- CONFIGURATION DES DONNÉES ---
const PRINT_OPTIONS = {
  FDM: {
    label: "Dépôt de fil (FDM)",
    materials: [
      { id: "PLA", name: "PLA (Standard)", color: "#FF8C00" }, // Orange
      { id: "PETG", name: "PETG (Résistant)", color: "#32CD32" }, // Vert
      { id: "ABS", name: "ABS (Technique)", color: "#DC143C" }, // Rouge
      { id: "TPU", name: "TPU (Flexible)", color: "#1E90FF" }  // Bleu
    ]
  },
  RESIN: {
    label: "Résine (SLA/DLP)",
    materials: [
      { id: "RESINE_STD", name: "Résine Standard", color: "#808080" }, // Gris
      { id: "RESINE_TOUGH", name: "Résine Tough", color: "#00CED1" } // Cyan foncé
    ]
  },
  SLS: {
    label: "Frittage de poudre (SLS)",
    materials: [
      { id: "NYLON_PA12", name: "Nylon PA12", color: "#D3D3D3" }, // Gris clair
      { id: "NYLON_GLASS", name: "Nylon Chargé Verre", color: "#F5F5F5" } // Blanc
    ]
  }
};

const INFILL_PRESETS = [20, 40, 60, 80, 100];

// --- COMPOSANTS 3D ---
function Model({ url, color }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial 
        color={color} 
        roughness={0.5} 
        metalness={0.1} 
      />
    </mesh>
  );
}

function ModelWithAutoFit({ url, color }) {
  const bounds = useBounds();
  const handleCentered = () => {
    bounds.refresh().fit();
  };
  return (
    <Center onCentered={handleCentered}>
      <Model url={url} color={color} />
    </Center>
  );
}

function App() {
  // État de l'application
  const [fileUrl, setFileUrl] = useState(null);
  
  // Sélection
  const [techKey, setTechKey] = useState("FDM");
  const [materialKey, setMaterialKey] = useState("PLA");
  const [infill, setInfill] = useState(20);
  
  // Résultats
  const [volume, setVolume] = useState(null);
  const [quote, setQuote] = useState({ price: 0, weight: 0 });
  const [isComputing, setIsComputing] = useState(false);

  // 1. GESTION DU CHANGEMENT DE TECHNOLOGIE
  const handleTechChange = (newTech) => {
    setTechKey(newTech);
    const defaultMat = PRINT_OPTIONS[newTech].materials[0].id;
    setMaterialKey(defaultMat);
  };

  // Récupération de la couleur actuelle basée sur le matériau sélectionné
  const currentMaterialColor = useMemo(() => {
    const matObj = PRINT_OPTIONS[techKey].materials.find(m => m.id === materialKey);
    return matObj ? matObj.color : "#ffffff";
  }, [techKey, materialKey]);

  // 2. UPLOAD FICHIER
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileUrl(URL.createObjectURL(file));
    setVolume(null);
    setQuote({ price: 0, weight: 0 }); 
    setIsComputing(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/analyze-file", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        setVolume(data.volume_cm3);
      } else {
        setIsComputing(false);
      }
    } catch (error) {
      console.error("Erreur upload:", error);
      setIsComputing(false);
    }
  };

  // 3. CALCUL DU PRIX (Trigger automatique avec debounce)
  useEffect(() => {
    if (volume !== null) {
      const fetchPrice = async () => {
        if (!isComputing) setIsComputing(true); 
        
        try {
          const response = await fetch("http://localhost:8000/calculate-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              volume_cm3: volume,
              material: materialKey,
              infill: parseInt(infill)
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setQuote({ price: data.price, weight: data.weight_g });
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsComputing(false);
        }
      };
      
      // CORRECTION ICI : suppression du "yb"
      const timeoutId = setTimeout(fetchPrice, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [volume, materialKey, infill, techKey]);

  return (
    <div className="app-layout">
      {/* --- HEADER --- */}
      <header className="navbar">
        <div className="navbar-brand">🖨️ 3D Print Studio</div>
        <div className="navbar-actions">
          <button className="nav-btn">Mes Projets</button>
          <button className="nav-btn">Aide</button>
          <div className="lang-select">
            <select>
              <option>🇫🇷 FR</option>
              <option>🇬🇧 EN</option>
              <option>🇪🇸 ES</option>
            </select>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* --- SIDEBAR --- */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Configuration</h2>
          </div>

          <div className="form-section">
            <label className="label-title">1. Fichier 3D</label>
            <label className="upload-btn">
              {fileUrl ? "Changer de fichier" : "📂 Importer STL"}
              <input type="file" accept=".stl" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="form-section">
            <label className="label-title">2. Technologie</label>
            <select 
              className="select-input" 
              value={techKey} 
              onChange={(e) => handleTechChange(e.target.value)}
            >
              {Object.keys(PRINT_OPTIONS).map(key => (
                <option key={key} value={key}>{PRINT_OPTIONS[key].label}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label className="label-title">3. Matériau</label>
            <select 
              className="select-input" 
              value={materialKey} 
              onChange={(e) => setMaterialKey(e.target.value)}
            >
              {PRINT_OPTIONS[techKey].materials.map(mat => (
                <option key={mat.id} value={mat.id}>{mat.name}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label className="label-title">4. Remplissage</label>
            <div className="infill-grid">
              {INFILL_PRESETS.map((val) => (
                <button 
                  key={val}
                  className={`infill-btn ${infill === val ? 'active' : ''}`}
                  onClick={() => setInfill(val)}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>

          <div className="price-box">
            <div className="price-label">Estimation du coût</div>
            <h2 className="price-value">
              {isComputing ? <span className="loader-dots">...</span> : (quote.price > 0 ? `${quote.price} €` : "-- €")}
            </h2>
            {quote.weight > 0 && (
              <div className="price-details">
                Poids: {quote.weight} g<br/>
                Vol: {Math.round(volume)} cm³
              </div>
            )}
            
            <button className="order-btn" disabled={!quote.price || isComputing}>
              {isComputing ? "Calcul..." : "Lancer la production"}
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

          <Canvas shadows camera={{ position: [0, 0, 10], fov: 50 }}>
            <color attach="background" args={['#f5f5f7']} />
            <ambientLight intensity={0.7} />
            <spotLight position={[50, 50, 50]} angle={0.25} penumbra={1} castShadow intensity={1} />
            <Environment preset="city" />
            
            <Suspense fallback={null}>
              {fileUrl && (
                <Bounds key={fileUrl} margin={1.2}>
                  <ModelWithAutoFit url={fileUrl} color={currentMaterialColor} />
                </Bounds>
              )}
            </Suspense>
            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI} />
          </Canvas>
        </main>
      </div>
    </div>
  );
}

export default App;
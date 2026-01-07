import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, Center, useBounds } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { useNavigate } from 'react-router-dom'; // Pour la redirection
import { TRANSLATIONS } from '../translations';
// Assurez-vous d'importer le CSS global ou copiez le contenu pertinent ici si besoin
import '../App.css';

const INFILL_PRESETS = [20, 40, 60, 80];

// --- COMPOSANTS 3D ---
function Model({ url, color }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

const ModelWithAutoFit = React.memo(function ModelWithAutoFit({ url, color }) {
  const bounds = useBounds();
  const handleCentered = () => { bounds.refresh().fit(); };
  return (
    <Center onCentered={handleCentered}>
      <Model url={url} color={color} />
    </Center>
  );
});

export default function Editor({ lang }) {
  const navigate = useNavigate(); // Hook de navigation
  const [fileUrl, setFileUrl] = useState(null);
  const [fileObject, setFileObject] = useState(null); // On garde le fichier brut pour l'envoyer au save
  
  // Sélection
  const [techKey, setTechKey] = useState("FDM");
  const [materialKey, setMaterialKey] = useState("PLA");
  const [infill, setInfill] = useState(20);
  
  // Résultats
  const [volume, setVolume] = useState(null);
  const [quote, setQuote] = useState({kf: 0, weight: 0 });
  const [isComputing, setIsComputing] = useState(false);

  const controlsRef = useRef(null);
  const t = TRANSLATIONS[lang];

  // Options dynamiques
  const printOptions = useMemo(() => {
    return {
      FDM: {
        label: t.tech_fdm,
        materials: [
          { id: "PLA", name: t.mat_pla, color: "#FF8C00" },
          { id: "PETG", name: t.mat_petg, color: "#32CD32" },
          { id: "ABS", name: t.mat_abs, color: "#DC143C" },
          { id: "TPU", name: t.mat_tpu, color: "#1E90FF" }
        ]
      },
      RESIN: { // Nom clé backend: RESINE_... attention au mapping
        label: t.tech_resin,
        materials: [
          { id: "RESINE_STD", name: t.mat_res_std, color: "#808080" },
          { id: "RESINE_TOUGH", name: t.mat_res_tough, color: "#00CED1" }
        ]
      },
      SLS: {
        label: t.tech_sls,
        materials: [
          { id: "NYLON_PA12", name: t.mat_pa12, color: "#E3E3E3" },
          { id: "NYLON_GLASS", name: t.mat_glass, color: "#F9F9F9" }
        ]
      }
    };
  }, [lang, t]);

  const handleTechChange = (newTech) => {
    setTechKey(newTech);
    const defaultMat = printOptions[newTech].materials[0].id;
    setMaterialKey(defaultMat);
  };

  const currentMaterialColor = useMemo(() => {
    const matObj = printOptions[techKey].materials.find(m => m.id === materialKey);
    return matObj ? matObj.color : "#ffffff";
  }, [techKey, materialKey, printOptions]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileObject(file); // Stockage pour sauvegarde future
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
        } catch (err) { console.error(err); } finally { setIsComputing(false); }
      };
      const timeoutId = setTimeout(fetchPrice, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [volume, materialKey, infill, techKey]);

  // --- SAUVEGARDE ---
  const handleSaveToCart = async () => {
    if (!fileObject || !quote.price) return;

    const configData = {
      tech: techKey,
      material: materialKey,
      infill: techKey === "FDM" ? infill : 100,
      price: quote.price,
      weight: quote.weight,
      volume: volume
    };

    const formData = new FormData();
    formData.append("file", fileObject);
    formData.append("config", JSON.stringify(configData));

    try {
      const res = await fetch("http://localhost:8000/cart/add", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        // Redirection vers le menu
        navigate("/");
      } else {
        alert("Erreur lors de la sauvegarde");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau");
    }
  };

  const handleZoom = (d) => { /* Code zoom identique */ };

  return (
    <div className="app-layout" style={{ height: 'calc(100vh - 60px)' }}> {/* Ajustement hauteur si header externe */}
      
      {/* Bouton retour simple dans la sidebar ou header local */}
      
      <div className="main-content">
        <aside className="sidebar">
          <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => navigate("/")} style={{ border:'none', background:'transparent', cursor:'pointer', fontSize:'1.2rem'}}>⬅️</button>
            <h2>{t.config_title}</h2>
          </div>

          <div className="form-section">
            <label className="label-title">{t.section_file}</label>
            <label className="upload-btn">
              {fileUrl ? t.btn_change : t.btn_import}
              <input type="file" accept=".stl" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="form-section">
            <label className="label-title">{t.section_tech}</label>
            <select className="select-input" value={techKey} onChange={(e) => handleTechChange(e.target.value)}>
              {Object.keys(printOptions).map(key => (
                <option key={key} value={key}>{printOptions[key].label}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label className="label-title">{t.section_mat}</label>
            <select className="select-input" value={materialKey} onChange={(e) => setMaterialKey(e.target.value)}>
              {printOptions[techKey].materials.map(mat => (
                <option key={mat.id} value={mat.id}>{mat.name}</option>
              ))}
            </select>
          </div>

          {techKey === "FDM" && (
            <div className="form-section">
              <label className="label-title">{t.section_infill}</label>
              <div className="infill-grid">
                {INFILL_PRESETS.map((val) => (
                  <button key={val} className={`infill-btn ${infill === val ? 'active' : ''}`} onClick={() => setInfill(val)}>
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="price-box">
            <div className="price-label">{t.est_cost}</div>
            <h2 className="price-value">
              {isComputing ? <span className="loader-dots">...</span> : (quote.price > 0 ? `${quote.price} €` : "-- €")}
            </h2>
            {quote.weight > 0 && (
              <div className="price-details">
                {t.weight}: {quote.weight} g<br/>
                {t.vol}: {Math.round(volume)} cm³
              </div>
            )}
            
            <button className="order-btn" disabled={!quote.price || isComputing} onClick={handleSaveToCart}>
              {t.btn_save}
            </button>
          </div>
        </aside>

        <main className="viewer-container">
          {!fileUrl && (
            <div className="empty-state">
              <h2>{t.empty_title}</h2>
              <p>{t.empty_desc}</p>
            </div>
          )}
          <Canvas shadows camera={{ position: [0, 0, 10], fov: 50 }}>
            <color attach="background" args={['#e0e0e0']} />
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
            <OrbitControls ref={controlsRef} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI} minDistance={10} maxDistance={400} />
          </Canvas>
        </main>
      </div>
    </div>
  );
}
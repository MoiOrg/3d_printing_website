import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, Center, useBounds } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { TRANSLATIONS } from '../translations';
import { MATERIAL_COLORS } from '../constants';
import '../App.css';

const INFILL_PRESETS = [20, 40, 60, 80];

// --- 3D Scene Components ---

function Model({ url, color }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

// Wrapper to center the model and fit it within the camera view automatically
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
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];
  const controlsRef = useRef(null);

  // --- State ---
  const [fileUrl, setFileUrl] = useState(null);
  const [fileObject, setFileObject] = useState(null);
  
  // Configuration State
  const [techKey, setTechKey] = useState("FDM");
  const [materialKey, setMaterialKey] = useState("PLA");
  const [infill, setInfill] = useState(20);
  
  // Pricing & Metrics
  const [volume, setVolume] = useState(null);
  const [quote, setQuote] = useState({price: 0, weight: 0 });
  const [isComputing, setIsComputing] = useState(false);

  // --- Derived Options ---
  const printOptions = useMemo(() => {
    return {
      FDM: {
        label: t.tech_fdm,
        materials: [
          { id: "PLA", name: t.mat_pla, color: MATERIAL_COLORS.PLA },
          { id: "PETG", name: t.mat_petg, color: MATERIAL_COLORS.PETG },
          { id: "ABS", name: t.mat_abs, color: MATERIAL_COLORS.ABS },
          { id: "TPU", name: t.mat_tpu, color: MATERIAL_COLORS.TPU }
        ]
      },
      RESIN: {
        label: t.tech_resin,
        materials: [
          { id: "RESIN_STD", name: t.mat_res_std, color: MATERIAL_COLORS.RESIN_STD },
          { id: "RESIN_TOUGH", name: t.mat_res_tough, color: MATERIAL_COLORS.RESIN_TOUGH }
        ]
      },
      SLS: {
        label: t.tech_sls,
        materials: [
          { id: "NYLON_PA12", name: t.mat_pa12, color: MATERIAL_COLORS.NYLON_PA12 },
          { id: "NYLON_GLASS", name: t.mat_glass, color: MATERIAL_COLORS.NYLON_GLASS }
        ]
      }
    };
  }, [lang, t]);

  // Update material default when switching technology
  const handleTechChange = (newTech) => {
    setTechKey(newTech);
    const defaultMat = printOptions[newTech].materials[0].id;
    setMaterialKey(defaultMat);
  };

  const currentMaterialColor = useMemo(() => {
    const matObj = printOptions[techKey].materials.find(m => m.id === materialKey);
    return matObj ? matObj.color : "#ffffff";
  }, [techKey, materialKey, printOptions]);

  // --- Handlers ---

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset state for new file
    setFileObject(file);
    setFileUrl(URL.createObjectURL(file));
    setVolume(null);
    setQuote({ price: 0, weight: 0 }); 
    setIsComputing(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Analyze file on server to get volume
      const response = await fetch("https://threed-printing-website-xq1q.onrender.com/analyze-file", {
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
      console.error("Upload error:", error);
      setIsComputing(false);
    }
  };

  // Recalculate price whenever configuration or volume changes
  useEffect(() => {
    if (volume !== null) {
      const fetchPrice = async () => {
        if (!isComputing) setIsComputing(true); 
        try {
          const response = await fetch("https://threed-printing-website-xq1q.onrender.com/calculate-price", {
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
      // Debounce slightly to prevent rapid firing
      const timeoutId = setTimeout(fetchPrice, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [volume, materialKey, infill, techKey]);

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
      const res = await fetch("https://threed-printing-website-xq1q.onrender.com/cart/add", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        navigate("/dashboard");
      } else {
        alert("Error saving to cart");
      }
    } catch (e) {
      console.error(e);
      alert("Network error");
    }
  };

  return (
    <div className="editor-layout"> 
      {/* Configuration Sidebar */}
      <aside className="sidebar">
        <div style={{ marginBottom: '20px' }}>
             <h2>{t.config_title}</h2>
             <p style={{fontSize: '0.9rem', color: '#64748b'}}>Configure your manufacturing parameters below.</p>
        </div>

        <div className="form-group">
          <label className="form-label">{t.section_file}</label>
          <label className="btn btn-secondary" style={{display: 'block', textAlign:'center'}}>
            {fileUrl ? t.btn_change : t.btn_import}
            <input type="file" accept=".stl" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">{t.section_tech}</label>
          <select className="form-select" value={techKey} onChange={(e) => handleTechChange(e.target.value)}>
            {Object.keys(printOptions).map(key => (
              <option key={key} value={key}>{printOptions[key].label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{t.section_mat}</label>
          <select className="form-select" value={materialKey} onChange={(e) => setMaterialKey(e.target.value)}>
            {printOptions[techKey].materials.map(mat => (
              <option key={mat.id} value={mat.id}>{mat.name}</option>
            ))}
          </select>
        </div>

        {techKey === "FDM" && (
          <div className="form-group">
            <label className="form-label">{t.section_infill}</label>
            <div className="infill-options">
              {INFILL_PRESETS.map((val) => (
                <button key={val} className={`infill-btn ${infill === val ? 'active' : ''}`} onClick={() => setInfill(val)}>
                  {val}%
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="price-card">
          <div style={{fontSize: '0.9rem', color: '#64748b'}}>{t.est_cost}</div>
          <span className="price-tag">
            {isComputing ? "..." : (quote.price > 0 ? `${quote.price} €` : "-- €")}
          </span>
          {quote.weight > 0 && (
            <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '15px' }}>
              {t.weight}: {quote.weight} g | {t.vol}: {Math.round(volume)} cm³
            </div>
          )}
          
          <button className="btn btn-primary" style={{width: '100%'}} disabled={!quote.price || isComputing} onClick={handleSaveToCart}>
            {t.btn_save}
          </button>
        </div>
      </aside>

      {/* 3D Viewer Area */}
      <main className="viewer-container">
        {!fileUrl && (
            <div className="empty-state" style={{ 
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
                textAlign: 'center', pointerEvents: 'none', zIndex: 10 
            }}>
              <h2 style={{color: '#94a3b8'}}>{t.empty_title}</h2>
              <p style={{color: '#cbd5e1'}}>{t.empty_desc}</p>
            </div>
          )}
          <Canvas shadows camera={{ position: [0, 0, 10], fov: 50 }}>
             <color attach="background" args={['#f1f5f9']} />
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
  );
}
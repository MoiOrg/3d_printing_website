import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, Center, useBounds } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import './App.css';

// --- DICTIONNAIRE DE TRADUCTION ---
const TRANSLATIONS = {
  FR: {
    title: "🖨️ 3D Print Studio",
    projects: "Mes Projets",
    help: "Aide",
    config_title: "Configuration",
    section_file: "1. Fichier 3D",
    btn_change: "Changer de fichier",
    btn_import: "📂 Importer STL",
    section_tech: "2. Technologie",
    section_mat: "3. Matériau",
    section_infill: "4. Remplissage",
    est_cost: "Estimation du coût",
    weight: "Poids",
    vol: "Vol",
    calc: "Calcul...",
    order: "Lancer la production",
    empty_title: "Aucun modèle chargé",
    empty_desc: "Utilisez le panneau de gauche pour importer un fichier STL.",
    
    // Labels Technologies & Matériaux
    tech_fdm: "Dépôt de fil (FDM)",
    mat_pla: "PLA (Standard)",
    mat_petg: "PETG (Résistant)",
    mat_abs: "ABS (Technique)",
    mat_tpu: "TPU (Flexible)",
    
    tech_resin: "Résine (SLA/DLP)",
    mat_res_std: "Résine Standard",
    mat_res_tough: "Résine Tough",
    
    tech_sls: "Frittage de poudre (SLS)",
    mat_pa12: "Nylon PA12",
    mat_glass: "Nylon Chargé Verre"
  },
  EN: {
    title: "🖨️ 3D Print Studio",
    projects: "My Projects",
    help: "Help",
    config_title: "Configuration",
    section_file: "1. 3D File",
    btn_change: "Change file",
    btn_import: "📂 Import STL",
    section_tech: "2. Technology",
    section_mat: "3. Material",
    section_infill: "4. Infill",
    est_cost: "Cost Estimate",
    weight: "Weight",
    vol: "Vol",
    calc: "Calculating...",
    order: "Start Production",
    empty_title: "No model loaded",
    empty_desc: "Use the left panel to import an STL file.",
    
    tech_fdm: "FDM (Filament)",
    mat_pla: "PLA (Standard)",
    mat_petg: "PETG (Durable)",
    mat_abs: "ABS (Technical)",
    mat_tpu: "TPU (Flexible)",
    
    tech_resin: "Resin (SLA/DLP)",
    mat_res_std: "Standard Resin",
    mat_res_tough: "Tough Resin",
    
    tech_sls: "SLS (Powder)",
    mat_pa12: "Nylon PA12",
    mat_glass: "Glass-Filled Nylon"
  },
  CN: {
    title: "🖨️ 3D打印工作室",
    projects: "我的项目",
    help: "帮助",
    config_title: "配置",
    section_file: "1. 3D文件",
    btn_change: "更换文件",
    btn_import: "📂 导入 STL",
    section_tech: "2.Fn工艺技术",
    section_mat: "3. 材料",
    section_infill: "4. 填充率",
    est_cost: "预估费用",
    weight: "重量",
    vol: "体积",
    calc: "计算中...",
    order: "开始生产",
    empty_title: "未加载模型",
    empty_desc: "请使用左侧面板导入 STL 文件。",
    
    tech_fdm: "熔融沉积 (FDM)",
    mat_pla: "PLA (标准)",
    mat_petg: "PETG (耐用)",
    mat_abs: "ABS (工程)",
    mat_tpu: "TPU (柔性)",
    
    tech_resin: "光固化 (SLA/DLP)",
    mat_res_std: "标准树脂",
    mat_res_tough: "韧性树脂",
    
    tech_sls: "激光烧结 (SLS)",
    mat_pa12: "尼龙 PA12",
    mat_glass: "玻纤尼龙"
  }
};

const INFILL_PRESETS = [20, 40, 60, 80];

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

const ModelWithAutoFit = React.memo(function ModelWithAutoFit({ url, color }) {
  const bounds = useBounds();
  const handleCentered = () => {
    bounds.refresh().fit();
  };

  return (
    <Center onCentered={handleCentered}>
      <Model url={url} color={color} />
    </Center>
  );
});

function App() {
  // État de l'application
  const [fileUrl, setFileUrl] = useState(null);
  
  // État de la langue (FR par défaut)
  const [lang, setLang] = useState('FR');
  
  // Sélection
  const [techKey, setTechKey] = useState("FDM");
  const [materialKey, setMaterialKey] = useState("PLA");
  const [infill, setInfill] = useState(20);
  
  // Résultats
  const [volume, setVolume] = useState(null);
  const [quote, setQuote] = useState({ price: 0, weight: 0 });
  const [isComputing, setIsComputing] = useState(false);

  // Référence pour les contrôles de la caméra
  const controlsRef = useRef(null);

  // Helper pour récupérer le texte courant
  const t = TRANSLATIONS[lang];

  // Construction dynamique des options d'impression selon la langue
  const printOptions = useMemo(() => {
    return {
      FDM: {
        label: t.tech_fdm,
        materials: [
          { id: "PLA", name: t.mat_pla, color: "#FF8C00" }, // Orange
          { id: "PETG", name: t.mat_petg, color: "#32CD32" }, // Vert
          { id: "ABS", name: t.mat_abs, color: "#DC143C" }, // Rouge
          { id: "TPU", name: t.mat_tpu, color: "#1E90FF" }  // Bleu
        ]
      },
      RESIN: {
        label: t.tech_resin,
        materials: [
          { id: "RESINE_STD", name: t.mat_res_std, color: "#808080" }, // Gris
          { id: "RESINE_TOUGH", name: t.mat_res_tough, color: "#00CED1" } // Cyan foncé
        ]
      },
      SLS: {
        label: t.tech_sls,
        materials: [
          { id: "NYLON_PA12", name: t.mat_pa12, color: "#E3E3E3" }, // Gris clair
          { id: "NYLON_GLASS", name: t.mat_glass, color: "#F9F9F9" } // Blanc
        ]
      }
    };
  }, [lang, t]);

  // 1. GESTION DU CHANGEMENT DE TECHNOLOGIE
  const handleTechChange = (newTech) => {
    setTechKey(newTech);
    // On utilise printOptions calculé dynamiquement
    const defaultMat = printOptions[newTech].materials[0].id;
    setMaterialKey(defaultMat);
  };

  // Récupération de la couleur actuelle basée sur le matériau sélectionné
  const currentMaterialColor = useMemo(() => {
    const matObj = printOptions[techKey].materials.find(m => m.id === materialKey);
    return matObj ? matObj.color : "#ffffff";
  }, [techKey, materialKey, printOptions]);

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
      
      const timeoutId = setTimeout(fetchPrice, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [volume, materialKey, infill, techKey]);

  // FONCTION DE ZOOM MANUEL
  const handleZoom = (direction) => {
    if (controlsRef.current) {
      const zoomFactor = 1.2;
      if (direction > 0) {
        // Zoom In
        controlsRef.current.dollyIn(zoomFactor);
      } else {
        // Zoom Out
        controlsRef.current.dollyOut(zoomFactor);
      }
      controlsRef.current.update();
    }
  };

  return (
    <div className="app-layout">
      {/* --- HEADER --- */}
      <header className="navbar">
        <div className="navbar-brand">{t.title}</div>
        <div className="navbar-actions">
          <button className="nav-btn">{t.projects}</button>
          <button className="nav-btn">{t.help}</button>
          <div className="lang-select">
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="FR">🇫🇷 FR</option>
              <option value="EN">🇬🇧 EN</option>
              <option value="CN">🇨🇳 CN</option>
            </select>
          </div>
        </div>
      </header>

      <div className="main-content">
        {/* --- SIDEBAR --- */}
        <aside className="sidebar">
          <div className="sidebar-header">
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
            <select 
              className="select-input" 
              value={techKey} 
              onChange={(e) => handleTechChange(e.target.value)}
            >
              {Object.keys(printOptions).map(key => (
                <option key={key} value={key}>{printOptions[key].label}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label className="label-title">{t.section_mat}</label>
            <select 
              className="select-input" 
              value={materialKey} 
              onChange={(e) => setMaterialKey(e.target.value)}
            >
              {printOptions[techKey].materials.map(mat => (
                <option key={mat.id} value={mat.id}>{mat.name}</option>
              ))}
            </select>
          </div>

          {/* Affichage conditionnel pour le Filaire (FDM) uniquement */}
          {techKey === "FDM" && (
            <div className="form-section">
              <label className="label-title">{t.section_infill}</label>
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
            
            <button className="order-btn" disabled={!quote.price || isComputing}>
              {isComputing ? t.calc : t.order}
            </button>
          </div>
        </aside>

        {/* --- VIEWER --- */}
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
                <Bounds key={fileUrl} margin={2.0}>
                  <ModelWithAutoFit url={fileUrl} color={currentMaterialColor} />
                </Bounds>
              )}
            </Suspense>
            <OrbitControls ref={controlsRef} makeDefault minPolarAngle={0} maxPolarAngle={Math.PI} minDistance={10} maxDistance={400} />
          </Canvas>

          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => handleZoom(-1)} aria-label="Zoom avant">+</button>
            <button className="zoom-btn" onClick={() => handleZoom(1)} aria-label="Zoom arrière">-</button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Bounds, Center, useBounds } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { useLoader, useThree } from '@react-three/fiber';
import './App.css';

function Model({ url, color }) {
	const geometry = useLoader(STLLoader, url);
	return (
	<mesh geometry={geometry} castShadow receiveShadow>
		<meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
	</mesh>
	);
}

function ResetCamera({ url }) {
  const { controls } = useThree();
  const bounds = useBounds();

  useEffect(() => {
    const timer = setTimeout(() => {
        if (bounds && controls) {
			
			controls.reset();
			
            bounds.refresh().clip().fit();

            // controls.target.set(0, 0, 0);

            // controls.update();

        }
    }, 80);

    return () => clearTimeout(timer);
  }, [url, bounds, controls]);

  return null;
}

function App() {
	const [fileUrl, setFileUrl] = useState(null);
	const [material, setMaterial] = useState('PLA');
	const [infill, setInfill] = useState(20);
	const [color, setColor] = useState('#1e90ff');
	
	const [volume, setVolume] = useState(null);
	const [quote, setQuote] = useState({ price: 0, weight: 0 });
	const [isComputing, setIsComputing] = useState(false);

	const colors = ['#1e90ff', '#ff4500', '#28a745', '#333333', '#f0f0f0'];

	// 1. GESTION DE L'UPLOAD (On récupère juste le volume)
	const handleFileUpload = async (event) => {
	const file = event.target.files[0];
	if (!file) return;

	setFileUrl(URL.createObjectURL(file));
	setIsComputing(true);
	setQuote({ price: 0, weight: 0 }); // Reset visuel

	const formData = new FormData();
	formData.append("file", file);

	try {
		// Appel Route 1 : Analyse
		const response = await fetch("http://localhost:8000/analyze-file", {
		method: "POST",
		body: formData,
		});
		if (response.ok) {
		const data = await response.json();
		setVolume(data.volume_cm3); // On sauvegarde le volume !
		}
	} catch (error) {
		console.error("Erreur upload:", error);
	} finally {
		setIsComputing(false);
	}
	};

	// 2. EFFET SECONDAIRE : RECALCUL AUTOMATIQUE
	// Se déclenche à chaque fois que 'volume', 'material' ou 'infill' change
	useEffect(() => {
	if (volume !== null) {
		const fetchPrice = async () => {
		setIsComputing(true);
		try {
			// Appel Route 2 : Calcul léger
			const response = await fetch("http://localhost:8000/calculate-price", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				volume_cm3: volume,
				material: material,
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

		fetchPrice();
	}
	}, [volume, material, infill]); // <--- Les dépendances qui déclenchent le recalcul

	return (
	<div className="app-container">
		<aside className="sidebar">
		<div className="sidebar-header">
			<h1>3D Print Studio</h1>
			<p>Configurez votre impression</p>
		</div>

		<div className="form-section">
			<label className="label-title">1. Fichier 3D (.stl)</label>
			<label className="upload-btn">
			{fileUrl ? "Changer de fichier" : "📂 Importer un fichier STL"}
			<input type="file" accept=".stl" onChange={handleFileUpload} style={{ display: 'none' }} />
			</label>
		</div>

		<div className="form-section">
			<label className="label-title">2. Matériau</label>
			<select className="select-input" value={material} onChange={(e) => setMaterial(e.target.value)}>
			<option value="PLA">PLA (Standard)</option>
			<option value="PETG">PETG (Résistant)</option>
			<option value="ABS">ABS (Technique)</option>
			<option value="TPU">TPU (Flexible)</option>
			</select>
		</div>

		<div className="form-section">
			<label className="label-title">3. Couleur</label>
			<div className="color-picker">
			 {colors.map((c) => (
				 <div key={c} onClick={() => setColor(c)} style={{ background: c }}
				className={`color-swatch ${color === c ? 'active' : 'inactive'}`} />
			 ))}
			</div>
		</div>

		<div className="form-section">
			<label className="label-title">4. Remplissage: {infill}%</label>
			<input 
			type="range" min="10" max="100" step="5" 
			value={infill} onChange={(e) => setInfill(e.target.value)} 
			className="range-input"
			/>
		</div>

		<div className="price-box">
			<div className="price-label">Estimation du coût</div>
			<h2 className="price-value">
			{isComputing ? "..." : (quote.price > 0 ? `${quote.price} €` : "-- €")}
			</h2>
			{quote.weight > 0 && (
			<div style={{fontSize: '0.8rem', color: '#666', marginTop: '5px'}}>
				Poids estimé: {quote.weight} g<br/>
				(Vol: {Math.round(volume)} cm³)
			</div>
			)}
			
			<button className="order-btn" disabled={!quote.price || isComputing}>
			Lancer la production
			</button>
		</div>
		</aside>

		<main className="viewer-container">
		{!fileUrl && (
			<div className="empty-state">
			<h2>Aucun modèle chargé</h2>
			<p>Utilisez le panneau de gauche pour importer un fichier STL.</p>
			</div>
		)}

		<Canvas shadows camera={{ position: [50, 50, 50], fov: 50 }}>
			<color attach="background" args={['#f5f5f7']} />
			<ambientLight intensity={0.7} />
			<spotLight position={[50, 50, 50]} angle={0.25} penumbra={1} castShadow intensity={1} />
			<Environment preset="city" />
			<Suspense fallback={null}>
			{fileUrl && (
				<Bounds key={fileUrl} margin={1.0}>
					<Center>
						<Model url={fileUrl} color={color} />
					</Center>
					<ResetCamera url={fileUrl} />
				</Bounds>
			)}
			</Suspense>
			<OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI} target={[0, 0, 0]} />
		</Canvas>
		</main>
	</div>
	);
}

export default App;
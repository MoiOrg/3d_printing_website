from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from stl import mesh
import tempfile
import os

app = FastAPI()

# --- CONFIGURATION ---
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base de données des matériaux
# Density en g/cm3, Price en €/g
MATERIALS_DB = {
    "PLA":  {"density": 1.24, "price": 0.05},
    "PETG": {"density": 1.27, "price": 0.06},
    "ABS":  {"density": 1.04, "price": 0.055},
    "TPU":  {"density": 1.21, "price": 0.08},
}

MARGIN = 2.00 # Frais fixes

# Modèle de données pour la requête de calcul
class QuoteRequest(BaseModel):
    volume_cm3: float
    material: str
    infill: int

# --- FONCTION DE CALCUL (Partagée) ---
def compute_price(volume_cm3, material_name, infill_percent):
    if material_name not in MATERIALS_DB:
        return None
    
    mat_info = MATERIALS_DB[material_name]
    
    # Estimation simplifiée du volume réel (Coque + Remplissage)
    # On suppose que 20% de la pièce est 100% pleine (murs) et le reste dépend de l'infill
    shell_ratio = 0.20
    effective_volume = (volume_cm3 * shell_ratio) + (volume_cm3 * (1 - shell_ratio) * (infill_percent / 100))
    
    weight_g = effective_volume * mat_info["density"]
    price = (weight_g * mat_info["price"]) + MARGIN
    
    return round(price, 2), round(weight_g, 2)

# --- ROUTE 1 : UPLOAD (Analyse géométrique) ---
@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".stl") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        # Calcul du volume brut
        my_mesh = mesh.Mesh.from_file(tmp_path)
        volume, _, _ = my_mesh.get_mass_properties()
        volume_cm3 = volume / 1000 
        
        return {"volume_cm3": volume_cm3}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.remove(tmp_path)

# --- ROUTE 2 : CALCULATE (Prix dynamique) ---
@app.post("/calculate-price")
def calculate_price_endpoint(req: QuoteRequest):
    result = compute_price(req.volume_cm3, req.material, req.infill)
    if not result:
        raise HTTPException(status_code=400, detail="Matériau inconnu")
    
    price, weight = result
    return {"price": price, "weight_g": weight}
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

# Base de données des matériaux étendue
# Les clés doivent correspondre à ce que le frontend envoie
MATERIALS_DB = {
    # Filaire (FDM)
    "PLA":  {"density": 1.24, "price": 0.05},
    "PETG": {"density": 1.27, "price": 0.06},
    "ABS":  {"density": 1.04, "price": 0.055},
    "TPU":  {"density": 1.21, "price": 0.08},
    
    # Résine (SLA/DLP)
    "RESINE_STD":   {"density": 1.12, "price": 0.12},
    "RESINE_TOUGH": {"density": 1.18, "price": 0.15},
    
    # Poudre (SLS)
    "NYLON_PA12":   {"density": 0.95, "price": 0.18},
    "NYLON_GLASS":  {"density": 1.10, "price": 0.22},
}

MARGIN = 2.00 # Frais fixes

class QuoteRequest(BaseModel):
    volume_cm3: float
    material: str
    infill: int

# --- FONCTION DE CALCUL ---
def compute_price(volume_cm3, material_name, infill_percent):
    if material_name not in MATERIALS_DB:
        return None
    
    mat_info = MATERIALS_DB[material_name]
    
    # Estimation simplifiée
    shell_ratio = 0.20
    effective_volume = (volume_cm3 * shell_ratio) + (volume_cm3 * (1 - shell_ratio) * (infill_percent / 100))
    
    weight_g = effective_volume * mat_info["density"]
    price = (weight_g * mat_info["price"]) + MARGIN
    
    return round(price, 2), round(weight_g, 2)

# --- ROUTES ---
@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".stl") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        my_mesh = mesh.Mesh.from_file(tmp_path)
        volume, _, _ = my_mesh.get_mass_properties()
        volume_cm3 = volume / 1000 
        return {"volume_cm3": volume_cm3}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/calculate-price")
def calculate_price_endpoint(req: QuoteRequest):
    result = compute_price(req.volume_cm3, req.material, req.infill)
    if not result:
        # On renvoie une erreur 404 ou 400 si le matériau n'est pas trouvé
        raise HTTPException(status_code=400, detail=f"Matériau inconnu: {req.material}")
    
    price, weight = result
    return {"price": price, "weight_g": weight}
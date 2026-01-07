from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from stl import mesh
import tempfile
import os
import shutil
import json
import uuid
import glob
from datetime import datetime

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

# Dossiers de stockage
DATA_DIR = "data"
CART_DIR = os.path.join(DATA_DIR, "cart")
PROD_DIR = os.path.join(DATA_DIR, "production")

for d in [CART_DIR, PROD_DIR]:
    os.makedirs(d, exist_ok=True)

# Base de données Matériaux (inchangée)
MATERIALS_DB = {
    "PLA":  {"density": 1.24, "price": 0.05},
    "PETG": {"density": 1.27, "price": 0.06},
    "ABS":  {"density": 1.04, "price": 0.055},
    "TPU":  {"density": 1.21, "price": 0.08},
    "RESINE_STD":   {"density": 1.12, "price": 0.12},
    "RESINE_TOUGH": {"density": 1.18, "price": 0.15},
    "NYLON_PA12":   {"density": 0.95, "price": 0.18},
    "NYLON_GLASS":  {"density": 1.10, "price": 0.22},
}
MARGIN = 2.00 

class QuoteRequest(BaseModel):
    volume_cm3: float
    material: str
    infill: int

class UpdateQtyRequest(BaseModel):
    item_id: str
    quantity: int

# --- LOGIQUE MÉTIER ---

def compute_price_logic(volume_cm3, material_name, infill_percent):
    if material_name not in MATERIALS_DB:
        return None, None
    mat_info = MATERIALS_DB[material_name]
    shell_ratio = 0.20
    effective_volume = (volume_cm3 * shell_ratio) + (volume_cm3 * (1 - shell_ratio) * (infill_percent / 100))
    weight_g = effective_volume * mat_info["density"]
    price = (weight_g * mat_info["price"]) + MARGIN
    return round(price, 2), round(weight_g, 2)

# --- ROUTES ---

@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    # Analyse temporaire seulement
    with tempfile.NamedTemporaryFile(delete=False, suffix=".stl") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        my_mesh = mesh.Mesh.from_file(tmp_path)
        volume, _, _ = my_mesh.get_mass_properties()
        return {"volume_cm3": volume / 1000}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@app.post("/calculate-price")
def calculate_price_endpoint(req: QuoteRequest):
    price, weight = compute_price_logic(req.volume_cm3, req.material, req.infill)
    if price is None:
        raise HTTPException(status_code=400, detail="Matériau inconnu")
    return {"price": price, "weight_g": weight}

@app.post("/cart/add")
async def add_to_cart(
    file: UploadFile = File(...),
    config: str = Form(...) # On reçoit la config en JSON stringifié
):
    """Sauvegarde le fichier et sa config dans le dossier CART"""
    try:
        conf_dict = json.loads(config)
        item_id = str(uuid.uuid4())
        
        # 1. Sauvegarder le STL
        original_name = file.filename
        safe_name = f"{item_id}_{original_name}"
        file_path = os.path.join(CART_DIR, safe_name)
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
            
        # 2. Sauvegarder les métadonnées (JSON)
        meta_path = file_path + ".json"
        metadata = {
            "id": item_id,
            "filename": original_name,
            "filepath": file_path,
            "config": conf_dict, # contient material, infill, tech...
            "added_at": datetime.now().isoformat(),
            "quantity": 1
        }
        
        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=4)
            
        return {"status": "ok", "id": item_id}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cart")
def get_cart():
    """Liste tous les items dans le dossier CART"""
    items = []
    # CORRECTION : On cherche tous les fichiers .json, peu importe la casse ou l'extension précédente
    json_files = glob.glob(os.path.join(CART_DIR, "*.json"))
    
    for jf in json_files:
        try:
            with open(jf, "r") as f:
                data = json.load(f)
                # On ajoute une sécurité : on vérifie que c'est bien un fichier créé par nous
                if "id" in data and "config" in data:
                    items.append(data)
        except:
            continue
    
    # Optionnel : Trier pour afficher les plus récents en premier
    items.sort(key=lambda x: x.get("added_at", ""), reverse=True)
    
    return items

@app.post("/cart/update-qty")
def update_qty(req: UpdateQtyRequest):
    # Trouver le fichier JSON correspondant
    json_files = glob.glob(os.path.join(CART_DIR, f"{req.item_id}_*.json"))
    if not json_files:
        raise HTTPException(status_code=404, detail="Item not found")
    
    target_file = json_files[0]
    with open(target_file, "r") as f:
        data = json.load(f)
    
    data["quantity"] = req.quantity
    if data["quantity"] < 1:
        data["quantity"] = 1
        
    with open(target_file, "w") as f:
        json.dump(data, f, indent=4)
        
    return {"status": "updated"}

@app.post("/cart/delete")
def delete_item(req: UpdateQtyRequest): # On réutilise le modèle juste pour l'ID
    # Trouver les fichiers (STL et JSON)
    json_files = glob.glob(os.path.join(CART_DIR, f"{req.item_id}_*.json"))
    if not json_files:
        return {"status": "not found"}
    
    json_path = json_files[0]
    stl_path = json_path.replace(".json", "") # Retirer le .json pour avoir le STL
    
    if os.path.exists(json_path): os.remove(json_path)
    if os.path.exists(stl_path): os.remove(stl_path)
    
    return {"status": "deleted"}

@app.post("/production/launch")
def launch_production():
    """Déplace tout le contenu du CART vers un dossier PRODUCTION daté avec un résumé"""
    items = get_cart()
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")
        
    # Création du dossier daté
    batch_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    batch_dir = os.path.join(PROD_DIR, batch_id)
    os.makedirs(batch_dir, exist_ok=True)
    
    moved_count = 0
    total_parts = 0
    
    # Préparation du contenu du fichier texte de résumé
    summary_lines = []
    summary_lines.append(f"=== ORDRE DE PRODUCTION : {batch_id} ===\n")
    summary_lines.append(f"Date : {datetime.now().strftime('%d/%m/%Y à %H:%M')}\n")
    summary_lines.append("="*50 + "\n\n")

    # Traitement de chaque pièce
    for index, item in enumerate(items, 1):
        # 1. Déplacement des fichiers (STL + JSON)
        src_json = item["filepath"] + ".json"
        src_stl = item["filepath"]
        
        dst_json = os.path.join(batch_dir, os.path.basename(src_json))
        dst_stl = os.path.join(batch_dir, os.path.basename(src_stl))
        
        if os.path.exists(src_json): shutil.move(src_json, dst_json)
        if os.path.exists(src_stl): shutil.move(src_stl, dst_stl)
        
        moved_count += 1
        qty = item.get("quantity", 1)
        total_parts += qty
        
        # 2. Ajout des infos dans le résumé texte
        config = item.get("config", {})
        
        summary_lines.append(f"PIÈCE #{index} : {item['filename']}\n")
        summary_lines.append(f"   [x{qty}] QUANTITÉ À IMPRIMER\n")
        summary_lines.append(f"   -----------------------------\n")
        summary_lines.append(f"   Technologie : {config.get('tech', 'N/A')}\n")
        summary_lines.append(f"   Matériau    : {config.get('material', 'N/A')}\n")
        # On affiche l'infill seulement pour le FDM
        if config.get('tech') == 'FDM':
            summary_lines.append(f"   Remplissage : {config.get('infill', 0)}%\n")
        
        summary_lines.append(f"   ID Fichier  : {item['id']}\n")
        summary_lines.append("\n" + "-"*30 + "\n\n")

    # Pied de page du résumé
    summary_lines.append("="*50 + "\n")
    summary_lines.append(f"TOTAL PIÈCES À PRODUIRE : {total_parts}\n")
    summary_lines.append("="*50 + "\n")

    # Écriture du fichier MANIFESTE.txt
    summary_path = os.path.join(batch_dir, "MANIFESTE_PRODUCTION.txt")
    with open(summary_path, "w", encoding="utf-8") as f:
        f.writelines(summary_lines)
        
    return {"status": "launched", "batch_id": batch_id, "count": moved_count}
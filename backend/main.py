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

# Storage directories
DATA_DIR = "data"
CART_DIR = os.path.join(DATA_DIR, "cart")
PROD_DIR = os.path.join(DATA_DIR, "production")

for d in [CART_DIR, PROD_DIR]:
    os.makedirs(d, exist_ok=True)

# Materials Database
MATERIALS_DB = {
    "PLA":  {"density": 1.24, "price": 0.05},
    "PETG": {"density": 1.27, "price": 0.06},
    "ABS":  {"density": 1.04, "price": 0.055},
    "TPU":  {"density": 1.21, "price": 0.08},
    "RESIN_STD":   {"density": 1.12, "price": 0.12},
    "RESIN_TOUGH": {"density": 1.18, "price": 0.15},
    "NYLON_PA12":  {"density": 0.95, "price": 0.18},
    "NYLON_GLASS": {"density": 1.10, "price": 0.22},
}
MARGIN = 2.00 

class QuoteRequest(BaseModel):
    volume_cm3: float
    material: str
    infill: int

class UpdateQtyRequest(BaseModel):
    item_id: str
    quantity: int

# --- BUSINESS LOGIC ---

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
    # Temporary analysis only
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
        raise HTTPException(status_code=400, detail="Unknown material")
    return {"price": price, "weight_g": weight}

@app.post("/cart/add")
async def add_to_cart(
    file: UploadFile = File(...),
    config: str = Form(...) # We receive the config as stringified JSON
):
    """Save the file and its config in the CART folder"""
    try:
        conf_dict = json.loads(config)
        item_id = str(uuid.uuid4())
        
        # 1. Save the STL
        original_name = file.filename
        safe_name = f"{item_id}_{original_name}"
        file_path = os.path.join(CART_DIR, safe_name)
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
            
        # 2. Save metadata (JSON)
        meta_path = file_path + ".json"
        metadata = {
            "id": item_id,
            "filename": original_name,
            "filepath": file_path,
            "config": conf_dict, # contains material, infill, tech...
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
    """List all items in the CART folder"""
    items = []
    # Look for all .json files in the cart directory
    json_files = glob.glob(os.path.join(CART_DIR, "*.json"))
    
    for jf in json_files:
        try:
            with open(jf, "r") as f:
                data = json.load(f)
                # Security check: verify it's a file created by us
                if "id" in data and "config" in data:
                    items.append(data)
        except:
            continue
    
    # Optional: Sort to show newest first
    items.sort(key=lambda x: x.get("added_at", ""), reverse=True)
    
    return items

@app.post("/cart/update-qty")
def update_qty(req: UpdateQtyRequest):
    # Find the corresponding JSON file
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
def delete_item(req: UpdateQtyRequest): # Reusing model just for ID
    # Find files (STL and JSON)
    json_files = glob.glob(os.path.join(CART_DIR, f"{req.item_id}_*.json"))
    if not json_files:
        return {"status": "not found"}
    
    json_path = json_files[0]
    stl_path = json_path.replace(".json", "") # Remove .json to get STL
    
    if os.path.exists(json_path): os.remove(json_path)
    if os.path.exists(stl_path): os.remove(stl_path)
    
    return {"status": "deleted"}

@app.post("/production/launch")
def launch_production():
    """Move all CART content to a dated PRODUCTION folder with a summary"""
    items = get_cart()
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")
        
    # Create dated folder
    batch_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    batch_dir = os.path.join(PROD_DIR, batch_id)
    os.makedirs(batch_dir, exist_ok=True)
    
    moved_count = 0
    total_parts = 0
    
    # Prepare summary text file content
    summary_lines = []
    summary_lines.append(f"=== PRODUCTION ORDER : {batch_id} ===\n")
    summary_lines.append(f"Date : {datetime.now().strftime('%Y-%m-%d at %H:%M')}\n")
    summary_lines.append("="*50 + "\n\n")

    # Process each part
    for index, item in enumerate(items, 1):
        # 1. Move files (STL + JSON)
        src_json = item["filepath"] + ".json"
        src_stl = item["filepath"]
        
        dst_json = os.path.join(batch_dir, os.path.basename(src_json))
        dst_stl = os.path.join(batch_dir, os.path.basename(src_stl))
        
        if os.path.exists(src_json): shutil.move(src_json, dst_json)
        if os.path.exists(src_stl): shutil.move(src_stl, dst_stl)
        
        moved_count += 1
        qty = item.get("quantity", 1)
        total_parts += qty
        
        # 2. Add info to summary text
        config = item.get("config", {})
        
        summary_lines.append(f"PART #{index} : {item['filename']}\n")
        summary_lines.append(f"   [x{qty}] QUANTITY TO PRINT\n")
        summary_lines.append(f"   -----------------------------\n")
        summary_lines.append(f"   Technology : {config.get('tech', 'N/A')}\n")
        summary_lines.append(f"   Material   : {config.get('material', 'N/A')}\n")
        # Display infill only for FDM
        if config.get('tech') == 'FDM':
            summary_lines.append(f"   Infill     : {config.get('infill', 0)}%\n")
        
        summary_lines.append(f"   File ID    : {item['id']}\n")
        summary_lines.append("\n" + "-"*30 + "\n\n")

    # Footer of summary
    summary_lines.append("="*50 + "\n")
    summary_lines.append(f"TOTAL PARTS TO PRODUCE : {total_parts}\n")
    summary_lines.append("="*50 + "\n")

    # Write MANIFEST file
    summary_path = os.path.join(batch_dir, "PRODUCTION_MANIFEST.txt")
    with open(summary_path, "w", encoding="utf-8") as f:
        f.writelines(summary_lines)
        
    return {"status": "launched", "batch_id": batch_id, "count": moved_count}

@app.get("/admin/batches")
def list_production_batches():
    """List batches with a status indicator"""
    if not os.path.exists(PROD_DIR):
        return []
    
    batches = []
    for name in os.listdir(PROD_DIR):
        full_path = os.path.join(PROD_DIR, name)
        if os.path.isdir(full_path):
            # Calculate global status of the batch
            total = 0
            done = 0
            json_files = glob.glob(os.path.join(full_path, "*.json"))
            for jf in json_files:
                try:
                    with open(jf, "r") as f:
                        data = json.load(f)
                        total += 1
                        if data.get("status") == "done":
                            done += 1
                except: pass
            
            status = "Pending"
            if total > 0 and total == done:
                status = "Completed"
            elif done > 0:
                status = "In Progress"

            batches.append({
                "id": name,
                "status": status,
                "progress": f"{done}/{total}"
            })
            
    batches.sort(key=lambda x: x["id"], reverse=True)
    return batches

@app.get("/admin/batch/{batch_id}")
def get_batch_details(batch_id: str):
    """Return manifest details AND the list of files with their status"""
    safe_id = os.path.basename(batch_id)
    target_dir = os.path.join(PROD_DIR, safe_id)
    
    # 1. Text Content (Manifest)
    manifest_path = os.path.join(target_dir, "PRODUCTION_MANIFEST.txt")
    manifest_content = ""
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest_content = f.read()
            
    # 2. Item List
    items = []
    json_files = glob.glob(os.path.join(target_dir, "*.json"))
    for jf in json_files:
        try:
            with open(jf, "r") as f:
                data = json.load(f)
                items.append({
                    "filename": data.get("filename"),
                    "status": data.get("status", "Pending")
                })
        except: pass

    return {
        "content": manifest_content,
        "items": items
    }
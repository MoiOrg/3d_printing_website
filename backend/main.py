from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

# --- Configuration & Setup ---
# origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
# origins = ["https://threed-printing-website-xq1q.onrender.com"]
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define and create storage directories
DATA_DIR = "data"
CART_DIR = os.path.join(DATA_DIR, "cart")
PROD_DIR = os.path.join(DATA_DIR, "production")

for d in [CART_DIR, PROD_DIR]:
    os.makedirs(d, exist_ok=True)

# Mount static files for frontend access to STLs
app.mount("/files", StaticFiles(directory=DATA_DIR), name="files")

# --- Business Data ---
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

# --- Helper Functions ---

def compute_price_logic(volume_cm3, material_name, infill_percent):
    """
    Calculates the estimated price and weight based on volume, material density, 
    and infill percentage. Includes a fixed margin.
    """
    if material_name not in MATERIALS_DB:
        return None, None
    mat_info = MATERIALS_DB[material_name]
    
    # Estimate effective volume based on shell vs infill ratio
    shell_ratio = 0.20
    effective_volume = (volume_cm3 * shell_ratio) + (volume_cm3 * (1 - shell_ratio) * (infill_percent / 100))
    
    weight_g = effective_volume * mat_info["density"]
    price = (weight_g * mat_info["price"]) + MARGIN
    
    return round(price, 2), round(weight_g, 2)

# --- API Routes ---

@app.post("/analyze-file")
async def analyze_file(file: UploadFile = File(...)):
    """
    Analyzes an uploaded STL file to extract volume.
    Uses a temporary file to process the mesh safely.
    """
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
async def add_to_cart(file: UploadFile = File(...), config: str = Form(...)):
    """
    Saves an STL file and its configuration JSON to the cart directory.
    """
    try:
        conf_dict = json.loads(config)
        item_id = str(uuid.uuid4())
        
        # Save STL with unique ID
        original_name = file.filename
        safe_name = f"{item_id}_{original_name}"
        file_path = os.path.join(CART_DIR, safe_name)
        
        with open(file_path, "wb") as f:
            f.write(await file.read())
            
        # Save Metadata
        meta_path = file_path + ".json"
        metadata = {
            "id": item_id,
            "filename": original_name,
            "filepath": file_path,
            "config": conf_dict, 
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
    """Retrieves all items currently in the cart, sorted by date."""
    items = []
    json_files = glob.glob(os.path.join(CART_DIR, "*.json"))
    
    for jf in json_files:
        try:
            with open(jf, "r") as f:
                data = json.load(f)
                if "id" in data and "config" in data:
                    items.append(data)
        except:
            continue
    
    items.sort(key=lambda x: x.get("added_at", ""), reverse=True)
    return items

@app.post("/cart/update-qty")
def update_qty(req: UpdateQtyRequest):
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
def delete_item(req: UpdateQtyRequest):
    json_files = glob.glob(os.path.join(CART_DIR, f"{req.item_id}_*.json"))
    if not json_files:
        return {"status": "not found"}
    
    json_path = json_files[0]
    stl_path = json_path.replace(".json", "") 
    
    if os.path.exists(json_path): os.remove(json_path)
    if os.path.exists(stl_path): os.remove(stl_path)
    
    return {"status": "deleted"}

@app.post("/production/launch")
def launch_production():
    """
    Moves all items from Cart to a new Production Batch.
    Generates a MANIFEST.txt summary for the admin.
    """
    items = get_cart()
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")
        
    batch_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    batch_dir = os.path.join(PROD_DIR, batch_id)
    os.makedirs(batch_dir, exist_ok=True)
    
    moved_count = 0
    total_parts = 0
    
    # Initialize Manifest Content
    summary_lines = []
    summary_lines.append(f"=== PRODUCTION ORDER : {batch_id} ===\n")
    summary_lines.append(f"Date : {datetime.now().strftime('%Y-%m-%d at %H:%M')}\n")
    summary_lines.append("="*50 + "\n\n")

    for index, item in enumerate(items, 1):
        src_json = item["filepath"] + ".json"
        src_stl = item["filepath"]
        
        dst_json = os.path.join(batch_dir, os.path.basename(src_json))
        dst_stl = os.path.join(batch_dir, os.path.basename(src_stl))
        
        # Move files
        if os.path.exists(src_json): shutil.move(src_json, dst_json)
        if os.path.exists(src_stl): shutil.move(src_stl, dst_stl)
        
        moved_count += 1
        qty = item.get("quantity", 1)
        total_parts += qty
        
        # Add item details to manifest
        config = item.get("config", {})
        summary_lines.append(f"PART #{index} : {item['filename']}\n")
        summary_lines.append(f"   [x{qty}] QUANTITY TO PRINT\n")
        summary_lines.append(f"   -----------------------------\n")
        summary_lines.append(f"   Technology : {config.get('tech', 'N/A')}\n")
        summary_lines.append(f"   Material   : {config.get('material', 'N/A')}\n")
        if config.get('tech') == 'FDM':
            summary_lines.append(f"   Infill     : {config.get('infill', 0)}%\n")
        
        summary_lines.append(f"   File ID    : {item['id']}\n")
        summary_lines.append("\n" + "-"*30 + "\n\n")

    summary_lines.append("="*50 + "\n")
    summary_lines.append(f"TOTAL PARTS TO PRODUCE : {total_parts}\n")
    summary_lines.append("="*50 + "\n")

    # Write Manifest
    summary_path = os.path.join(batch_dir, "PRODUCTION_MANIFEST.txt")
    with open(summary_path, "w", encoding="utf-8") as f:
        f.writelines(summary_lines)
        
    return {"status": "launched", "batch_id": batch_id, "count": moved_count}

@app.get("/admin/batches")
def list_production_batches():
    if not os.path.exists(PROD_DIR):
        return []
    
    batches = []
    for name in os.listdir(PROD_DIR):
        full_path = os.path.join(PROD_DIR, name)
        if os.path.isdir(full_path):
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
    """
    Returns the full text manifest and a list of items for the specified batch.
    Used for the Admin detail view.
    """
    safe_id = os.path.basename(batch_id)
    target_dir = os.path.join(PROD_DIR, safe_id)
    
    manifest_path = os.path.join(target_dir, "PRODUCTION_MANIFEST.txt")
    manifest_content = ""
    if os.path.exists(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest_content = f.read()
            
    items = []
    json_files = glob.glob(os.path.join(target_dir, "*.json"))
    for jf in json_files:
        try:
            with open(jf, "r") as f:
                data = json.load(f)
                stl_filename = os.path.basename(jf).replace(".json", "")
                
                items.append({
                    "id": data.get("id"),
                    "filename": data.get("filename"),
                    "status": data.get("status", "Pending"),
                    "config": data.get("config", {}),
                    "quantity": data.get("quantity", 1),
                    "stl_disk_name": stl_filename
                })
        except: pass

    return {
        "content": manifest_content,
        "items": items
    }
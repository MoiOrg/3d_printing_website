import tkinter as tk
from tkinter import ttk, messagebox
import os
import json
import sys
import platform
import subprocess
from datetime import datetime

# Path configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PROD_DIR = os.path.join(DATA_DIR, "production")

SLICER_PATH = "/home/kiparis/Bureau/Bambu_Studio_ubuntu-22.04_PR-8834.AppImage"

class ProductionManagerApp:
    """
    GUI Application to manage production batches and visualize part details.
    """
    def __init__(self, root):
        self.root = root
        self.root.title("Production Factory Interface")
        self.root.geometry("1100x700")
        
        # Dictionary to map tree item IDs to file paths
        self.part_map = {} 
        
        # Styles
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.style.configure("Treeview", rowheight=25, font=('Segoe UI', 10))
        self.style.configure("Treeview.Heading", font=('Segoe UI', 10, 'bold'))
        self.style.configure("TLabel", font=('Segoe UI', 10))
        self.style.configure("TButton", font=('Segoe UI', 10))
        self.style.configure("Header.TLabel", font=('Segoe UI', 14, 'bold'))

        # Main Layout
        main_frame = ttk.Frame(root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Header
        header = ttk.Label(main_frame, text="Production Dashboard", style="Header.TLabel")
        header.pack(pady=(0, 10), anchor="w")

        # Paned Window (Split View)
        self.paned = ttk.PanedWindow(main_frame, orient=tk.HORIZONTAL)
        self.paned.pack(fill=tk.BOTH, expand=True)

        # --- LEFT PANEL: BATCHES ---
        left_frame = ttk.Frame(self.paned, padding=(0, 0, 10, 0))
        self.paned.add(left_frame, weight=1)
        
        ttk.Label(left_frame, text="Production Batches").pack(anchor="w", pady=(0, 5))
        
        self.batch_tree = ttk.Treeview(left_frame, columns=("Date", "Status"), show="headings")
        self.batch_tree.heading("Date", text="Batch ID / Date")
        self.batch_tree.heading("Status", text="Status")
        self.batch_tree.column("Date", width=180)
        self.batch_tree.column("Status", width=80)
        self.batch_tree.pack(fill=tk.BOTH, expand=True)
        self.batch_tree.bind("<<TreeviewSelect>>", self.on_batch_select)
        
        refresh_btn = ttk.Button(left_frame, text="Refresh List", command=self.load_batches)
        refresh_btn.pack(pady=5, fill=tk.X)

        # --- RIGHT PANEL: PARTS & DETAILS ---
        right_frame = ttk.Frame(self.paned)
        self.paned.add(right_frame, weight=3)

        # Top Right: Part List
        ttk.Label(right_frame, text="Parts in Batch").pack(anchor="w", pady=(0, 5))
        
        self.part_tree = ttk.Treeview(right_frame, columns=("File", "Tech", "Material", "Qty", "State"), show="headings", height=8)
        self.part_tree.heading("File", text="Filename")
        self.part_tree.heading("Tech", text="Technology")
        self.part_tree.heading("Material", text="Material")
        self.part_tree.heading("Qty", text="Qty")
        self.part_tree.heading("State", text="Production State")
        
        self.part_tree.column("File", width=200)
        self.part_tree.column("Tech", width=80)
        self.part_tree.column("Material", width=100)
        self.part_tree.column("Qty", width=50)
        self.part_tree.column("State", width=100)
        
        self.part_tree.pack(fill=tk.BOTH, expand=True)
        self.part_tree.bind("<<TreeviewSelect>>", self.on_part_select)

        # Bottom Right: Details Action Area
        details_frame = ttk.LabelFrame(right_frame, text="Part Details & Actions", padding="15")
        details_frame.pack(fill=tk.X, pady=(10, 0))

        # Details Grid
        self.lbl_filename = ttk.Label(details_frame, text="File: -", font=('Segoe UI', 10, 'bold'))
        self.lbl_filename.grid(row=0, column=0, columnspan=2, sticky="w", pady=5)

        ttk.Label(details_frame, text="Infill:").grid(row=1, column=0, sticky="w")
        self.lbl_infill = ttk.Label(details_frame, text="-")
        self.lbl_infill.grid(row=1, column=1, sticky="w", padx=10)

        ttk.Label(details_frame, text="Volume:").grid(row=2, column=0, sticky="w")
        self.lbl_volume = ttk.Label(details_frame, text="-")
        self.lbl_volume.grid(row=2, column=1, sticky="w", padx=10)

        # Actions Buttons
        btn_frame = ttk.Frame(details_frame)
        btn_frame.grid(row=0, column=2, rowspan=3, padx=20, sticky="e")

        self.btn_open_stl = ttk.Button(btn_frame, text="Open 3D Model", command=self.open_stl_file, state=tk.DISABLED)
        self.btn_open_stl.pack(fill=tk.X, pady=2)

        self.btn_mark_done = ttk.Button(btn_frame, text="Mark as PRODUCED", command=self.mark_as_done, state=tk.DISABLED)
        self.btn_mark_done.pack(fill=tk.X, pady=2)

        # Initialization
        self.selected_batch_dir = None
        self.selected_part_data = None
        self.load_batches()

    def load_batches(self):
        # Clear list
        for item in self.batch_tree.get_children():
            self.batch_tree.delete(item)
            
        if not os.path.exists(PROD_DIR):
            try:
                os.makedirs(PROD_DIR, exist_ok=True)
            except OSError:
                pass 

        if not os.path.exists(PROD_DIR):
             return

        # List directories
        batches = [d for d in os.listdir(PROD_DIR) if os.path.isdir(os.path.join(PROD_DIR, d))]
        batches.sort(reverse=True) # Newest first

        for batch in batches:
            # Check if all items are done to determine batch status
            status = self.get_batch_status(batch)
            self.batch_tree.insert("", tk.END, values=(batch, status))

    def get_batch_status(self, batch_id):
        batch_path = os.path.join(PROD_DIR, batch_id)
        json_files = [f for f in os.listdir(batch_path) if f.endswith(".json")]
        if not json_files: return "Empty"
        
        all_done = True
        for jf in json_files:
            try:
                with open(os.path.join(batch_path, jf), 'r') as f:
                    data = json.load(f)
                    if data.get('status') != 'done':
                        all_done = False
                        break
            except:
                all_done = False
        
        return "Completed" if all_done else "Pending"

    def on_batch_select(self, event):
        selected_item = self.batch_tree.selection()
        if not selected_item: return
        
        batch_id = self.batch_tree.item(selected_item[0])['values'][0]
        self.selected_batch_dir = os.path.join(PROD_DIR, batch_id)
        self.load_parts(self.selected_batch_dir)

    def load_parts(self, batch_path):
        for item in self.part_tree.get_children():
            self.part_tree.delete(item)
        
        self.reset_details()
        self.part_map = {} # Reset the map
        
        if not os.path.exists(batch_path): return

        # Load all JSONs in the folder
        files = [f for f in os.listdir(batch_path) if f.endswith(".json")]
        files.sort()

        for f in files:
            full_path = os.path.join(batch_path, f)
            try:
                with open(full_path, 'r') as json_file:
                    data = json.load(json_file)
                    
                    config = data.get('config', {})
                    status = data.get('status', 'Pending')
                    
                    item_id = self.part_tree.insert("", tk.END, values=(
                        data.get('filename', 'Unknown'),
                        config.get('tech', 'N/A'),
                        config.get('material', 'N/A'),
                        data.get('quantity', 1),
                        status
                    ), tags=(status,))
                    
                    # Store the path in the dictionary
                    self.part_map[item_id] = full_path
                    
            except Exception as e:
                print(f"Error loading {f}: {e}")

        self.part_tree.tag_configure('Pending', foreground='black')
        self.part_tree.tag_configure('done', foreground='green')

    def on_part_select(self, event):
        selected_item = self.part_tree.selection()
        if not selected_item: return
        
        item_id = selected_item[0]
        
        # Retrieve path from dictionary
        full_path = self.part_map.get(item_id)
        
        if not full_path: return
        
        try:
            with open(full_path, 'r') as jf:
                d = json.load(jf)
                self.selected_part_data = d
                self.selected_part_data['json_path'] = full_path
                self.display_details(d)
        except Exception as e:
            print(f"Error reading part details: {e}")

    def display_details(self, data):
        self.lbl_filename.config(text=f"File: {data.get('filename')}")
        conf = data.get('config', {})
        self.lbl_infill.config(text=f"{conf.get('infill', 'N/A')}%")
        self.lbl_volume.config(text=f"{round(conf.get('volume', 0), 2)} cm3")
        
        self.btn_open_stl.config(state=tk.NORMAL)
        
        if data.get('status') == 'done':
            self.btn_mark_done.config(text="Already Produced", state=tk.DISABLED)
        else:
            self.btn_mark_done.config(text="Mark as PRODUCED", state=tk.NORMAL)

    def reset_details(self):
        self.lbl_filename.config(text="File: -")
        self.lbl_infill.config(text="-")
        self.lbl_volume.config(text="-")
        self.btn_open_stl.config(state=tk.DISABLED)
        self.btn_mark_done.config(state=tk.DISABLED)
        self.selected_part_data = None

    def open_stl_file(self):
        if not self.selected_part_data: return
        
        json_path = self.selected_part_data['json_path']
        # The STL is usually the same path without .json
        stl_path = json_path.replace(".json", "")
        
        if os.path.exists(stl_path):
            try:
                if platform.system() == 'Linux':
                    subprocess.Popen([SLICER_PATH, stl_path])
            except Exception as e:
                messagebox.showerror("Error", f"Could not open file: {e}")
        else:
            messagebox.showerror("Error", "STL file not found.\n" + stl_path)

    def mark_as_done(self):
        if not self.selected_part_data: return
        
        json_path = self.selected_part_data['json_path']
        
        # Update JSON
        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
            
            data['status'] = 'done'
            data['produced_at'] = datetime.now().isoformat()
            
            with open(json_path, 'w') as f:
                json.dump(data, f, indent=4)
            
            # Refresh UI
            self.load_batches()
            
            # Restore selection (reload parts and clear selection details)
            self.load_parts(self.selected_batch_dir)
            self.reset_details()
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to update status: {e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = ProductionManagerApp(root)
    root.mainloop()
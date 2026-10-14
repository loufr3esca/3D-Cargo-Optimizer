"""
3D Multi-Vehicle Cargo Optimizer
Streamlit + Firebase Firestore + Plotly + FPDF2 + py3dbp Heuristics
Full 16:9 Widescreen Layout | Multi-Truck Simultaneous 3D Visualizer | Real Light & Dark Themes | 100% English
"""

import streamlit as st
from py3dbp import Packer, Bin, Item
import plotly.graph_objects as go
import pandas as pd
from decimal import Decimal
import json
import firebase_admin
from firebase_admin import credentials, firestore
import urllib.parse
import tempfile
import os

# --- PAGE CONFIGURATION ---
st.set_page_config(
    page_title="3D Cargo Optimizer",
    page_icon="📦",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- THEME MANAGEMENT ---
if 'theme_mode' not in st.session_state:
    st.session_state.theme_mode = "Dark"

is_light = (st.session_state.theme_mode == "Light")

# --- COMPREHENSIVE 16:9 & LIGHT/DARK CSS INJECTION ---
if is_light:
    theme_css = """
    <style>
    /* Full width 16:9 layout */
    .main .block-container {
        max-width: 98% !important;
        padding-top: 1rem !important;
        padding-bottom: 2rem !important;
        padding-left: 1.5rem !important;
        padding-right: 1.5rem !important;
    }
    
    /* Light Theme Base */
    .stApp, [data-testid="stAppViewContainer"], .main {
        background-color: #f8fafc !important;
        color: #0f172a !important;
    }
    
    header[data-testid="stHeader"] {
        background-color: #ffffff !important;
        border-bottom: 1px solid #e2e8f0 !important;
    }
    
    /* Typography in Light Mode */
    h1, h2, h3, h4, p, span, label, div[data-testid="stMarkdownContainer"] p {
        color: #0f172a !important;
    }
    .stCaption, small, .text-muted {
        color: #64748b !important;
    }
    
    /* Metrics Cards */
    div[data-testid="stMetric"] {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 0.75rem !important;
        padding: 0.75rem 1rem !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
    }
    div[data-testid="stMetricValue"] {
        color: #1e40af !important;
        font-weight: 800 !important;
    }
    div[data-testid="stMetricLabel"] {
        color: #475569 !important;
        font-weight: 600 !important;
    }
    
    /* Expanders & Forms */
    div[data-testid="stExpander"] {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 0.75rem !important;
    }
    
    /* Data Editor Full Width */
    div[data-testid="stDataFrame"], div[data-testid="stDataEditor"] {
        width: 100% !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 0.5rem !important;
    }
    </style>
    """
else:
    theme_css = """
    <style>
    /* Full width 16:9 layout */
    .main .block-container {
        max-width: 98% !important;
        padding-top: 1rem !important;
        padding-bottom: 2rem !important;
        padding-left: 1.5rem !important;
        padding-right: 1.5rem !important;
    }
    
    /* Dark Theme Base */
    .stApp, [data-testid="stAppViewContainer"], .main {
        background-color: #090d16 !important;
        color: #f1f5f9 !important;
    }
    
    header[data-testid="stHeader"] {
        background-color: #0f172a !important;
        border-bottom: 1px solid #1e293b !important;
    }
    
    /* Typography in Dark Mode */
    h1, h2, h3, h4, p, span, label, div[data-testid="stMarkdownContainer"] p {
        color: #f1f5f9 !important;
    }
    .stCaption, small, .text-muted {
        color: #94a3b8 !important;
    }
    
    /* Metrics Cards */
    div[data-testid="stMetric"] {
        background-color: #0f172a !important;
        border: 1px solid #1e293b !important;
        border-radius: 0.75rem !important;
        padding: 0.75rem 1rem !important;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3) !important;
    }
    div[data-testid="stMetricValue"] {
        color: #60a5fa !important;
        font-weight: 800 !important;
    }
    div[data-testid="stMetricLabel"] {
        color: #94a3b8 !important;
        font-weight: 600 !important;
    }
    
    /* Expanders & Forms */
    div[data-testid="stExpander"] {
        background-color: #0f172a !important;
        border: 1px solid #1e293b !important;
        border-radius: 0.75rem !important;
    }
    
    /* Data Editor Full Width */
    div[data-testid="stDataFrame"], div[data-testid="stDataEditor"] {
        width: 100% !important;
        border: 1px solid #1e293b !important;
        border-radius: 0.5rem !important;
    }
    </style>
    """

st.markdown(theme_css, unsafe_allow_html=True)

# --- FIREBASE FIRESTORE CONNECTION ---
FIREBASE_ENABLED = False
db = None

try:
    if not firebase_admin._apps:
        key_dict = None
        # 1. Check Streamlit Secrets (Standard on Streamlit Cloud)
        if "firebase_credentials" in st.secrets:
            raw_sec = st.secrets["firebase_credentials"]
            key_dict = json.loads(raw_sec) if isinstance(raw_sec, str) else raw_sec
        # 2. Check Environment Variable
        elif "FIREBASE_CREDENTIALS" in os.environ:
            key_dict = json.loads(os.environ["FIREBASE_CREDENTIALS"])
        # 3. Check local serviceAccountKey.json file if present locally
        elif os.path.exists("serviceAccountKey.json"):
            with open("serviceAccountKey.json") as f:
                key_dict = json.load(f)

        if key_dict:
            cred = credentials.Certificate(key_dict)
            firebase_admin.initialize_app(cred)
            db = firestore.client()
            FIREBASE_ENABLED = True
        else:
            FIREBASE_ENABLED = False
    else:
        db = firestore.client()
        FIREBASE_ENABLED = True
except Exception as e:
    FIREBASE_ENABLED = False

def load_library():
    """Load all products from the Firestore 'products' collection."""
    if not FIREBASE_ENABLED or db is None:
        return {}
    try:
        docs = db.collection('products').stream()
        return {doc.id: doc.to_dict() for doc in docs}
    except Exception:
        return {}

def save_library(library_data):
    """Save each product into the Firestore 'products' collection."""
    if not FIREBASE_ENABLED or db is None:
        return
    try:
        for key, value in library_data.items():
            db.collection('products').document(key).set(value)
    except Exception as e:
        st.error(f"Save error to Firestore: {e}")

def load_configs():
    """Load saved cargo mixes from Firestore 'configs' collection."""
    if not FIREBASE_ENABLED or db is None:
        return {}
    try:
        docs = db.collection('configs').stream()
        return {doc.id: doc.to_dict() for doc in docs}
    except Exception:
        return {}

def save_config(name, items):
    """Save a specific mix of cargo to Firestore."""
    if not FIREBASE_ENABLED or db is None:
        return
    try:
        db.collection('configs').document(name).set({"items": items})
    except Exception as e:
        st.error(f"Save configuration error: {e}")

# --- DEFAULT PRODUCT LIBRARY SEED ---
DEFAULT_LIBRARY_SEED = {
    "Euro Pallet (Standard)": {"Ref": "Euro Pallet (Standard)", "L": 120.0, "W": 80.0, "H": 140.0, "Weight": 450.0, "Rotation": "Auto (Horizontal)", "Stackable": "Yes"},
    "Half Pallet (Demi)": {"Ref": "Half Pallet (Demi)", "L": 80.0, "W": 60.0, "H": 110.0, "Weight": 220.0, "Rotation": "Auto (Horizontal)", "Stackable": "Yes"},
    "Heavy Industrial Crate": {"Ref": "Heavy Industrial Crate", "L": 100.0, "W": 100.0, "H": 90.0, "Weight": 700.0, "Rotation": "Strict: L -> Length", "Stackable": "No"},
    "Master Carton Box": {"Ref": "Master Carton Box", "L": 60.0, "W": 40.0, "H": 40.0, "Weight": 25.0, "Rotation": "Auto (All)", "Stackable": "Yes"},
}

# --- SESSION STATE INITIALIZATION ---
if 'product_lib' not in st.session_state:
    loaded = load_library()
    st.session_state.product_lib = loaded if loaded else DEFAULT_LIBRARY_SEED

if 'cargo_items' not in st.session_state:
    st.session_state.cargo_items = [
        {"Priority": 1, "Reference": "Euro Pallet (Standard)", "Quantity": 24, "Length": 120.0, "Width": 80.0, "Height": 140.0, "Weight": 450.0, "Rotation": "Auto (Horizontal)", "Stackable": "Yes", "Color": "#4363d8"},
        {"Priority": 2, "Reference": "Half Pallet (Demi)", "Quantity": 12, "Length": 80.0, "Width": 60.0, "Height": 110.0, "Weight": 220.0, "Rotation": "Auto (Horizontal)", "Stackable": "Yes", "Color": "#3cb44b"},
        {"Priority": 3, "Reference": "Heavy Industrial Crate", "Quantity": 4, "Length": 100.0, "Width": 100.0, "Height": 90.0, "Weight": 700.0, "Rotation": "Strict: L -> Length", "Stackable": "No", "Color": "#e6194b"}
    ]

if 'color_map' not in st.session_state:
    st.session_state.color_map = {
        "Euro Pallet (Standard)": "#4363d8",
        "Half Pallet (Demi)": "#3cb44b",
        "Heavy Industrial Crate": "#e6194b"
    }

if 'used_bins' not in st.session_state:
    st.session_state.used_bins = []

if 'optimization_done' not in st.session_state:
    st.session_state.optimization_done = False

if 'current_mix_name' not in st.session_state:
    st.session_state.current_mix_name = "Standard Logistics Project"

# --- RULES STATE ---
if 'rear_buffer_cm' not in st.session_state:
    st.session_state.rear_buffer_cm = 25.0
if 'enable_80cm_rule' not in st.session_state:
    st.session_state.enable_80cm_rule = True
if 'bonus_weight' not in st.session_state:
    st.session_state.bonus_weight = 50000.0
if 'enable_euro_grid' not in st.session_state:
    st.session_state.enable_euro_grid = True
if 'enable_gravity_slide' not in st.session_state:
    st.session_state.enable_gravity_slide = True
if 'enable_strict_collision' not in st.session_state:
    st.session_state.enable_strict_collision = True
if 'enable_overhead_protection' not in st.session_state:
    st.session_state.enable_overhead_protection = True

# --- URL PARAMETERS (SHARE LINK HANDLING) ---
if 'config' in st.query_params and not st.session_state.get('loaded_from_url'):
    config_name = st.query_params['config']
    configs = load_configs()
    if config_name in configs:
        st.session_state.cargo_items = configs[config_name]['items']
        for item in st.session_state.cargo_items:
            st.session_state.color_map[item['Reference']] = item.get('Color', '#333333')
        st.session_state.loaded_from_url = True
        st.session_state.current_mix_name = config_name
        st.toast(f"✅ Configuration '{config_name}' loaded from shared link!")

# --- CONTAINERS DATA ---
CONTAINERS = {
    "TIR (Semi-trailer)": {"L": 1360, "W": 245, "H": 270, "max_weight": 24000},
    "20FT Standard": {"L": 589, "W": 235, "H": 239, "max_weight": 28000},
    "40FT Standard": {"L": 1203, "W": 235, "H": 239, "max_weight": 28000},
    "40HQ (High Cube)": {"L": 1203, "W": 235, "H": 269, "max_weight": 28000}
}

DISTINCT_COLORS = [
    '#4363d8', '#3cb44b', '#e6194b', '#f58231', '#911eb4',
    '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080',
    '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3'
]

# --- CUSTOM CLASSES & LOGISTICS ENGINE ---
class CustomItem(Item):
    def __init__(self, name, width, height, depth, weight, allowed_rotations, stackable):
        super().__init__(name, width, height, depth, weight)
        self.allowed_rotations = allowed_rotations 
        self.stackable = stackable                 

    def get_dimension(self):
        current_rotation = getattr(self, 'rotation_type', 0)
        if current_rotation not in self.allowed_rotations:
            return (Decimal('999999'), Decimal('999999'), Decimal('999999'))
        return super().get_dimension()

def custom_pack_item_to_bin(bin_obj, item, rules):
    pivots = set([(Decimal('0'), Decimal('0'), Decimal('0'))])
    for p in bin_obj.items:
        w, h, d = p.get_dimension()
        px, py, pz = p.position
        pivots.update([(px+w, py, pz), (px, py+h, pz), (px, py, pz+d)])
        for q in bin_obj.items:
            if p != q:
                qw, qh, qd = q.get_dimension()
                qx, qy, qz = q.position
                pivots.update([(px+w, qy, pz), (px, qy+qh, pz), (qx, py+h, pz), (qx+qw, py+h, pz)])

    valid_pivots = [p for p in pivots if p[0] < bin_obj.width and p[1] < bin_obj.height and p[2] < bin_obj.depth]
    sorted_pivots = sorted(valid_pivots, key=lambda p: (p[2], p[0], p[1]))

    best_score, best_pivot, best_rot = -float('inf'), None, None

    for pivot in sorted_pivots:
        for rot in item.allowed_rotations:
            item.rotation_type = rot
            w, h, d = item.get_dimension()
            
            if bin_obj.width < pivot[0] + w or bin_obj.height < pivot[1] + h or bin_obj.depth < pivot[2] + d:
                continue
            if sum(i.weight for i in bin_obj.items) + item.weight > bin_obj.max_weight:
                continue

            collision = False
            for p_item in bin_obj.items:
                pw, ph, pd = p_item.get_dimension()
                px, py, pz = p_item.position
                
                if not (pivot[0] >= px+pw or pivot[0]+w <= px or 
                        pivot[1] >= py+ph or pivot[1]+h <= py or 
                        pivot[2] >= pz+pd or pivot[2]+d <= pz):
                    collision = True
                    break
                
                if rules.get('enable_overhead_protection', True):
                    if getattr(p_item, 'stackable', True) is False and pivot[2] >= pz+pd:
                        if not (pivot[0] >= px+pw or pivot[0]+w <= px or pivot[1] >= py+ph or pivot[1]+h <= py):
                            collision = True
                            break
                            
            if not collision:
                score = 0.0
                if pivot[0] == 0: score += float(h * d)
                if pivot[1] == 0: score += float(w * d)
                if pivot[2] == 0: score += float(w * h)
                if pivot[0] + w == bin_obj.width: score += float(h * d)
                if pivot[1] + h == bin_obj.height: score += float(w * d)
                if pivot[2] + d == bin_obj.depth: score += float(w * h)
                
                for p_item in bin_obj.items:
                    pw, ph, pd = p_item.get_dimension()
                    px, py, pz = p_item.position
                    if pivot[0] == px+pw or pivot[0]+w == px:
                        oy = min(pivot[1]+h, py+ph) - max(pivot[1], py)
                        oz = min(pivot[2]+d, pz+pd) - max(pivot[2], pz)
                        if oy > 0 and oz > 0: score += float(oy * oz) * 2.0
                    if pivot[1] == py+ph or pivot[1]+h == py:
                        ox = min(pivot[0]+w, px+pw) - max(pivot[0], px)
                        oz = min(pivot[2]+d, pz+pd) - max(pivot[2], pz)
                        if ox > 0 and oz > 0: score += float(ox * oz) * 2.0
                    if pivot[2] == pz+pd or pivot[2]+d == pz:
                        ox = min(pivot[0]+w, px+pw) - max(pivot[0], px)
                        oy = min(pivot[1]+h, py+ph) - max(pivot[1], py)
                        if ox > 0 and oy > 0: score += float(ox * oy) * 2.0

                score -= (float(pivot[0]) * 0.2 + float(pivot[1]) * 0.1 + float(pivot[2]) * 0.1)
                
                if rules.get('enable_80cm_rule', True):
                    bonus_val = float(rules.get('bonus_weight', 50000.0))
                    if abs(float(h) - 80.0) <= 2.0 and float(bin_obj.height) >= 240.0:
                        score += bonus_val 

                rear_buffer = float(rules.get('rear_buffer_cm', 25.0))
                if rear_buffer > 0.0:
                    danger_zone = float(bin_obj.width) - rear_buffer
                    if float(pivot[0] + w) > danger_zone:
                        score -= float(pivot[0] + w) * 10000.0
                
                if score > best_score:
                    best_score, best_pivot, best_rot = score, pivot, rot
                    
    if best_pivot is not None:
        item.rotation_type = best_rot
        item.position = best_pivot
        bin_obj.items.append(item)
        return True
    return False

def get_optimal_europallet_slots(container_name):
    slots = []
    if "20FT" in container_name:
        for i in range(7):
            slots.append({'x': i * 80, 'y': 0, 'w': 80, 'h': 120, 'filled': False})
        for i in range(4):
            slots.append({'x': i * 120, 'y': 120, 'w': 120, 'h': 80, 'filled': False})
    elif "40FT" in container_name or "40HQ" in container_name:
        for i in range(15):
            slots.append({'x': i * 80, 'y': 0, 'w': 80, 'h': 120, 'filled': False})
        for i in range(10):
            slots.append({'x': i * 120, 'y': 120, 'w': 120, 'h': 80, 'filled': False})
    elif "TIR" in container_name:
        for i in range(11):
            for j in range(3):
                slots.append({'x': i * 120, 'y': j * 80, 'w': 120, 'h': 80, 'filled': False})
    return slots

def pack_with_rules(bin_obj, item, euro_slots, rules):
    l, w = float(item.width), float(item.height)
    is_europallet = (abs(l - 120) <= 2 and abs(w - 80) <= 2) or (abs(l - 80) <= 2 and abs(w - 120) <= 2)
    
    if is_europallet and rules.get('enable_euro_grid', True) and euro_slots:
        for slot in euro_slots:
            if not slot['filled']:
                if sum(i.weight for i in bin_obj.items) + item.weight > bin_obj.max_weight:
                    continue 
                if float(item.depth) > float(bin_obj.depth):
                    continue
                assigned = False
                for rot in item.allowed_rotations:
                    item.rotation_type = rot
                    d = item.get_dimension()
                    if abs(float(d[0]) - slot['w']) <= 2 and abs(float(d[1]) - slot['h']) <= 2:
                        
                        collision = False
                        p0, p1, p2 = Decimal(str(slot['x'])), Decimal(str(slot['y'])), Decimal('0')
                        w_d, h_d, d_d = d
                        
                        if rules.get('enable_strict_collision', True):
                            for p_item in bin_obj.items:
                                pw, ph, pd = p_item.get_dimension()
                                px, py, pz = p_item.position
                                if not (p0 >= px+pw or p0+w_d <= px or 
                                        p1 >= py+ph or p1+h_d <= py or 
                                        p2 >= pz+pd or p2+d_d <= pz):
                                    collision = True
                                    break
                                    
                                if rules.get('enable_overhead_protection', True) and getattr(p_item, 'stackable', True) is False and p2 >= pz+pd:
                                    if not (p0 >= px+pw or p0+w_d <= px or p1 >= py+ph or p1+h_d <= py):
                                        collision = True
                                        break
                        
                        if not collision:
                            if rules.get('enable_gravity_slide', True):
                                min_x = Decimal('0')
                                for p_item in bin_obj.items:
                                    pw, ph, pd = p_item.get_dimension()
                                    px, py, pz = p_item.position
                                    if not (p1 >= py+ph or p1+h_d <= py or p2 >= pz+pd or p2+d_d <= pz):
                                        if px + pw <= p0:
                                            min_x = max(min_x, px + pw)
                                p0 = min_x

                            item.position = (p0, p1, p2)
                            bin_obj.items.append(item)
                            assigned = True
                            slot['filled'] = True
                            break
                if assigned:
                    return True

    return custom_pack_item_to_bin(bin_obj, item, rules)

# --- 3D VISUALIZATION ENGINE (Plotly) ---
def plot_3d_packing(container_dim, fitted_items, color_map, title, is_light_theme=False):
    fig = go.Figure()
    cx, cy, cz = container_dim

    # Container Outline Frame
    x_lines = [0, cx, cx, 0, 0, None, 0, cx, cx, 0, 0, None, 0, 0, None, cx, cx, None, cx, cx, None, 0, 0]
    y_lines = [0, 0, cy, cy, 0, None, 0, 0, cy, cy, 0, None, 0, 0, None, 0, 0, None, cy, cy, None, cy, cy]
    z_lines = [0, 0, 0, 0, 0, None, cz, cz, cz, cz, cz, None, 0, cz, None, 0, cz, None, 0, cz, None, 0, cz]
    
    frame_color = '#475569' if is_light_theme else '#94a3b8'
    fig.add_trace(go.Scatter3d(
        x=x_lines, y=y_lines, z=z_lines,
        mode='lines',
        line=dict(color=frame_color, width=3),
        name="Container Frame",
        hoverinfo='skip'
    ))

    all_x_edges, all_y_edges, all_z_edges = [], [], []
    
    max_x_occupied = 0.0
    if fitted_items:
        max_x_occupied = max([float(item.position[0]) + float(item.get_dimension()[0]) for item in fitted_items])
    remaining_x = max(0.0, cx - max_x_occupied)

    legend_added = set()

    for item in fitted_items:
        ref_name = item.name.split(" #")[0]
        color = color_map.get(ref_name, '#333333')
        x, y, z = map(float, item.position)
        w, h, d = map(float, item.get_dimension())

        x_coords = [x, x+w, x+w, x, x, x+w, x+w, x]
        y_coords = [y, y, y+h, y+h, y, y, y+h, y+h]
        z_coords = [z, z, z, z, z+d, z+d, z+d, z+d]
        i_faces = [0, 0, 4, 4, 0, 0, 3, 3, 0, 0, 1, 1]
        j_faces = [1, 2, 5, 6, 1, 5, 2, 6, 3, 7, 2, 6]
        k_faces = [2, 3, 6, 7, 5, 4, 6, 7, 7, 4, 6, 5]

        emp_status = "✅ Stackable" if getattr(item, 'stackable', True) else "❌ Non-Stackable"
        hovertext = (
            f"<b>{item.name}</b><br>"
            f"📦 Dimensions: {w:.1f} x {h:.1f} x {d:.1f} cm<br>"
            f"⚖️ Weight: {float(item.weight):.1f} kg<br>"
            f"📍 Position: X={x:.1f}, Y={y:.1f}, Z={z:.1f}<br>"
            f"🔄 Stackability: {emp_status}"
        )

        show_leg = ref_name not in legend_added
        if show_leg:
            legend_added.add(ref_name)

        fig.add_trace(go.Mesh3d(
            x=x_coords, y=y_coords, z=z_coords,
            i=i_faces, j=j_faces, k=k_faces,
            color=color, opacity=0.96, flatshading=True,
            name=ref_name, hoverinfo="text", text=hovertext,
            showscale=False, showlegend=show_leg,
            legendgroup=ref_name
        ))

        all_x_edges.extend([x, x+w, x+w, x, x, None, x, x+w, x+w, x, x, None, x, x, None, x+w, x+w, None, x+w, x+w, None, x, x, None])
        all_y_edges.extend([y, y, y+h, y+h, y, None, y, y, y+h, y+h, y, None, y, y, None, y, y, None, y+h, y+h, None, y+h, y+h, None])
        all_z_edges.extend([z, z, z, z, z, None, z+d, z+d, z+d, z+d, z+d, None, z, z+d, None, z, z+d, None, z, z+d, None, z, z+d, None])

    if all_x_edges:
        fig.add_trace(go.Scatter3d(
            x=all_x_edges, y=all_y_edges, z=all_z_edges,
            mode='lines',
            line=dict(color='#0f172a' if is_light_theme else '#000000', width=3),
            hoverinfo='skip',
            showlegend=False
        ))

    # Floating Measurement Lines
    if max_x_occupied > 0:
        z_float = cz * 1.06
        fig.add_trace(go.Scatter3d(
            x=[0, max_x_occupied], y=[0, 0], z=[z_float, z_float],
            mode='lines',
            line=dict(color='#2563eb', width=5),
            name="Used Length",
            hoverinfo='skip'
        ))
        fig.add_trace(go.Scatter3d(
            x=[max_x_occupied / 2.0], y=[0], z=[z_float * 1.03],
            mode='text',
            text=[f"Used: {max_x_occupied:.1f} cm"],
            textposition="top center",
            textfont=dict(color='#2563eb', size=13, family='Arial Black'),
            hoverinfo='skip',
            showlegend=False
        ))
        
        if remaining_x > 0:
            fig.add_trace(go.Scatter3d(
                x=[max_x_occupied, cx], y=[0, 0], z=[z_float, z_float],
                mode='lines',
                line=dict(color='#16a34a', width=5, dash='dash'),
                name="Remaining Space",
                hoverinfo='skip'
            ))
            fig.add_trace(go.Scatter3d(
                x=[max_x_occupied + remaining_x / 2.0], y=[0], z=[z_float * 1.03],
                mode='text',
                text=[f"Remaining: {remaining_x:.1f} cm"],
                textposition="top center",
                textfont=dict(color='#16a34a', size=13, family='Arial Black'),
                hoverinfo='skip',
                showlegend=False
            ))

    bg_color = "#ffffff" if is_light_theme else "#0f172a"
    grid_color = "#f1f5f9" if is_light_theme else "#1e293b"
    font_color = "#0f172a" if is_light_theme else "#f8fafc"

    fig.update_layout(
        title=dict(text=title, font=dict(size=18, family="Arial", color=font_color)),
        template="plotly_white" if is_light_theme else "plotly_dark",
        paper_bgcolor=bg_color,
        plot_bgcolor=bg_color,
        scene=dict(
            xaxis=dict(title='Length X (cm)', range=[0, cx * 1.05], backgroundcolor=grid_color), 
            yaxis=dict(title='Width Y (cm)', range=[0, cy * 1.1], backgroundcolor=grid_color), 
            zaxis=dict(title='Height Z (cm)', range=[0, cz * 1.3], backgroundcolor=grid_color), 
            aspectmode='data', 
            camera=dict(
                eye=dict(x=1.65, y=1.65, z=1.35),
                center=dict(x=0, y=0, z=-0.1)
            )
        ), 
        margin=dict(l=0, r=0, b=0, t=40), 
        legend=dict(
            title=dict(text="<b>Cargo References</b>", font=dict(color=font_color)),
            font=dict(color=font_color),
            yanchor="top", y=0.98,
            xanchor="left", x=1.02,
            bgcolor="rgba(255,255,255,0.95)" if is_light_theme else "rgba(15,23,42,0.95)",
            bordercolor="#cbd5e1" if is_light_theme else "#334155",
            borderwidth=1
        )
    )
    return fig

# --- LANDSCAPE PDF REPORT GENERATOR ---
def generate_pdf_report(cargo_items, used_bins, container_props, project_name="Untitled Project", uploaded_images=None):
    try:
        from fpdf import FPDF
    except ImportError:
        st.error("⚠️ The PDF Export feature requires 'fpdf2'. Please install it: pip install fpdf2")
        return None
    
    pdf = FPDF(orientation="L", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    
    pdf.add_page()
    pdf.set_font("Helvetica", style='B', size=18)
    safe_title = f"3D Cargo Optimization Report - {project_name}".encode('latin-1', 'replace').decode('latin-1')
    pdf.cell(277, 12, txt=safe_title, ln=True, align='C')
    pdf.ln(2)

    pdf.set_font("Helvetica", size=10)
    total_packages = sum(int(item.get('Quantity', 0)) for item in cargo_items)
    total_weight = sum(int(item.get('Quantity', 0)) * float(item.get('Weight', 0)) for item in cargo_items)
    pdf.cell(277, 6, txt=f"Total Units: {total_packages} | Total Weight: {total_weight:,.1f} kg | Fleet Deployed: {len(used_bins)} vehicle(s)", ln=True, align='C')
    pdf.ln(4)
    
    pdf.set_font("Helvetica", style='B', size=12)
    pdf.cell(277, 8, txt="Cargo Manifest Table:", ln=True)
    pdf.ln(1)
    
    pdf.set_font("Helvetica", style='B', size=9)
    pdf.set_fill_color(230, 230, 230)
    pdf.set_text_color(20, 20, 20)
    
    headers = [
        ("Prio", 12), ("Qty", 12), ("Reference", 115), 
        ("L (cm)", 18), ("W (cm)", 18), ("H (cm)", 18), 
        ("Wgt (kg)", 20), ("Rotation", 40), ("Stack", 15)
    ]
    
    for head, w in headers:
        pdf.cell(w, 8, txt=head, border=1, fill=True, align='C')
    pdf.ln()

    pdf.set_font("Helvetica", size=8)
    sorted_items = sorted(cargo_items, key=lambda x: int(x.get("Priority", 999)))
    
    for item in sorted_items:
        pdf.cell(12, 7, txt=str(item.get('Priority', '')), border=1, align='C')
        pdf.cell(12, 7, txt=str(item.get('Quantity', '')), border=1, align='C')
        
        safe_ref = str(item.get('Reference', ''))[:55].encode('latin-1', 'replace').decode('latin-1')
        pdf.cell(115, 7, txt=safe_ref, border=1, align='L')
        
        pdf.cell(18, 7, txt=f"{float(item.get('Length', 0)):.1f}", border=1, align='C')
        pdf.cell(18, 7, txt=f"{float(item.get('Width', 0)):.1f}", border=1, align='C')
        pdf.cell(18, 7, txt=f"{float(item.get('Height', 0)):.1f}", border=1, align='C')
        pdf.cell(20, 7, txt=f"{float(item.get('Weight', 0)):.1f}", border=1, align='C')
        
        rot = str(item.get('Rotation', ''))
        rot = rot.replace("Auto (Horizontal)", "Auto(H)").replace("Strict: L -> Length", "L->Length").replace("Strict: W -> Length", "W->Length")
        pdf.cell(40, 7, txt=rot, border=1, align='C')
        
        pdf.cell(15, 7, txt=str(item.get('Stackable', 'Yes')), border=1, align='C')
        pdf.ln()
        
    pdf.ln(6)

    for idx, b in enumerate(used_bins):
        pdf.add_page()
        pdf.set_font("Helvetica", style='B', size=14)
        safe_bin_name = f"Vehicle #{idx+1}: {b.name}".encode('latin-1', 'replace').decode('latin-1')
        pdf.cell(277, 10, txt=safe_bin_name, ln=True)

        total_vol = float(b.width * b.height * b.depth)
        used_vol = sum([float(i.width * i.height * i.depth) for i in b.items])
        fill_rate = (used_vol / total_vol) * 100.0 if total_vol > 0 else 0.0
        used_weight = sum([float(i.weight) for i in b.items])
        max_x = max([float(i.position[0]) + float(i.get_dimension()[0]) for i in b.items]) if b.items else 0.0
        rem_x = float(b.width) - max_x

        pdf.set_font("Helvetica", size=10)
        summary_text = (
            f"Volume Fill Rate: {fill_rate:.1f}% | "
            f"Cargo Count: {len(b.items)} units | "
            f"Total Weight: {used_weight:,.1f} kg / {float(b.max_weight):,.1f} kg | "
            f"Used Length: {max_x:.1f} cm | Remaining Space: {rem_x:.1f} cm"
        )
        pdf.cell(277, 7, txt=summary_text, ln=True)
        pdf.ln(3)

        if uploaded_images and idx < len(uploaded_images):
            img_file = uploaded_images[idx]
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmpfile:
                tmpfile.write(img_file.getvalue())
                tmpfile.flush()
                pdf.image(tmpfile.name, x=10, y=36, w=270)
        else:
            pdf.set_font("Helvetica", style='I', size=10)
            pdf.set_text_color(120, 120, 120)
            pdf.cell(277, 15, txt="[No 3D render screenshot provided for this vehicle. Use the Plotly camera icon to capture and upload images.]", ln=True, align='C')
            pdf.set_text_color(20, 20, 20)
            
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
        pdf.output(tmp_pdf.name)
        return tmp_pdf.name

# =====================================================================
# --- USER INTERFACE (STREAMLIT WIDESCREEN 16:9 LAYOUT) ---
# =====================================================================

# Top Navigation Bar & Theme Selector
top_col1, top_col2, top_col3 = st.columns([6, 3, 3])

with top_col1:
    st.title("📦 3D Multi-Vehicle Cargo Optimizer")
    st.caption("High-precision 3D logistics packing system with dynamic rules engine and priority loading order")

with top_col2:
    st.write("")
    if FIREBASE_ENABLED:
        st.success("🔥 Firestore: Connected (`optimiseur-3d-app`)")
    else:
        st.info("💾 Local Mode: Offline Firestore")

with top_col3:
    st.write("")
    theme_choice = st.radio(
        "UI Theme",
        ["Dark", "Light"],
        index=0 if st.session_state.theme_mode == "Dark" else 1,
        horizontal=True,
        key="theme_radio_selector"
    )
    if theme_choice != st.session_state.theme_mode:
        st.session_state.theme_mode = theme_choice
        st.rerun()

st.markdown("---")

col1, col2 = st.columns([4, 8])

# -------------------------------------------------------------
# LEFT COLUMN: TRANSPORT SPECS, DYNAMIC RULES, ADD FORM & CONFIGS
# -------------------------------------------------------------
with col1:
    st.header("1. Transport Parameters")
    transport_type = st.selectbox("Trailer / Container Type", list(CONTAINERS.keys()))
    c_props = CONTAINERS[transport_type]
    max_bins = st.number_input("Maximum number of vehicles", min_value=1, max_value=15, value=5, key="max_bins_input")
    st.info(f"📏 Usable Dimensions: **{c_props['L']} x {c_props['W']} x {c_props['H']} cm** | ⚖️ Max Weight: **{c_props['max_weight']:,} kg**")

    # ---------------------------------------------------------
    # DYNAMIC LOGISTICS RULES ENGINE (INTERACTIVE PANEL)
    # ---------------------------------------------------------
    with st.expander("⚙️ Logistics Rules & Heuristics Settings", expanded=True):
        st.markdown("Tune live packing heuristics before running calculation:")

        st.session_state.rear_buffer_cm = st.slider(
            "🚪 Rear Door Buffer / Clearance (`rear_buffer_cm`)",
            min_value=0.0, max_value=100.0,
            value=float(st.session_state.rear_buffer_cm),
            step=5.0,
            help="Penalizes cargo extending beyond (Length - rear_buffer_cm) to force compact 90° rotations near the rear doors."
        )

        st.session_state.enable_80cm_rule = st.toggle(
            "📐 80cm Width Alignment Rule",
            value=st.session_state.enable_80cm_rule,
            help="Favors 80cm width placed across trailer width (Y) in trailers >= 240cm to form rows of 3 standard pallets."
        )
        if st.session_state.enable_80cm_rule:
            st.session_state.bonus_weight = st.slider(
                "80cm Rule Score Bonus (`bonus_weight`)",
                min_value=5000.0, max_value=150000.0,
                value=float(st.session_state.bonus_weight),
                step=5000.0
            )

        c_r1, c_r2 = st.columns(2)
        with c_r1:
            st.session_state.enable_euro_grid = st.toggle(
                "🧩 Europallet Grid",
                value=st.session_state.enable_euro_grid,
                help="Applies standard pinwheel layout slots for 20FT, 40FT, and TIR 33 pallets."
            )
        with c_r2:
            st.session_state.enable_gravity_slide = st.toggle(
                "🧲 Gravity Slide (X)",
                value=st.session_state.enable_gravity_slide,
                help="Automatically slides pallets forward along the X-axis until physical contact."
            )

        c_r3, c_r4 = st.columns(2)
        with c_r3:
            st.session_state.enable_strict_collision = st.toggle(
                "🛡️ 3D Anti-Collision",
                value=st.session_state.enable_strict_collision,
                help="Enforces strict 3D non-overlap verification."
            )
        with c_r4:
            st.session_state.enable_overhead_protection = st.toggle(
                "🚫 Non-Stackable Overhead Protection",
                value=st.session_state.enable_overhead_protection,
                help="Forbids any cargo placement on top of non-stackable items."
            )

        if st.button("🔄 Reset Rules to Recommended Defaults", use_container_width=True):
            st.session_state.rear_buffer_cm = 25.0
            st.session_state.enable_80cm_rule = True
            st.session_state.bonus_weight = 50000.0
            st.session_state.enable_euro_grid = True
            st.session_state.enable_gravity_slide = True
            st.session_state.enable_strict_collision = True
            st.session_state.enable_overhead_protection = True
            st.rerun()

    # ---------------------------------------------------------
    # 2. ADD CARGO FORM
    # ---------------------------------------------------------
    st.header("2. Add Cargo")
    lib_keys = list(st.session_state.product_lib.keys())
    selected_preset = st.selectbox("📚 Load preset from Library", ["-- New product --"] + lib_keys)
    
    d_ref, d_l, d_h = "", 120.0, 100.0
    d_w, d_weight = 80.0, 450.0
    
    if selected_preset != "-- New product --":
        prod = st.session_state.product_lib[selected_preset]
        d_ref = prod.get("Ref", selected_preset)
        d_l = float(prod.get("L", 120.0))
        d_w = float(prod.get("W", prod.get("l", 80.0)))
        d_h = float(prod.get("H", 100.0))
        d_weight = float(prod.get("Weight", prod.get("Poids", 450.0)))
        
        rot_raw = prod.get("Rotation", "Auto (Horizontal)")
        rot_mapping = {"Auto (Horizontal)": 0, "Auto (All)": 1, "Strict: L -> Length": 2, "Strict: W -> Length": 3}
        d_rot = rot_mapping.get(rot_raw, 0)
        
        stack_raw = prod.get("Stackable", prod.get("Empilable", "Yes"))
        d_stack = 0 if stack_raw in ["Yes", "Oui"] else 1
    else:
        d_rot = 0
        d_stack = 0

    with st.form("add_item_form", clear_on_submit=False):
        ref = st.text_input("Reference / Description", value=d_ref)
        col_qty, col_prio = st.columns(2)
        qty = col_qty.number_input("Quantity", min_value=1, value=1, step=1)
        prio = col_prio.number_input("Priority (1 = Deepest / First Loaded)", min_value=1, value=len(st.session_state.cargo_items)+1, step=1)
        
        st.markdown("**Dimensions in CENTIMETERS (cm)**")
        cl, cw, ch = st.columns(3)
        l = cl.number_input("Length L", min_value=1.0, value=d_l, step=5.0)
        w = cw.number_input("Width W", min_value=1.0, value=d_w, step=5.0)
        h = ch.number_input("Height H", min_value=1.0, value=d_h, step=5.0)
        weight = st.number_input("Unit Weight (kg)", min_value=0.1, value=d_weight, step=25.0)
        
        rotation_policy = st.radio("Allowed Rotation", ["Auto (Horizontal)", "Auto (All)", "Strict: L -> Length", "Strict: W -> Length"], index=d_rot)
        stackable = st.radio("Stackable?", ["Yes", "No"], index=d_stack, horizontal=True)
        save_to_lib = st.checkbox("💾 Save product to Library", value=False)
        submit = st.form_submit_button("➕ Add to Cargo List")

        if submit:
            if ref.strip():
                color = DISTINCT_COLORS[len(st.session_state.color_map) % len(DISTINCT_COLORS)]
                if ref not in st.session_state.color_map:
                    st.session_state.color_map[ref] = color
                else:
                    color = st.session_state.color_map[ref]
                
                st.session_state.cargo_items.append({
                    "Priority": int(prio), "Reference": ref.strip(), "Quantity": int(qty), 
                    "Length": float(l), "Width": float(w), "Height": float(h), "Weight": float(weight),
                    "Rotation": rotation_policy, "Stackable": stackable, "Color": color
                })
                
                if save_to_lib:
                    st.session_state.product_lib[ref.strip()] = {
                        "Ref": ref.strip(), "L": float(l), "W": float(w), "H": float(h), "Weight": float(weight), 
                        "Rotation": rotation_policy, "Stackable": stackable
                    }
                    save_library(st.session_state.product_lib)
                    st.success(f"'{ref.strip()}' saved in library!")
                else:
                    st.success(f"Added: {qty}x {ref.strip()}")
                st.rerun()
            else:
                st.error("Please enter a valid reference.")

    # ---------------------------------------------------------
    # 3. CONFIGURATION MANAGEMENT
    # ---------------------------------------------------------
    st.markdown("---")
    st.header("💾 Configuration Management")
    
    save_name = st.text_input("Cargo Mix Name (e.g., 'Weekly Fleet Order A')", value=st.session_state.current_mix_name)
    if st.button("💾 Save Current Mix", use_container_width=True):
        if save_name and st.session_state.cargo_items:
            save_config(save_name, st.session_state.cargo_items)
            st.session_state.current_mix_name = save_name
            st.success(f"Mix '{save_name}' saved successfully!")
        else:
            st.error("Enter a name and add cargo items first.")
            
    configs = load_configs()
    if configs:
        selected_mix = st.selectbox("📂 Load or Share Saved Mix", ["-- Select a mix --"] + list(configs.keys()))
        c_l, c_sh = st.columns(2)
        
        with c_l:
            if st.button("📂 Load Mix", use_container_width=True):
                if selected_mix != "-- Select a mix --":
                    st.session_state.cargo_items = configs[selected_mix]['items']
                    for item in st.session_state.cargo_items:
                        st.session_state.color_map[item['Reference']] = item.get('Color', '#333333')
                    st.session_state.optimization_done = False
                    st.session_state.current_mix_name = selected_mix
                    st.rerun()
                else:
                    st.error("Please select a mix first.")
        with c_sh:
            if st.button("🔗 Share Link", use_container_width=True):
                if selected_mix != "-- Select a mix --":
                    BASE_URL = "https://optimiseur-3d-app.streamlit.app/"
                    st.info(f"Direct shareable link:\n\n**{BASE_URL}?config={urllib.parse.quote(selected_mix)}**")
                else:
                    st.error("Please select a mix first.")
    else:
        st.info("No saved mixes available in Firestore yet.")

    # ---------------------------------------------------------
    # 4. LIBRARY EDITOR
    # ---------------------------------------------------------
    st.markdown("---")
    with st.expander("⚙️ Library Editor (Edit / Delete Products)"):
        lib_data = []
        for k, v in st.session_state.product_lib.items():
            rot_raw = v.get("Rotation", "Auto (Horizontal)")
            stack_raw = v.get("Stackable", v.get("Empilable", "Yes"))
            stack_en = "Yes" if stack_raw in ["Yes", "Oui"] else "No"
            
            lib_data.append({
                "Ref": v.get("Ref", k),
                "L (cm)": float(v.get("L", 120)),
                "W (cm)": float(v.get("W", v.get("l", 80))),
                "H (cm)": float(v.get("H", 100)),
                "Weight (kg)": float(v.get("Weight", v.get("Poids", 450))),
                "Rotation": rot_raw,
                "Stackable": stack_en
            })
        
        if lib_data:
            lib_df = pd.DataFrame(lib_data)
            edited_lib = st.data_editor(
                lib_df, 
                num_rows="dynamic",
                use_container_width=True,
                column_config={
                    "Rotation": st.column_config.SelectboxColumn(options=["Auto (Horizontal)", "Auto (All)", "Strict: L -> Length", "Strict: W -> Length"]),
                    "Stackable": st.column_config.SelectboxColumn(options=["Yes", "No"])
                },
                key="lib_editor"
            )
            if st.button("💾 Save Library Changes", use_container_width=True):
                new_lib = {}
                for row in edited_lib.to_dict('records'):
                    ref_key = str(row.get("Ref", "")).strip()
                    if ref_key and not pd.isna(ref_key) and ref_key != "nan":
                        new_lib[ref_key] = {
                            "Ref": ref_key,
                            "L": float(row["L (cm)"]), "W": float(row["W (cm)"]), "H": float(row["H (cm)"]),
                            "Weight": float(row["Weight (kg)"]),
                            "Rotation": row["Rotation"], "Stackable": row["Stackable"]
                        }
                st.session_state.product_lib = new_lib
                save_library(new_lib)
                st.success("Library updated successfully in Firestore!")
                st.rerun()
        else:
            st.info("The library is currently empty.")

# -------------------------------------------------------------
# RIGHT COLUMN: CARGO LIST (FULL WIDTH) & 3D FLEET VISUALIZATION
# -------------------------------------------------------------
with col2:
    st.header("3. Cargo Manifest (Editable & Priority Sorted)")
    
    if not st.session_state.cargo_items:
        st.write("The list is empty. Add cargo items from the left panel.")
        display_df = pd.DataFrame(columns=["Priority", "Reference", "Quantity", "Length", "Width", "Height", "Weight", "Rotation", "Stackable", "Color"])
    else:
        st.session_state.cargo_items = sorted(st.session_state.cargo_items, key=lambda x: int(x.get("Priority", 999)))
        display_df = pd.DataFrame(st.session_state.cargo_items)
        
    edited_df = st.data_editor(
        display_df,
        num_rows="dynamic",
        use_container_width=True,
        hide_index=True,
        column_config={
            "Priority": st.column_config.NumberColumn("Priority", min_value=1, step=1, help="1 = Loaded deepest / first"),
            "Reference": st.column_config.TextColumn("Reference"),
            "Quantity": st.column_config.NumberColumn("Quantity", min_value=1, step=1),
            "Length": st.column_config.NumberColumn("L (cm)", min_value=1.0, step=1.0),
            "Width": st.column_config.NumberColumn("W (cm)", min_value=1.0, step=1.0),
            "Height": st.column_config.NumberColumn("H (cm)", min_value=1.0, step=1.0),
            "Weight": st.column_config.NumberColumn("Weight (kg)", min_value=0.1, step=1.0),
            "Rotation": st.column_config.SelectboxColumn("Rotation Policy", options=["Auto (Horizontal)", "Auto (All)", "Strict: L -> Length", "Strict: W -> Length"]),
            "Stackable": st.column_config.SelectboxColumn("Stackable", options=["Yes", "No"]),
            "Color": st.column_config.TextColumn("Color (Hex)")
        }
    )
    
    updated_items = edited_df.to_dict('records')
    st.session_state.cargo_items = [
        item for item in updated_items 
        if str(item.get('Reference', '')).strip() and str(item.get('Reference', '')).strip() != 'nan'
    ]
    for item in st.session_state.cargo_items:
        if 'Color' in item and item['Color']:
            st.session_state.color_map[item['Reference']] = item['Color']

    st.header("4. Fleet 3D Optimization & Visualizer")
    
    # Calculate Button
    if st.button("🚀 Calculate & Display Fleet Loading", type="primary", use_container_width=True):
        if not st.session_state.cargo_items:
            st.warning("Please add cargo items first.")
        else:
            impossible_items = set()
            for item in st.session_state.cargo_items:
                h_val = float(item["Height"])
                rot_val = item.get("Rotation", "Auto (Horizontal)")
                if rot_val in ["Auto (Horizontal)", "Strict: L -> Length", "Strict: W -> Length"] and h_val > c_props["H"]:
                    impossible_items.add(item["Reference"])
            
            if impossible_items:
                st.error(f"🚨 **Dimension Alert**: Height of ({', '.join(impossible_items)}) exceeds the vehicle ceiling ({c_props['H']} cm).")
            
            with st.spinner("Executing 3D bin packing heuristics and priority loading across fleet..."):
                active_rules = {
                    'rear_buffer_cm': st.session_state.rear_buffer_cm,
                    'enable_80cm_rule': st.session_state.enable_80cm_rule,
                    'bonus_weight': st.session_state.bonus_weight,
                    'enable_euro_grid': st.session_state.enable_euro_grid,
                    'enable_gravity_slide': st.session_state.enable_gravity_slide,
                    'enable_strict_collision': st.session_state.enable_strict_collision,
                    'enable_overhead_protection': st.session_state.enable_overhead_protection,
                }

                # Priority loading order: sort strictly by Priority (1 = first loaded / deepest)
                sorted_cargo = sorted(st.session_state.cargo_items, key=lambda x: int(x.get("Priority", 999)))
                all_items_to_pack = []
                
                for item in sorted_cargo:
                    rot_val = item.get("Rotation", "Auto (Horizontal)")
                    if rot_val == "Auto (Horizontal)": allowed_rot = [0, 1]
                    elif rot_val == "Auto (All)": allowed_rot = [0, 1, 2, 3, 4, 5]
                    elif rot_val == "Strict: L -> Length": allowed_rot = [0]
                    elif rot_val == "Strict: W -> Length": allowed_rot = [1]
                    else: allowed_rot = [0, 1]
                    
                    is_stackable = item.get("Stackable", "Yes") == "Yes"
                    
                    h_dec, weight_dec = Decimal(str(item["Height"])), Decimal(str(item["Weight"]))
                    qty = int(item["Quantity"])
                    l_dec, w_dec = Decimal(str(item["Length"])), Decimal(str(item["Width"]))
                    ref_name = item["Reference"]

                    if is_stackable and rot_val in ["Auto (Horizontal)", "Strict: L -> Length", "Strict: W -> Length"]:
                        max_stack_height = int(Decimal(str(c_props["H"])) // h_dec) if h_dec > 0 else 1
                        max_stack_weight = int(Decimal(str(c_props["max_weight"])) // weight_dec) if weight_dec > 0 else 999
                        max_stack = max(1, min(max_stack_height, max_stack_weight))
                    else:
                        max_stack = 1
                        
                    stack_count = 0
                    while qty > 0:
                        current_q = min(qty, max_stack)
                        stack_count += 1
                        c_item = CustomItem(
                            f"{ref_name} #Stack{stack_count}",
                            l_dec, w_dec, h_dec * current_q, weight_dec * current_q,
                            allowed_rotations=allowed_rot, stackable=is_stackable
                        )
                        c_item.original_qty = current_q
                        c_item.original_height = h_dec
                        c_item.original_weight = weight_dec
                        all_items_to_pack.append(c_item)
                        qty -= current_q

                unpacked_items = list(all_items_to_pack)
                used_bins = []

                # Multi-vehicle packing loop: iterate up to max_bins to fit all remaining cargo
                limit_vehicles = max(1, int(st.session_state.get('max_bins_input', max_bins)))
                for i in range(limit_vehicles):
                    if not unpacked_items:
                        break 
                    bin_obj = Bin(
                        f"{transport_type} #{i+1}",
                        Decimal(str(c_props["L"])), Decimal(str(c_props["W"])), Decimal(str(c_props["H"])),
                        Decimal(str(c_props["max_weight"]))
                    )
                    euro_slots = get_optimal_europallet_slots(transport_type)
                    
                    items_left = []
                    for item in unpacked_items:
                        if not pack_with_rules(bin_obj, item, euro_slots, active_rules):
                            items_left.append(item)
                            
                    if len(bin_obj.items) > 0:
                        used_bins.append(bin_obj)
                    unpacked_items = items_left

                # Unpack composite stacks back into individual boxes
                final_used_bins = []
                for b in used_bins:
                    unpacked_items_list = []
                    for stack_item in b.items:
                        orig_q = getattr(stack_item, 'original_qty', 1)
                        base_name = stack_item.name.split(" #Stack")[0]
                        if orig_q > 1:
                            orig_h = getattr(stack_item, 'original_height')
                            orig_w = getattr(stack_item, 'original_weight')
                            x, y, z = stack_item.position
                            for idx in range(orig_q):
                                single = CustomItem(
                                    f"{base_name} #{idx+1}",
                                    Decimal(str(stack_item.width)), Decimal(str(stack_item.height)),
                                    orig_h, orig_w,
                                    allowed_rotations=stack_item.allowed_rotations,
                                    stackable=stack_item.stackable
                                )
                                single.rotation_type = stack_item.rotation_type
                                single.position = (Decimal(str(x)), Decimal(str(y)), Decimal(str(float(z) + idx * float(orig_h))))
                                unpacked_items_list.append(single)
                        else:
                            if " #Stack" in stack_item.name:
                                stack_item.name = f"{base_name} #1"
                            unpacked_items_list.append(stack_item)
                    b.items = unpacked_items_list
                    final_used_bins.append(b)
                
                st.session_state.used_bins = final_used_bins
                st.session_state.optimization_done = True
                st.session_state.unpacked_leftovers = unpacked_items
                
                if unpacked_items:
                    st.warning(f"⚠️ {len(unpacked_items)} item(s) could not fit in the allocated fleet ({limit_vehicles} vehicle(s)). Please increase the maximum number of vehicles.")
                else:
                    st.success(f"✅ Optimization complete! 100% of cargo packed across {len(final_used_bins)} vehicle(s).")

    # ---------------------------------------------------------
    # DISPLAY SIMULTANEOUS 3D RESULTS FOR ALL DEPLOYED VEHICLES
    # ---------------------------------------------------------
    if st.session_state.get('optimization_done', False):
        active_theme_is_light = (st.session_state.theme_mode == "Light")
        deployed_count = len(st.session_state.used_bins)

        st.markdown(f"### 🚛 Fleet Optimization Results: {deployed_count} Vehicle(s) Deployed")

        # Iterate over EVERY deployed vehicle and render its complete card + 3D chart
        for idx, b in enumerate(st.session_state.used_bins):
            total_vol = float(b.width * b.height * b.depth)
            used_vol = sum([float(i.width * i.height * i.depth) for i in b.items])
            fill_rate = (used_vol / total_vol) * 100.0 if total_vol > 0 else 0.0
            
            max_x_occupied = max([float(i.position[0]) + float(i.get_dimension()[0]) for i in b.items]) if b.items else 0.0
            rem_x = float(b.width) - max_x_occupied
            total_loaded_weight = sum([float(i.weight) for i in b.items])
            weight_utilization = (total_loaded_weight / float(b.max_weight)) * 100.0 if float(b.max_weight) > 0 else 0.0
            
            st.markdown(f"#### 🚚 Vehicle #{idx+1} — {b.name} ({len(b.items)} cargo units)")
            
            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Volume Fill Rate", f"{fill_rate:.1f}%")
            m2.metric("Used Length", f"{max_x_occupied:.1f} cm")
            m3.metric("Remaining Space", f"{rem_x:.1f} cm")
            m4.metric("Loaded Weight", f"{total_loaded_weight:,.0f} kg", f"{weight_utilization:.1f}% of max")

            # Plotly 3D visualizer with theme=None so Light/Dark template works 100% without Streamlit overrides
            fig = plot_3d_packing(
                (c_props["L"], c_props["W"], c_props["H"]),
                b.items,
                st.session_state.color_map,
                f"3D Packing View — Vehicle #{idx+1} ({b.name})",
                is_light_theme=active_theme_is_light
            )

            st.plotly_chart(
                fig,
                use_container_width=True,
                theme=None,
                key=f"plotly_vehicle_chart_{idx}_{st.session_state.theme_mode}"
            )
            st.markdown("---")

        # -----------------------------------------------------
        # LANDSCAPE PDF EXPORT SECTION
        # -----------------------------------------------------
        st.subheader("📄 Export Landscape PDF Report (`fpdf2`)")
        st.info("💡 **3D Screenshot Integration:** Hover over any 3D chart above, click the 📷 (camera) icon to download a PNG screenshot, then drag and drop below to embed it directly into your report!")
        
        pdf_project_name = st.text_input("Project Name for PDF:", value=st.session_state.get('current_mix_name', 'Logistics Project'))
        uploaded_imgs = st.file_uploader(
            "Upload 3D screenshot images for PDF (PNG / JPG)",
            type=["png", "jpg", "jpeg"],
            accept_multiple_files=True
        )
        
        if st.button("📥 Generate Final Landscape PDF", type="primary", use_container_width=True):
            with st.spinner("Generating landscape PDF report..."):
                pdf_path = generate_pdf_report(
                    st.session_state.cargo_items,
                    st.session_state.used_bins,
                    c_props,
                    pdf_project_name,
                    uploaded_imgs
                )
                if pdf_path:
                    with open(pdf_path, "rb") as pdf_file:
                        safe_filename = "".join([c for c in pdf_project_name if c.isalnum() or c in " -_"]).strip()
                        if not safe_filename:
                            safe_filename = "Project"
                        st.download_button(
                            label=f"📄 Download 'Cargo Report - {safe_filename}.pdf'",
                            data=pdf_file,
                            file_name=f"Cargo Report - {safe_filename}.pdf",
                            mime="application/pdf",
                            use_container_width=True
                        )
                        st.success("✅ PDF report generated successfully!")

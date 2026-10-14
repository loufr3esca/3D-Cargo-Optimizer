# 📦 3D Multi-Vehicle Cargo Optimizer

High-precision 3D fleet cargo optimization system with dynamic logistics heuristics, Firestore synchronization, priority loading order, light & dark UI themes, and landscape PDF reporting.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Launch Streamlit Application
```bash
streamlit run app.py
```
The interface opens at `http://localhost:8501`.

---

## 🖥️ 16:9 Widescreen Layout & Light/Dark Theme
- **Full-Screen 16:9 Optimization**: No horizontal scrollbars on cargo manifest tables on widescreen displays.
- **Theme Switcher**: Instant toggle between **Dark Mode** and **Light Mode** across the entire UI and 3D visualizer.

---

## ⚙️ Dynamic Logistics Rules & Heuristics Engine
- **Rear Door Buffer (`rear_buffer_cm`)**: Adjustable 0–100 cm buffer to penalize cargo too close to rear doors and force compact 90° rotations.
- **80cm Width Alignment Rule (`enable_80cm_rule` & `bonus_weight`)**: Favors rows of 3 standard 80cm pallets across trailer width (Y-axis) in trailers $\ge 240\text{ cm}$.
- **Europallet Strategy & Gravity Slide (`enable_euro_grid` & `enable_gravity_slide`)**: Pinwheel layouts for 20FT, 40FT/40HQ, and TIR 33 pallets with automated forward sliding along X-axis.
- **3D Collision & Overhead Protection**: Strict spatial non-overlap checks and overhead protection for non-stackable goods.
- **Priority Loading Order**: Items are loaded strictly according to their numerical priority (`1` = deepest against front cab, loaded first).

---

## 🔑 Firebase Firestore Integration
- **Product Library**: Save and edit reusable products (`products` collection).
- **Configuration Management**: Save named cargo mixes, load past mixes, and generate shareable URLs (`?config=...`) (`configs` collection).

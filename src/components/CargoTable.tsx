import React, { useState } from 'react';
import { Plus, Trash2, Copy, BookOpen, Layers, AlertTriangle, ArrowUpDown, BookmarkPlus, Edit3, Check } from 'lucide-react';
import { CargoItem, RotationPolicy } from '../types/optimizer';

interface Props {
  items: CargoItem[];
  onChange: (items: CargoItem[]) => void;
  colorMap: Record<string, string>;
  onColorChange: (ref: string, color: string) => void;
  ceilingHeight: number;
  theme?: 'dark' | 'light';
  productLib: Record<string, any>;
  onSaveProductToLib: (prod: any) => void;
  onUpdateLibrary: (newLib: Record<string, any>) => void;
}

const PRESET_LIBRARY: Omit<CargoItem, 'id' | 'Priority' | 'Quantity'>[] = [
  {
    Reference: 'Euro Pallet (Standard)',
    Length: 120.0,
    Width: 80.0,
    Height: 140.0,
    Weight: 450.0,
    Rotation: 'Auto (Horizontal)',
    Stackable: 'Yes',
    Color: '#4363d8',
  },
  {
    Reference: 'Half Pallet (Demi)',
    Length: 80.0,
    Width: 60.0,
    Height: 110.0,
    Weight: 220.0,
    Rotation: 'Auto (Horizontal)',
    Stackable: 'Yes',
    Color: '#3cb44b',
  },
  {
    Reference: 'Heavy Industrial Crate',
    Length: 100.0,
    Width: 100.0,
    Height: 90.0,
    Weight: 700.0,
    Rotation: 'Strict: L -> Length',
    Stackable: 'No',
    Color: '#e6194b',
  },
  {
    Reference: 'Master Carton Box',
    Length: 60.0,
    Width: 40.0,
    Height: 40.0,
    Weight: 25.0,
    Rotation: 'Auto (All)',
    Stackable: 'Yes',
    Color: '#f58231',
  },
  {
    Reference: 'American Pallet (120x100)',
    Length: 120.0,
    Width: 100.0,
    Height: 150.0,
    Weight: 600.0,
    Rotation: 'Auto (Horizontal)',
    Stackable: 'Yes',
    Color: '#911eb4',
  },
];

export const CargoTable: React.FC<Props> = ({
  items,
  onChange,
  colorMap,
  onColorChange,
  ceilingHeight,
  theme = 'dark',
  productLib,
  onSaveProductToLib,
  onUpdateLibrary,
}) => {
  const isLight = theme === 'light';

  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [newRef, setNewRef] = useState('');
  const [newQty, setNewQty] = useState(12);
  const [newL, setNewL] = useState(120.0);
  const [newW, setNewW] = useState(80.0);
  const [newH, setNewH] = useState(140.0);
  const [newWeight, setNewWeight] = useState(450.0);
  const [newRotation, setNewRotation] = useState<RotationPolicy>('Auto (Horizontal)');
  const [newStackable, setNewStackable] = useState<'Yes' | 'No'>('Yes');
  const [newColor, setNewColor] = useState('#4363d8');
  const [saveToLibChecked, setSaveToLibChecked] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPreset(val);
    
    // Check in user library first, then preset list
    const fromUserLib = productLib[val];
    if (fromUserLib) {
      setNewRef(fromUserLib.Ref || val);
      setNewL(Number(fromUserLib.L) || 120);
      setNewW(Number(fromUserLib.W || fromUserLib.l) || 80);
      setNewH(Number(fromUserLib.H) || 100);
      setNewWeight(Number(fromUserLib.Weight || fromUserLib.Poids) || 450);
      setNewRotation(fromUserLib.Rotation || 'Auto (Horizontal)');
      setNewStackable(fromUserLib.Stackable === 'No' ? 'No' : 'Yes');
      return;
    }

    const found = PRESET_LIBRARY.find(p => p.Reference === val);
    if (found) {
      setNewRef(found.Reference);
      setNewL(found.Length);
      setNewW(found.Width);
      setNewH(found.Height);
      setNewWeight(found.Weight);
      setNewRotation(found.Rotation);
      setNewStackable(found.Stackable);
      setNewColor(found.Color);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRef.trim()) return;

    const newItem: CargoItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      Priority: items.length + 1,
      Reference: newRef.trim(),
      Quantity: Number(newQty) || 1,
      Length: Number(newL) || 10,
      Width: Number(newW) || 10,
      Height: Number(newH) || 10,
      Weight: Number(newWeight) || 1,
      Rotation: newRotation,
      Stackable: newStackable,
      Color: newColor,
    };

    onColorChange(newItem.Reference, newColor);
    
    // Respect priority order
    const updated = [...items, newItem].sort((a, b) => a.Priority - b.Priority);
    onChange(updated);

    if (saveToLibChecked) {
      onSaveProductToLib({
        Ref: newItem.Reference,
        L: newItem.Length,
        W: newItem.Width,
        H: newItem.Height,
        Weight: newItem.Weight,
        Rotation: newItem.Rotation,
        Stackable: newItem.Stackable,
      });
      setSaveToLibChecked(false);
    }

    setNewRef('');
    setSelectedPreset('');
  };

  const updateItem = (id: string, field: keyof CargoItem, value: any) => {
    let updated = items.map(item => {
      if (item.id === id) {
        if (field === 'Color') {
          onColorChange(item.Reference, value);
        }
        return { ...item, [field]: value };
      }
      return item;
    });

    if (field === 'Priority') {
      updated = updated.sort((a, b) => a.Priority - b.Priority);
    }
    onChange(updated);
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const duplicateItem = (item: CargoItem) => {
    const dup: CargoItem = {
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      Priority: items.length + 1,
      Reference: `${item.Reference} (Copy)`,
    };
    onChange([...items, dup]);
  };

  const totalQty = items.reduce((sum, item) => sum + (Number(item.Quantity) || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + ((Number(item.Quantity) || 0) * (Number(item.Weight) || 0)), 0);

  return (
    <div className="space-y-4 w-full">
      {/* Quick Add Cargo Form */}
      <div className={`rounded-xl p-4 shadow-lg border transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Plus className="w-4 h-4 text-blue-500" />
            Add Cargo to Manifest
          </h3>

          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPreset}
              onChange={handleSelectPreset}
              className={`text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-800' 
                  : 'bg-slate-950 border-slate-700 text-slate-200'
              }`}
            >
              <option value="">📚 Load Preset from Library...</option>
              {Object.keys(productLib).length > 0 && (
                <optgroup label="Saved Library Products">
                  {Object.keys(productLib).map(k => (
                    <option key={k} value={k}>
                      {k} ({productLib[k].L}x{productLib[k].W}x{productLib[k].H}cm)
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Standard Logistics Presets">
                {PRESET_LIBRARY.map(p => (
                  <option key={p.Reference} value={p.Reference}>
                    {p.Reference} ({p.Length}x{p.Width}x{p.Height}cm - {p.Weight}kg)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <form onSubmit={handleAddItem} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-5">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Reference / Description
              </label>
              <input
                type="text"
                placeholder="e.g. Euro Pallet Customer A"
                value={newRef}
                onChange={e => setNewRef(e.target.value)}
                required
                className={`w-full text-xs border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                }`}
              />
            </div>
            <div className="md:col-span-2">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={newQty}
                onChange={e => setNewQty(parseInt(e.target.value) || 1)}
                className={`w-full text-xs border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                }`}
              />
            </div>
            <div className="md:col-span-2">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Priority (1 = Deepest)
              </label>
              <input
                type="number"
                min="1"
                value={items.length + 1}
                readOnly
                className={`w-full text-xs border rounded-lg px-3 py-1.5 opacity-80 cursor-not-allowed ${
                  isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
                title="Loading Priority: 1 is placed first and deepest against the front cab"
              />
            </div>
            <div className="md:col-span-3">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Unit Weight (kg)
              </label>
              <input
                type="number"
                step="5"
                min="0.1"
                value={newWeight}
                onChange={e => setNewWeight(parseFloat(e.target.value) || 1)}
                className={`w-full text-xs border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-12 gap-2.5 items-end">
            <div className="md:col-span-2">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>L (cm)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={newL}
                onChange={e => setNewL(parseFloat(e.target.value) || 1)}
                className={`w-full text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                }`}
              />
            </div>
            <div className="md:col-span-2">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>W (cm)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={newW}
                onChange={e => setNewW(parseFloat(e.target.value) || 1)}
                className={`w-full text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                }`}
              />
            </div>
            <div className="md:col-span-2">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>H (cm)</label>
              <input
                type="number"
                step="1"
                min="1"
                value={newH}
                onChange={e => setNewH(parseFloat(e.target.value) || 1)}
                className={`w-full text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                }`}
              />
            </div>
            <div className="md:col-span-2">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Rotation</label>
              <select
                value={newRotation}
                onChange={e => setNewRotation(e.target.value as RotationPolicy)}
                className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                }`}
              >
                <option value="Auto (Horizontal)">Auto (Horizontal)</option>
                <option value="Auto (All)">Auto (All)</option>
                <option value="Strict: L -> Length">Strict: L -&gt; Length</option>
                <option value="Strict: W -> Length">Strict: W -&gt; Length</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Stackable?</label>
              <select
                value={newStackable}
                onChange={e => setNewStackable(e.target.value as 'Yes' | 'No')}
                className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                }`}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={saveToLibChecked}
                onChange={e => setSaveToLibChecked(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                💾 Save product to Library for future mixes
              </span>
            </label>

            <button
              type="button"
              onClick={() => setIsLibraryOpen(!isLibraryOpen)}
              className={`text-xs font-medium flex items-center gap-1 hover:underline ${
                isLight ? 'text-blue-700' : 'text-blue-400'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              {isLibraryOpen ? 'Close Library Editor' : 'Open Library Editor'}
            </button>
          </div>
        </form>
      </div>

      {/* Library Editor Expander */}
      {isLibraryOpen && (
        <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
          isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isLight ? 'text-slate-800' : 'text-white'
            }`}>
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              Library Editor (Manage Saved Products)
            </h4>
            <span className="text-[11px] text-slate-500">
              {Object.keys(productLib).length} saved items
            </span>
          </div>

          {Object.keys(productLib).length === 0 ? (
            <p className="text-xs text-slate-500 italic">No products saved in the library yet. Check &quot;Save product to Library&quot; when adding items.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {Object.entries(productLib).map(([key, prod]: [string, any]) => (
                <div key={key} className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}>
                  <div>
                    <div className="font-semibold">{prod.Ref || key}</div>
                    <div className="text-[11px] text-slate-500">
                      {prod.L}×{prod.W || prod.l}×{prod.H} cm &bull; {prod.Weight || prod.Poids} kg
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = { ...productLib };
                      delete next[key];
                      onUpdateLibrary(next);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                    title="Delete from Library"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cargo List Manifest Table - Optimized for 16:9 full width without horizontal overflow */}
      <div className={`rounded-xl overflow-hidden shadow-lg border transition-colors w-full ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
          isLight ? 'border-slate-200 bg-slate-50/70' : 'border-slate-800 bg-slate-950/60'
        }`}>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-500" />
            <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Cargo Manifest (16:9 Optimized &bull; Priority Loading Order)
            </h3>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${
              isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {items.length} references &bull; {totalQty} units
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Total Estimated Weight: <b className={`font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalWeight.toLocaleString()} kg</b>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            The cargo list is empty. Add cargo items above to calculate optimal fleet packing.
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full text-left text-xs table-fixed">
              <thead className={`uppercase text-[10px] tracking-wider border-b ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                <tr>
                  <th className="py-2.5 px-2 w-[7%] text-center">Priority</th>
                  <th className="py-2.5 px-2 w-[5%] text-center">Color</th>
                  <th className="py-2.5 px-3 w-[26%]">Reference / Cargo Name</th>
                  <th className="py-2.5 px-2 w-[8%] text-center">Qty</th>
                  <th className="py-2.5 px-2 w-[7%] text-center">L (cm)</th>
                  <th className="py-2.5 px-2 w-[7%] text-center">W (cm)</th>
                  <th className="py-2.5 px-2 w-[7%] text-center">H (cm)</th>
                  <th className="py-2.5 px-2 w-[8%] text-center">Weight</th>
                  <th className="py-2.5 px-2 w-[12%] text-center">Rotation</th>
                  <th className="py-2.5 px-2 w-[6%] text-center">Stack</th>
                  <th className="py-2.5 px-3 w-[7%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {items.map((item) => {
                  const isTooHigh = item.Height > ceilingHeight && item.Rotation !== 'Auto (All)';
                  return (
                    <tr key={item.id} className={`transition ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                    }`}>
                      {/* Priority */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.Priority}
                          onChange={e => updateItem(item.id, 'Priority', parseInt(e.target.value) || 1)}
                          className={`w-full max-w-[50px] text-center border rounded px-1 py-0.5 text-xs font-bold ${
                            isLight 
                              ? 'bg-slate-50 border-slate-300 text-slate-900' 
                              : 'bg-slate-950 border-slate-700/60 text-slate-200'
                          }`}
                          title="1 = First loaded / placed deepest against front wall"
                        />
                      </td>

                      {/* Color Picker */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="color"
                          value={item.Color || colorMap[item.Reference] || '#3b82f6'}
                          onChange={e => updateItem(item.id, 'Color', e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent mx-auto block"
                          title="Click to customize 3D mesh color"
                        />
                      </td>

                      {/* Reference */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.Reference}
                          onChange={e => updateItem(item.id, 'Reference', e.target.value)}
                          className={`w-full border rounded px-2 py-0.5 text-xs font-medium truncate ${
                            isLight 
                              ? 'bg-slate-50 border-slate-300 text-slate-900' 
                              : 'bg-slate-950 border-slate-700/60 text-white'
                          }`}
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.Quantity}
                          onChange={e => updateItem(item.id, 'Quantity', parseInt(e.target.value) || 1)}
                          className={`w-full max-w-[65px] text-center border rounded px-1 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 ${
                            isLight ? 'bg-slate-50 border-slate-300' : 'bg-slate-950 border-slate-700/60'
                          }`}
                        />
                      </td>

                      {/* L */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={item.Length}
                          onChange={e => updateItem(item.id, 'Length', parseFloat(e.target.value) || 1)}
                          className={`w-full max-w-[60px] text-center border rounded px-1 py-0.5 text-xs ${
                            isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700/60 text-slate-200'
                          }`}
                        />
                      </td>

                      {/* W */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={item.Width}
                          onChange={e => updateItem(item.id, 'Width', parseFloat(e.target.value) || 1)}
                          className={`w-full max-w-[60px] text-center border rounded px-1 py-0.5 text-xs ${
                            isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700/60 text-slate-200'
                          }`}
                        />
                      </td>

                      {/* H */}
                      <td className="py-2 px-2 text-center">
                        <div className="relative inline-block w-full max-w-[60px]">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={item.Height}
                            onChange={e => updateItem(item.id, 'Height', parseFloat(e.target.value) || 1)}
                            className={`w-full text-center border rounded px-1 py-0.5 text-xs ${
                              isTooHigh 
                                ? 'border-rose-500 text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/40' 
                                : isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700/60 text-slate-200'
                            }`}
                          />
                          {isTooHigh && (
                            <span title="Exceeds trailer ceiling height!" className="absolute -top-1 -right-1 text-rose-500">
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Weight */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          step="5"
                          min="0.1"
                          value={item.Weight}
                          onChange={e => updateItem(item.id, 'Weight', parseFloat(e.target.value) || 1)}
                          className={`w-full max-w-[65px] text-center border rounded px-1 py-0.5 text-xs ${
                            isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700/60 text-slate-200'
                          }`}
                        />
                      </td>

                      {/* Rotation */}
                      <td className="py-2 px-2 text-center">
                        <select
                          value={item.Rotation}
                          onChange={e => updateItem(item.id, 'Rotation', e.target.value as RotationPolicy)}
                          className={`w-full border rounded px-1 py-0.5 text-[11px] ${
                            isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700/60 text-slate-200'
                          }`}
                        >
                          <option value="Auto (Horizontal)">Auto (Horizontal)</option>
                          <option value="Auto (All)">Auto (All)</option>
                          <option value="Strict: L -> Length">L -&gt; Length</option>
                          <option value="Strict: W -> Length">W -&gt; Length</option>
                        </select>
                      </td>

                      {/* Stackable */}
                      <td className="py-2 px-2 text-center">
                        <select
                          value={item.Stackable}
                          onChange={e => updateItem(item.id, 'Stackable', e.target.value as 'Yes' | 'No')}
                          className={`w-full border rounded px-1 py-0.5 text-xs font-semibold ${
                            item.Stackable === 'Yes' 
                              ? 'text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' 
                              : 'text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700'
                          } ${isLight ? 'bg-slate-50' : 'bg-slate-950'}`}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => duplicateItem(item)}
                            className={`p-1 rounded transition ${
                              isLight ? 'text-slate-400 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Duplicate line"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className={`p-1 rounded transition ${
                              isLight ? 'text-slate-400 hover:text-rose-600 hover:bg-slate-100' : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                            }`}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

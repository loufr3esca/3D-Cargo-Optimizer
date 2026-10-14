import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Box, 
  Play, 
  FileText, 
  Code2, 
  Share2, 
  Flame, 
  CheckCircle2, 
  AlertTriangle,
  Sun,
  Moon,
  FolderOpen,
  Save,
  BookmarkCheck,
  LayoutGrid,
  Columns
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  CargoItem, 
  OptimizationRules, 
  PackedVehicle 
} from './types/optimizer';
import { 
  CONTAINERS, 
  DEFAULT_RULES, 
  runCargoOptimization 
} from './services/packingEngine';
import { ThreeDViewer } from './components/ThreeDViewer';
import { RulesPanel } from './components/RulesPanel';
import { CargoTable } from './components/CargoTable';
import { PdfExportModal } from './components/PdfExportModal';
import { PythonCodeModal } from './components/PythonCodeModal';

const INITIAL_CARGO_ITEMS: CargoItem[] = [
  {
    id: 'item_1',
    Priority: 1,
    Reference: 'Euro Pallet (Standard)',
    Quantity: 36, // 36 units: more than 1 TIR truck (33 pallets max)!
    Length: 120.0,
    Width: 80.0,
    Height: 140.0,
    Weight: 450.0,
    Rotation: 'Auto (Horizontal)',
    Stackable: 'Yes',
    Color: '#4363d8',
  },
  {
    id: 'item_2',
    Priority: 2,
    Reference: 'Half Pallet (Demi)',
    Quantity: 12,
    Length: 80.0,
    Width: 60.0,
    Height: 110.0,
    Weight: 220.0,
    Rotation: 'Auto (Horizontal)',
    Stackable: 'Yes',
    Color: '#3cb44b',
  },
  {
    id: 'item_3',
    Priority: 3,
    Reference: 'Heavy Industrial Crate',
    Quantity: 4,
    Length: 100.0,
    Width: 100.0,
    Height: 90.0,
    Weight: 700.0,
    Rotation: 'Strict: L -> Length',
    Stackable: 'No',
    Color: '#e6194b',
  },
];

export default function App() {
  // Theme State: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const isLight = theme === 'light';

  // State
  const [transportType, setTransportType] = useState<string>('TIR (Semi-trailer)');
  const [maxVehicles, setMaxVehicles] = useState<number>(3);
  const [rules, setRules] = useState<OptimizationRules>(DEFAULT_RULES);
  const [cargoItems, setCargoItems] = useState<CargoItem[]>(INITIAL_CARGO_ITEMS);
  const [colorMap, setColorMap] = useState<Record<string, string>>({
    'Euro Pallet (Standard)': '#4363d8',
    'Half Pallet (Demi)': '#3cb44b',
    'Heavy Industrial Crate': '#e6194b',
  });
  
  // Library State
  const [productLib, setProductLib] = useState<Record<string, any>>({
    'Euro Pallet (Standard)': { Ref: 'Euro Pallet (Standard)', L: 120.0, W: 80.0, H: 140.0, Weight: 450.0, Rotation: 'Auto (Horizontal)', Stackable: 'Yes' },
    'Half Pallet (Demi)': { Ref: 'Half Pallet (Demi)', L: 80.0, W: 60.0, H: 110.0, Weight: 220.0, Rotation: 'Auto (Horizontal)', Stackable: 'Yes' },
    'Heavy Industrial Crate': { Ref: 'Heavy Industrial Crate', L: 100.0, W: 100.0, H: 90.0, Weight: 700.0, Rotation: 'Strict: L -> Length', Stackable: 'No' },
    'Master Carton Box': { Ref: 'Master Carton Box', L: 60.0, W: 40.0, H: 40.0, Weight: 25.0, Rotation: 'Auto (All)', Stackable: 'Yes' },
  });

  // Saved Configurations State
  const [savedConfigs, setSavedConfigs] = useState<Record<string, CargoItem[]>>({
    'Multi-Truck Fleet Order': INITIAL_CARGO_ITEMS,
  });
  const [selectedSavedMix, setSelectedSavedMix] = useState<string>('');

  const [projectName, setProjectName] = useState<string>('Fleet Logistics Order');
  const [vehicles, setVehicles] = useState<PackedVehicle[]>([]);
  const [viewMode, setViewMode] = useState<'all' | 'tabs'>('all');
  const [activeVehicleIndex, setActiveVehicleIndex] = useState<number>(0);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);
  const [unplacedCount, setUnplacedCount] = useState<number>(0);

  // Modals
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [capturedScreenshots, setCapturedScreenshots] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<string | null>(null);

  const currentContainer = CONTAINERS[transportType] || CONTAINERS['TIR (Semi-trailer)'];

  const handleCalculate = () => {
    const sortedCargo = [...cargoItems].sort((a, b) => a.Priority - b.Priority);
    const result = runCargoOptimization(sortedCargo, transportType, maxVehicles, rules);
    setVehicles(result.vehicles);
    setUnplacedCount(result.unplacedItems.length);
    setIsCalculated(true);
    setActiveVehicleIndex(0);

    if (result.vehicles.length > 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  useEffect(() => {
    handleCalculate();
  }, []);

  const handleColorChange = (ref: string, color: string) => {
    setColorMap(prev => ({
      ...prev,
      [ref]: color,
    }));
  };

  const handleSaveCurrentMix = () => {
    if (!projectName.trim() || cargoItems.length === 0) {
      setNotification('Please enter a project name and add items first.');
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setSavedConfigs(prev => ({
      ...prev,
      [projectName.trim()]: cargoItems,
    }));
    setNotification(`Mix '${projectName}' successfully saved!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLoadSelectedMix = () => {
    if (selectedSavedMix && savedConfigs[selectedSavedMix]) {
      const items = savedConfigs[selectedSavedMix];
      setCargoItems(items);
      setProjectName(selectedSavedMix);
      const newColorMap = { ...colorMap };
      items.forEach(i => {
        if (i.Color) newColorMap[i.Reference] = i.Color;
      });
      setColorMap(newColorMap);
      setNotification(`Loaded configuration '${selectedSavedMix}'`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?config=${encodeURIComponent(projectName)}`;
    navigator.clipboard.writeText(shareUrl);
    setNotification('Shareable direct link copied to clipboard!');
    setTimeout(() => setNotification(null), 3000);
  };

  const displayedVehicles = viewMode === 'all' 
    ? vehicles 
    : [vehicles[activeVehicleIndex] || vehicles[0]].filter(Boolean);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* TOP HEADER - Full Width 16:9 */}
      <header className={`border-b sticky top-0 z-40 px-4 xl:px-8 py-3 transition-colors ${
        isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/90 border-slate-800 backdrop-blur-md'
      }`}>
        <div className="w-full max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  3D Cargo Optimizer
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  Multi-Truck 16:9
                </span>
              </div>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                py3dbp Engine &bull; Priority Loading Order &bull; Dynamic Logistics Rules &bull; Firestore Sync
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={() => setTheme(isLight ? 'dark' : 'light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition shadow-sm ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Toggle Light / Dark UI Theme"
            >
              {isLight ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              )}
            </button>

            {/* Firestore status pill */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${
              isLight ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Firestore: <b>optimiseur-3d-app</b></span>
            </div>

            {/* Python code modal */}
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition shadow-sm ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-emerald-500" />
              Python Code (`app.py`)
            </button>

            {/* Landscape PDF Report Button */}
            <button
              onClick={() => setIsPdfModalOpen(true)}
              disabled={!isCalculated || vehicles.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition shadow-sm disabled:opacity-50 ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              Landscape PDF Report
            </button>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/30 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Calculate Fleet
            </button>
          </div>
        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          {notification}
        </div>
      )}

      {/* MAIN CONTENT - WIDESCREEN 16:9 OPTIMIZED */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 xl:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: PARAMETERS, DYNAMIC RULES, CONFIG MANAGEMENT (col 1-4) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-6">
          
          {/* 1. TRANSPORT PARAMETERS */}
          <div className={`rounded-xl p-4 shadow-lg border transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Truck className="w-4 h-4 text-blue-500" />
                1. Transport Parameters
              </h2>
              <span className="text-xs text-slate-400 font-medium">
                Max Fleet: <b>{maxVehicles}</b>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Container / Vehicle Type
                </label>
                <select
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value)}
                  className={`w-full mt-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                >
                  {Object.keys(CONTAINERS).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Maximum Vehicles Allowed
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={maxVehicles}
                  onChange={(e) => setMaxVehicles(parseInt(e.target.value) || 1)}
                  className={`w-full mt-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>
            </div>

            <div className={`mt-3 p-3 rounded-lg border text-xs flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/80 border-slate-800 text-slate-300'
            }`}>
              <div>
                <span className="text-slate-500">Usable Dimensions:</span>{' '}
                <b>{currentContainer.L} × {currentContainer.W} × {currentContainer.H} cm</b>
              </div>
              <div>
                <span className="text-slate-500">Max Weight:</span>{' '}
                <b className="text-emerald-600 dark:text-emerald-400 font-mono">{currentContainer.max_weight.toLocaleString()} kg</b>
              </div>
            </div>
          </div>

          {/* 2. DYNAMIC LOGISTICS RULES ENGINE */}
          <RulesPanel
            rules={rules}
            onChange={setRules}
            onReset={() => setRules(DEFAULT_RULES)}
            theme={theme}
          />

          {/* 3. CONFIGURATION MANAGEMENT */}
          <div className={`rounded-xl p-4 shadow-lg border space-y-3.5 transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
          }`}>
            <h3 className={`text-sm font-semibold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <BookmarkCheck className="w-4 h-4 text-indigo-500" />
              Configuration Management (Firestore Sync)
            </h3>

            {/* Save Current Mix */}
            <div className="space-y-1.5">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Save Current Cargo Mix with Project Name:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g. Weekly Order Batch 4"
                  className={`flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
                <button
                  onClick={handleSaveCurrentMix}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </div>

            {/* Load Saved Mix & Share Link */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Load Saved Mix or Generate Shareable URL:
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedSavedMix}
                  onChange={e => setSelectedSavedMix(e.target.value)}
                  className={`flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                >
                  <option value="">Select a saved mix...</option>
                  {Object.keys(savedConfigs).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                <button
                  onClick={handleLoadSelectedMix}
                  disabled={!selectedSavedMix}
                  className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition flex items-center gap-1 shrink-0 disabled:opacity-40 ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Load
                </button>

                <button
                  onClick={handleShareLink}
                  className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition flex items-center gap-1 shrink-0 ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: 16:9 CARGO MANIFEST & MULTI-TRUCK 3D VISUALIZER (col 5-12) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-6 w-full">

          {/* 1. CARGO MANIFEST */}
          <CargoTable
            items={cargoItems}
            onChange={setCargoItems}
            colorMap={colorMap}
            onColorChange={handleColorChange}
            ceilingHeight={currentContainer.H}
            theme={theme}
            productLib={productLib}
            onSaveProductToLib={(prod) => {
              setProductLib(prev => ({
                ...prev,
                [prod.Ref]: prod,
              }));
              setNotification(`Saved '${prod.Ref}' to product library!`);
              setTimeout(() => setNotification(null), 3000);
            }}
            onUpdateLibrary={setProductLib}
          />

          {/* 2. 3D OPTIMIZATION RESULTS - MULTI-TRUCK SIMULTANEOUS DISPLAY */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Box className="w-5 h-5 text-blue-500" />
                  Fleet Packing 3D Visualizer
                </h2>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {vehicles.length > 0 
                    ? `Showing ${vehicles.length} vehicle(s) deployed for this cargo manifesto`
                    : 'Click Calculate Fleet to generate 3D models'}
                </p>
              </div>

              {/* View Mode Controls: All Trucks Stacked vs Tab Switcher */}
              {vehicles.length > 1 && (
                <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs ${
                  isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-900 border-slate-800'
                }`}>
                  <button
                    onClick={() => setViewMode('all')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition ${
                      viewMode === 'all' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    All Trucks Stacked ({vehicles.length})
                  </button>

                  <button
                    onClick={() => setViewMode('tabs')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition ${
                      viewMode === 'tabs' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Tabs View
                  </button>
                </div>
              )}
            </div>

            {/* If in Tabs mode, show the vehicle buttons */}
            {viewMode === 'tabs' && vehicles.length > 1 && (
              <div className={`flex items-center gap-2 p-1.5 rounded-xl border overflow-x-auto ${
                isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-900 border-slate-800'
              }`}>
                {vehicles.map((v, idx) => (
                  <button
                    key={v.vehicleId}
                    onClick={() => setActiveVehicleIndex(idx)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                      activeVehicleIndex === idx
                        ? 'bg-blue-600 text-white shadow-md'
                        : isLight ? 'bg-white text-slate-700 border border-slate-300' : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    🚚 Vehicle #{idx + 1}: {v.name} ({v.items.length} units &bull; {v.volFillRate.toFixed(1)}%)
                  </button>
                ))}
              </div>
            )}

            {/* Unplaced items alert if any */}
            {unplacedCount > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  <b>Fleet Capacity Alert:</b> {unplacedCount} items could not fit inside the currently allocated {maxVehicles} vehicle(s). Increase maximum vehicles to pack everything.
                </span>
              </div>
            )}

            {/* RENDER ALL VEHICLES (Stacked or Tabbed) */}
            {displayedVehicles.length > 0 ? (
              <div className="space-y-8">
                {displayedVehicles.map((vehicle, vIdx) => {
                  const actualIndex = viewMode === 'all' ? vIdx : activeVehicleIndex;

                  return (
                    <div 
                      key={vehicle.vehicleId} 
                      className={`p-4 rounded-2xl border shadow-lg space-y-3.5 transition-colors ${
                        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      {/* Truck Title & Summary Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-blue-600 text-white font-bold text-xs">
                            #{actualIndex + 1}
                          </div>
                          <div>
                            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              Vehicle #{actualIndex + 1}: {vehicle.name}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {vehicle.items.length} packed units &bull; Dimensions: {vehicle.container.L} × {vehicle.container.W} × {vehicle.container.H} cm
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            vehicle.volFillRate >= 90
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400'
                          }`}>
                            Fill Rate: {vehicle.volFillRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* 4 Metric Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className={`p-3 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                        }`}>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Volume Fill Rate</span>
                          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                            {vehicle.volFillRate.toFixed(1)}%
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {(vehicle.usedVolume / 1e6).toFixed(1)} / {(vehicle.totalVolume / 1e6).toFixed(1)} m³
                          </span>
                        </div>

                        <div className={`p-3 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                        }`}>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Used Length</span>
                          <div className={`text-xl font-black mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {vehicle.usedLength.toFixed(1)} <span className="text-xs font-normal text-slate-500">cm</span>
                          </div>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Solid Blue Line</span>
                        </div>

                        <div className={`p-3 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                        }`}>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Remaining Space</span>
                          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {vehicle.remainingLength.toFixed(1)} <span className="text-xs font-normal text-slate-500">cm</span>
                          </div>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Dashed Green Line</span>
                        </div>

                        <div className={`p-3 rounded-xl border ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                        }`}>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">Loaded Weight</span>
                          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {vehicle.totalWeight.toLocaleString()} <span className="text-xs font-normal text-slate-500">kg</span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {vehicle.weightFillRate.toFixed(1)}% of max capacity
                          </span>
                        </div>
                      </div>

                      {/* 3D Visualizer Canvas for this vehicle */}
                      <ThreeDViewer
                        vehicle={vehicle}
                        colorMap={colorMap}
                        theme={theme}
                        onSnapshotTaken={(dataUrl) => {
                          setCapturedScreenshots(prev => ({
                            ...prev,
                            [vehicle.vehicleId]: dataUrl,
                          }));
                        }}
                      />

                      {/* Cargo Legend Breakdown */}
                      <div className={`p-3 rounded-xl flex flex-wrap items-center gap-2.5 text-xs border ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
                      }`}>
                        <span className="text-slate-500 font-medium">Cargo on #{actualIndex + 1}:</span>
                        {Array.from(new Set(vehicle.items.map(i => i.originalRef))).map(ref => {
                          const count = vehicle.items.filter(i => i.originalRef === ref).length;
                          const color = colorMap[ref] || '#3b82f6';
                          return (
                            <div key={ref} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${
                              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                            }`}>
                              <span className="w-2.5 h-2.5 rounded-sm inline-block shadow-sm" style={{ backgroundColor: color }} />
                              <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{ref}</span>
                              <span className="text-slate-500">({count})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`rounded-xl p-12 text-center border ${
                isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}>
                Click <b>&quot;Calculate Fleet&quot;</b> to run 3D packing optimization.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODALS */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        cargoItems={cargoItems}
        vehicles={vehicles}
        projectName={projectName}
        capturedScreenshots={capturedScreenshots}
        theme={theme}
      />

      <PythonCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}

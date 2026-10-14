import React from 'react';
import { Sliders, RefreshCw } from 'lucide-react';
import { OptimizationRules } from '../types/optimizer';

interface Props {
  rules: OptimizationRules;
  onChange: (rules: OptimizationRules) => void;
  onReset: () => void;
  theme?: 'dark' | 'light';
}

export const RulesPanel: React.FC<Props> = ({ rules, onChange, onReset, theme = 'dark' }) => {
  const isLight = theme === 'light';

  const updateRule = <K extends keyof OptimizationRules>(key: K, value: OptimizationRules[K]) => {
    onChange({
      ...rules,
      [key]: value,
    });
  };

  const applyPreset = (preset: 'standard' | 'high_density' | 'fragile') => {
    if (preset === 'standard') {
      onChange({
        rear_buffer_cm: 25.0,
        enable_80cm_rule: true,
        bonus_weight: 50000.0,
        enable_euro_grid: true,
        enable_gravity_slide: true,
        enable_strict_collision: true,
        enable_overhead_protection: true,
      });
    } else if (preset === 'high_density') {
      onChange({
        rear_buffer_cm: 5.0,
        enable_80cm_rule: true,
        bonus_weight: 80000.0,
        enable_euro_grid: true,
        enable_gravity_slide: true,
        enable_strict_collision: true,
        enable_overhead_protection: false,
      });
    } else if (preset === 'fragile') {
      onChange({
        rear_buffer_cm: 35.0,
        enable_80cm_rule: true,
        bonus_weight: 40000.0,
        enable_euro_grid: false,
        enable_gravity_slide: false,
        enable_strict_collision: true,
        enable_overhead_protection: true,
      });
    }
  };

  return (
    <div className={`rounded-xl p-4 shadow-lg space-y-4 border transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
    }`}>
      <div className={`flex items-center justify-between border-b pb-3 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-500">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Dynamic Logistics Rules & Heuristics
            </h3>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Fine-tune packing engine parameters live
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition ${
            isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Reset to recommended defaults"
        >
          <RefreshCw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className={`text-[11px] font-medium whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
          Presets:
        </span>
        <button
          onClick={() => applyPreset('standard')}
          className={`px-2.5 py-1 rounded-md transition whitespace-nowrap border text-xs ${
            isLight 
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
          }`}
        >
          🚛 Standard TIR (33p)
        </button>
        <button
          onClick={() => applyPreset('high_density')}
          className={`px-2.5 py-1 rounded-md transition whitespace-nowrap border text-xs ${
            isLight 
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
          }`}
        >
          ⚡ Maximum Density
        </button>
        <button
          onClick={() => applyPreset('fragile')}
          className={`px-2.5 py-1 rounded-md transition whitespace-nowrap border text-xs ${
            isLight 
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
          }`}
        >
          🛡️ Cargo Safety
        </button>
      </div>

      <div className="space-y-3 pt-1">
        {/* 1. Rear Door Buffer */}
        <div className={`p-3 rounded-lg border space-y-2 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <label className={`font-medium flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <span>🚪 Rear Door Clearance Buffer (`rear_buffer_cm`)</span>
            </label>
            <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs ${
              isLight 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-blue-950/60 text-blue-400 border-blue-800/50'
            }`}>
              {rules.rear_buffer_cm.toFixed(1)} cm
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={rules.rear_buffer_cm}
            onChange={(e) => updateRule('rear_buffer_cm', parseFloat(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <p className={`text-[11px] leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Penalizes placement beyond (Length - {rules.rear_buffer_cm} cm) to force compact 90° rotations near rear doors.
          </p>
        </div>

        {/* 2. 80cm Width Alignment Rule */}
        <div className={`p-3 rounded-lg border space-y-2 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              📐 80cm Width Alignment Rule
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rules.enable_80cm_rule}
                onChange={(e) => updateRule('enable_80cm_rule', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          {rules.enable_80cm_rule && (
            <div className={`pt-2 space-y-1.5 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/60'}`}>
              <div className="flex items-center justify-between text-[11px]">
                <span className={isLight ? 'text-slate-600' : 'text-slate-300'}>Placement Score Bonus:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{rules.bonus_weight.toLocaleString()} pts</span>
              </div>
              <input
                type="range"
                min={5000}
                max={150000}
                step={5000}
                value={rules.bonus_weight}
                onChange={(e) => updateRule('bonus_weight', parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className={`text-[11px] leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Encourages 3 pallets side-by-side (3 × 80 = 240 cm) in trailers ≥ 240 cm wide.
              </p>
            </div>
          )}
        </div>

        {/* 3. Europallet Strategy & Gravity Slide */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`p-3 rounded-lg border space-y-1.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>🧩 Pinwheel Grid</span>
              <input
                type="checkbox"
                checked={rules.enable_euro_grid}
                onChange={(e) => updateRule('enable_euro_grid', e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </div>
            <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Standard 120×80 slots for 20FT, 40FT &amp; TIR 33p.
            </p>
          </div>

          <div className={`p-3 rounded-lg border space-y-1.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>🧲 Gravity Slide</span>
              <input
                type="checkbox"
                checked={rules.enable_gravity_slide}
                onChange={(e) => updateRule('enable_gravity_slide', e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </div>
            <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Compacts cargo forward along X until contact.
            </p>
          </div>
        </div>

        {/* 4. Strict Collision & Stacking Strictness */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`p-3 rounded-lg border space-y-1.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>🛡️ 3D Anti-Collision</span>
              <input
                type="checkbox"
                checked={rules.enable_strict_collision}
                onChange={(e) => updateRule('enable_strict_collision', e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </div>
            <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Strict spatial non-overlap checking.
            </p>
          </div>

          <div className={`p-3 rounded-lg border space-y-1.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>🚫 Overhead Protect</span>
              <input
                type="checkbox"
                checked={rules.enable_overhead_protection}
                onChange={(e) => updateRule('enable_overhead_protection', e.target.checked)}
                className="rounded accent-blue-600 cursor-pointer"
              />
            </div>
            <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Blocks stacking on top of non-stackables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

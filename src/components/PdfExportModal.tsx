import React, { useState } from 'react';
import { X, Printer, Image as ImageIcon, FileText, Upload } from 'lucide-react';
import { CargoItem, PackedVehicle } from '../types/optimizer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cargoItems: CargoItem[];
  vehicles: PackedVehicle[];
  projectName: string;
  capturedScreenshots: Record<string, string>;
  theme?: 'dark' | 'light';
}

export const PdfExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  cargoItems,
  vehicles,
  projectName,
  capturedScreenshots,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [reportTitle, setReportTitle] = useState(projectName || 'Standard Logistics Project');
  const [uploadedScreenshots, setUploadedScreenshots] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const totalPackages = cargoItems.reduce((acc, cur) => acc + cur.Quantity, 0);
  const totalWeight = cargoItems.reduce((acc, cur) => acc + (cur.Quantity * cur.Weight), 0);

  const handleFileUpload = (vehicleId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedScreenshots(prev => ({
            ...prev,
            [vehicleId]: event.target!.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border ${
        isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-500 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Landscape PDF Report (A4 Format)
              </h2>
              <p className="text-xs text-slate-500">Fleet packing optimization preview &amp; manifest</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition ${
                isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Controls */}
        <div className={`px-6 py-3 border-b flex items-center justify-between gap-4 text-xs ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/40 border-slate-800'
        }`}>
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <label className="text-slate-500 whitespace-nowrap">Project Title:</label>
            <input
              type="text"
              value={reportTitle}
              onChange={e => setReportTitle(e.target.value)}
              className={`w-full border rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
              }`}
            />
          </div>
          <div className="text-slate-500">
            Forced print orientation: <b>A4 Landscape (297 × 210 mm)</b>
          </div>
        </div>

        {/* Printable Paper Preview */}
        <div className={`flex-1 overflow-y-auto p-6 flex justify-center ${
          isLight ? 'bg-slate-200' : 'bg-slate-950'
        }`}>
          <div className="print-area w-full max-w-4xl bg-white text-slate-900 p-8 rounded-xl shadow-2xl space-y-8 font-sans">
            
            {/* PAGE 1: TITLE & MANIFEST TABLE */}
            <div className="space-y-6">
              <div className="border-b-2 border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    3D Cargo Optimization Report - {reportTitle}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Multi-Vehicle Packing System &bull; Generated: {new Date().toLocaleDateString('en-US')}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-700 bg-slate-100 p-2.5 rounded-lg border border-slate-300">
                  <div>Total Packages: <b>{totalPackages}</b></div>
                  <div>Total Weight: <b>{totalWeight.toLocaleString()} kg</b></div>
                  <div>Fleet Deployed: <b>{vehicles.length} vehicle(s)</b></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">
                  Cargo Summary Table
                </h3>
                <div className="overflow-x-auto border border-slate-300 rounded">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="bg-[#E6E6E6] text-slate-800 font-bold border-b border-slate-300">
                        <th className="p-2 border-r border-slate-300 text-center w-12">Prio</th>
                        <th className="p-2 border-r border-slate-300 text-center w-12">Qty</th>
                        <th className="p-2 border-r border-slate-300">Reference</th>
                        <th className="p-2 border-r border-slate-300 text-center w-16">L (cm)</th>
                        <th className="p-2 border-r border-slate-300 text-center w-16">W (cm)</th>
                        <th className="p-2 border-r border-slate-300 text-center w-16">H (cm)</th>
                        <th className="p-2 border-r border-slate-300 text-center w-20">Wgt (kg)</th>
                        <th className="p-2 border-r border-slate-300 text-center">Rotation</th>
                        <th className="p-2 text-center w-16">Stack</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargoItems.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2 border-r border-b border-slate-200 text-center font-medium">{item.Priority}</td>
                          <td className="p-2 border-r border-b border-slate-200 text-center font-bold text-blue-700">{item.Quantity}</td>
                          <td className="p-2 border-r border-b border-slate-200 font-semibold">{item.Reference}</td>
                          <td className="p-2 border-r border-b border-slate-200 text-center">{item.Length}</td>
                          <td className="p-2 border-r border-b border-slate-200 text-center">{item.Width}</td>
                          <td className="p-2 border-r border-b border-slate-200 text-center">{item.Height}</td>
                          <td className="p-2 border-r border-b border-slate-200 text-center">{item.Weight}</td>
                          <td className="p-2 border-r border-b border-slate-200 text-center text-[10px]">
                            {item.Rotation.replace('Auto (Horizontal)', 'Auto(H)').replace('Strict: L -> Length', 'L->Length').replace('Strict: W -> Length', 'W->Length')}
                          </td>
                          <td className="p-2 border-b border-slate-200 text-center font-medium">
                            {item.Stackable === 'Yes' ? 'Yes' : 'No'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* VEHICLE PAGES */}
            {vehicles.map((v, vIdx) => {
              const screenshotImg = uploadedScreenshots[v.vehicleId] || capturedScreenshots[v.vehicleId];

              return (
                <div key={v.vehicleId} className="pt-8 border-t-2 border-dashed border-slate-300 space-y-4">
                  <div className="flex items-center justify-between bg-slate-100 p-3 rounded-lg border border-slate-300">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Vehicle #{vIdx + 1}: {v.name}
                      </h2>
                      <p className="text-xs text-slate-600">
                        Usable Dimensions: {v.container.L} x {v.container.W} x {v.container.H} cm | Max {v.container.max_weight.toLocaleString()} kg
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-bold text-blue-700 text-sm">Fill Rate: {v.volFillRate.toFixed(1)}%</span>
                      <div className="text-slate-600">
                        Used Length: <b>{v.usedLength.toFixed(1)} cm</b> | Remaining Space: <b>{v.remainingLength.toFixed(1)} cm</b>
                      </div>
                      <div className="text-slate-600">
                        Loaded Weight: <b>{v.totalWeight.toLocaleString()} kg</b> ({v.weightFillRate.toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  {/* 3D Screenshot Slot */}
                  <div className="border border-slate-300 rounded-lg p-2 bg-slate-50 min-h-[220px] flex flex-col items-center justify-center">
                    {screenshotImg ? (
                      <div className="w-full">
                        <img
                          src={screenshotImg}
                          alt={`3D View ${v.name}`}
                          className="w-full h-auto max-h-[380px] object-contain rounded"
                        />
                        <p className="text-[10px] text-center text-slate-500 mt-1 italic">
                          3D Interactive Packing Layout ({v.name})
                        </p>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 space-y-2">
                        <ImageIcon className="w-8 h-8 mx-auto text-slate-400" />
                        <p className="text-xs font-medium">No 3D screenshot attached for this vehicle yet.</p>
                        <p className="text-[11px] text-slate-400">
                          Use the &quot;Capture PNG&quot; button in the 3D viewer or upload a screenshot image below:
                        </p>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100 transition shadow-sm">
                          <Upload className="w-3.5 h-3.5" />
                          Upload PNG Screenshot
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={(e) => handleFileUpload(v.vehicleId, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

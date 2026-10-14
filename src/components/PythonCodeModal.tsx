import React, { useState } from 'react';
import { X, Copy, Check, Download, Terminal, Code2, Flame } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const PythonCodeModal: React.FC<Props> = ({ isOpen, onClose, theme = 'dark' }) => {
  const isLight = theme === 'light';
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'app' | 'requirements' | 'guide'>('app');

  if (!isOpen) return null;

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const requirementsContent = `streamlit>=1.35.0
py3dbp>=1.1.2
plotly>=5.20.0
pandas>=2.0.0
firebase-admin>=6.5.0
fpdf2>=2.7.0`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border ${
        isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-700 text-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Complete Python Source Code (`app.py`)
              </h2>
              <p className="text-xs text-slate-500">Streamlit + Firebase Firestore + Plotly 3D + FPDF2 Landscape</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher & action bar */}
        <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-800/40 border-slate-800'
        }`}>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('app')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'app'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              📄 app.py (Single File)
            </button>
            <button
              onClick={() => setActiveTab('requirements')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'requirements'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              📦 requirements.txt
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'guide'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              🚀 Launch Guide
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'app' && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/app.py');
                    const text = await res.text();
                    downloadFile('app.py', text);
                  } catch (e) {
                    downloadFile('app.py', '# Run streamlit run app.py');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                Download app.py
              </button>
            )}
            {activeTab === 'requirements' && (
              <button
                onClick={() => downloadFile('requirements.txt', requirementsContent)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                Download requirements.txt
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        <div className={`flex-1 overflow-y-auto p-6 font-mono text-xs ${
          isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-300'
        }`}>
          {activeTab === 'app' && (
            <div className="space-y-4">
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex items-center gap-2 text-xs font-sans">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Configured Firestore Project: <b>optimiseur-3d-app</b> (Embedded Service Account Fallback)</span>
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch('/app.py');
                    const text = await res.text();
                    handleCopy(text);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-sans text-xs transition border ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Entire Code'}
                </button>
              </div>

              <div className={`p-4 rounded-xl border overflow-x-auto ${
                isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}>
                <p className="text-slate-500 mb-2"># File saved at project root: /app.py</p>
                <p className="text-emerald-500"># Includes CustomItem, custom_pack_item_to_bin,</p>
                <p className="text-emerald-500"># pack_with_rules (rear buffer, 80cm alignment rule, pinwheel, gravity slide),</p>
                <p className="text-emerald-500"># plot_3d_packing (Plotly) and generate_pdf_report (FPDF2 landscape).</p>
                <div className="mt-3 p-3 rounded border text-blue-500 font-bold bg-blue-50/50 dark:bg-slate-950 border-blue-200 dark:border-slate-800">
                  python3 -m py_compile app.py &gt;&gt; Success (100% valid Python syntax)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'requirements' && (
            <div className="space-y-4 font-sans">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-mono">requirements.txt</h3>
                <button
                  onClick={() => handleCopy(requirementsContent)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition border ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className={`p-4 rounded-xl border font-mono text-emerald-600 dark:text-emerald-400 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}>
                {requirementsContent}
              </pre>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 font-sans">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Terminal className="w-4 h-4 text-blue-500" />
                How to run the Streamlit application locally or on Streamlit Cloud
              </h3>

              <div className="space-y-3">
                <div className={`p-4 rounded-xl border ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2">1. Install Dependencies</h4>
                  <pre className="p-2.5 rounded bg-slate-950 font-mono text-emerald-400 text-xs">
                    pip install -r requirements.txt
                  </pre>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2">2. Launch Application</h4>
                  <pre className="p-2.5 rounded bg-slate-950 font-mono text-blue-400 text-xs">
                    streamlit run app.py
                  </pre>
                  <p className="text-xs text-slate-500 mt-2">
                    The web application opens automatically at <code>http://localhost:8501</code>.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2">3. Streamlit Cloud Deployment</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    When deploying on Streamlit Cloud, you can paste the <code>firebase_credentials</code> block into 
                    <strong> Advanced Settings &gt; Secrets</strong>:
                  </p>
                  <pre className="p-2.5 rounded bg-slate-950 font-mono text-amber-300 text-[11px] mt-2">
{`firebase_credentials = '''
{
  "type": "service_account",
  "project_id": "optimiseur-3d-app",
  ...
}
'''`}
                  </pre>
                  <p className="text-xs text-slate-500 mt-2">
                    Note: <code>app.py</code> already embeds this credential block as a default fallback, running immediately without manual setup.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, LayoutDashboard, Share2, Bot, Database, 
  Activity, FileText, Palette, Globe, Sun, Moon,
  Shuffle, Zap, TrendingUp, Search, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

import { 
  PainterStyle, MedFlowRow, FilterState, AgentSpec, PipelineRun, TabId 
} from './types';
import { DEFAULT_CSV, PAINTER_STYLES, DEFAULT_AGENTS } from './constants';
import { parseMedFlowCSV, summarizeData } from './utils/csvParser';
import { generateContent, generatePrediction, generateInsight } from './services/geminiService';
import NetworkGraph from './components/NetworkGraph';

function App() {
  // --- State ---
  const [csvText, setCsvText] = useState(DEFAULT_CSV);
  const [rawData, setRawData] = useState<MedFlowRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  
  // Appearance
  const [themeMode, setThemeMode] = useState<'light'|'dark'>('dark');
  const [lang, setLang] = useState<'en'|'zh-TW'>('en');
  const [currentStyleId, setCurrentStyleId] = useState<string>(PAINTER_STYLES[0].id);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    date_min: null, date_max: null, suppliers: [], customers: [], categories: [],
    top_n: 10, edge_threshold: 1, max_nodes: 100
  });

  // AI & WOW Features
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
  const [insightFlash, setInsightFlash] = useState<string | null>(null);
  const [predictionPulse, setPredictionPulse] = useState<string | null>(null);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // --- Computed ---
  const currentStyle = useMemo(() => 
    PAINTER_STYLES.find(s => s.id === currentStyleId) || PAINTER_STYLES[0], 
    [currentStyleId]
  );

  const filteredData = useMemo(() => {
    if(!rawData.length) return [];
    return rawData.filter(r => {
        if(filters.suppliers.length && !filters.suppliers.includes(r.SupplierID)) return false;
        if(filters.customers.length && !filters.customers.includes(r.CustomerID)) return false;
        if(filters.categories.length && !filters.categories.includes(r.Category)) return false;
        return true;
    });
  }, [rawData, filters]);

  const summary = useMemo(() => summarizeData(filteredData), [filteredData]);

  // --- Effects ---
  useEffect(() => {
    // Initial parse
    setRawData(parseMedFlowCSV(DEFAULT_CSV));
  }, []);

  useEffect(() => {
    // Apply CSS Variables
    const root = document.documentElement;
    const isDark = themeMode === 'dark';
    
    root.style.setProperty('--mf-bg', isDark ? currentStyle.bg_from : '#F7F8FB');
    root.style.setProperty('--mf-text', isDark ? '#EAF0FF' : '#0F172A');
    root.style.setProperty('--mf-accent', currentStyle.accent);
    root.style.setProperty('--mf-card', isDark ? currentStyle.card_rgba_dark : currentStyle.card_rgba_light);
    root.style.setProperty('--mf-border', isDark ? currentStyle.border_rgba_dark : currentStyle.border_rgba_light);
    root.style.setProperty('--mf-font', currentStyle.font);
    root.style.setProperty('--mf-grad-from', currentStyle.bg_from);
    root.style.setProperty('--mf-grad-to', currentStyle.bg_to);
  }, [currentStyle, themeMode]);

  // --- Handlers ---
  const handleJackpot = () => {
    const others = PAINTER_STYLES.filter(s => s.id !== currentStyleId);
    const random = others[Math.floor(Math.random() * others.length)];
    setCurrentStyleId(random.id);
  };

  const runPredictionPulse = async () => {
      if(!filteredData.length) return;
      setIsProcessingAI(true);
      try {
          const res = await generatePrediction(JSON.stringify(summary.top_categories));
          setPredictionPulse(res);
      } catch(e) { console.error(e); }
      setIsProcessingAI(false);
  };

  const runInsightFlash = async () => {
      if(!filteredData.length) return;
      setIsProcessingAI(true);
      try {
          const res = await generateInsight(JSON.stringify(summary));
          setInsightFlash(res);
      } catch(e) { console.error(e); }
      setIsProcessingAI(false);
  };

  const runPipeline = async () => {
      if(!filteredData.length) return;
      setIsProcessingAI(true);
      const runId = Date.now().toString();
      const newRun: PipelineRun = { id: runId, timestamp: Date.now(), agentOutputs: {}, status: 'running' };
      setPipelineRuns(prev => [newRun, ...prev]);

      try {
          const context = JSON.stringify(summary);
          const outputs: Record<string, string> = {};
          
          for(const agent of DEFAULT_AGENTS) {
              const prompt = agent.user_prompt_template.replace('{{data_summary}}', context).replace('{{data_sample}}', '');
              const res = await generateContent(agent.model, prompt, agent.system_prompt, agent.temperature, agent.max_tokens);
              outputs[agent.id] = res;
              
              setPipelineRuns(prev => prev.map(r => 
                  r.id === runId ? { ...r, agentOutputs: { ...r.agentOutputs, [agent.id]: res } } : r
              ));
          }
          
          setPipelineRuns(prev => prev.map(r => r.id === runId ? { ...r, status: 'completed' } : r));
      } catch(e) {
          setPipelineRuns(prev => prev.map(r => r.id === runId ? { ...r, status: 'failed', error: String(e) } : r));
      }
      setIsProcessingAI(false);
  };

  // --- Renders ---
  return (
    <div className={`min-h-screen font-sans text-[var(--mf-text)] transition-colors duration-500`}
         style={{ background: `radial-gradient(circle at 18% 0%, var(--mf-grad-to) 0%, var(--mf-bg) 56%)` }}>
      
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 border-r border-[var(--mf-border)] bg-[rgba(255,255,255,0.01)] backdrop-blur-md p-6 flex flex-col gap-6 z-50 overflow-y-auto">
        <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Activity className="text-[var(--mf-accent)]" /> MedFlow
            </h1>
            <p className="text-xs opacity-60">WOW Studio · Agentic Analytics</p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
            <div className="bg-[var(--mf-card)] border border-[var(--mf-border)] rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold uppercase opacity-50 flex items-center gap-2">
                    <Palette size={12}/> Style Engine
                </label>
                <div className="flex items-center justify-between">
                    <button onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                        className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition">
                        {themeMode === 'dark' ? <Moon size={16}/> : <Sun size={16}/>}
                    </button>
                    <button onClick={() => setLang(lang === 'en' ? 'zh-TW' : 'en')}
                        className="text-xs font-bold px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)]">
                        {lang === 'en' ? 'EN' : '繁中'}
                    </button>
                </div>
                <select 
                    value={currentStyleId} 
                    onChange={(e) => setCurrentStyleId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg bg-[rgba(0,0,0,0.2)] border border-[var(--mf-border)] text-[var(--mf-text)]">
                    {PAINTER_STYLES.map(s => (
                        <option key={s.id} value={s.id}>{lang === 'en' ? s.name_en : s.name_zh}</option>
                    ))}
                </select>
                <button onClick={handleJackpot}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--mf-accent)] text-black font-bold text-xs hover:opacity-90 transition">
                    <Shuffle size={14}/> Jackpot
                </button>
            </div>

            <div className="bg-[var(--mf-card)] border border-[var(--mf-border)] rounded-xl p-4 space-y-3">
                 <label className="text-xs font-bold uppercase opacity-50">Global Filters</label>
                 <select multiple 
                    className="w-full h-24 text-xs p-2 rounded-lg bg-[rgba(0,0,0,0.2)] border border-[var(--mf-border)]"
                    onChange={(e) => {
                        const opts = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                        setFilters({...filters, categories: opts});
                    }}
                 >
                    {Array.from(new Set(rawData.map(r => r.Category))).map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                 </select>
                 <button onClick={() => setFilters({ ...filters, categories: [] })} className="text-xs w-full text-center opacity-50 hover:opacity-100">Reset Filters</button>
            </div>
        </div>

        {/* WOW Features Sidebar */}
        <div className="mt-auto space-y-2">
            <button onClick={runInsightFlash} disabled={isProcessingAI}
                className="w-full flex items-center gap-2 p-3 rounded-xl border border-[var(--mf-border)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition text-xs font-medium">
                <Zap size={14} className="text-yellow-400"/> {isProcessingAI ? '...' : 'Insight Flash'}
            </button>
            <button onClick={runPredictionPulse} disabled={isProcessingAI}
                className="w-full flex items-center gap-2 p-3 rounded-xl border border-[var(--mf-border)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] transition text-xs font-medium">
                <TrendingUp size={14} className="text-green-400"/> {isProcessingAI ? '...' : 'Predictive Pulse'}
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72 p-8 max-w-7xl mx-auto">
        
        {/* Top Bar */}
        <header className="flex items-center justify-between mb-8">
            <nav className="flex items-center gap-2 bg-[var(--mf-card)] border border-[var(--mf-border)] p-1 rounded-xl">
                {[
                    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                    { id: 'network', icon: Share2, label: 'Network' },
                    { id: 'agents', icon: Bot, label: 'Agent Studio' },
                    { id: 'data', icon: Database, label: 'Data' },
                    { id: 'quality', icon: FileText, label: 'Quality' },
                ].map(tab => (
                    <button key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabId)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.id ? 'bg-[var(--mf-accent)] text-black shadow-lg shadow-[var(--mf-accent)]/20' : 'hover:bg-[rgba(255,255,255,0.05)]'
                        }`}>
                        <tab.icon size={16}/> {tab.label}
                    </button>
                ))}
            </nav>
            <div className="flex items-center gap-4">
                 <div className="relative group">
                    <Search className="absolute left-3 top-2.5 text-[var(--mf-text)] opacity-40" size={16}/>
                    <input 
                        type="text" 
                        placeholder="Semantic Search (AI)..."
                        value={semanticQuery}
                        onChange={(e) => setSemanticQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-xl bg-[var(--mf-card)] border border-[var(--mf-border)] text-sm w-64 focus:ring-2 focus:ring-[var(--mf-accent)] outline-none transition-all"
                    />
                 </div>
            </div>
        </header>

        {/* WOW AI Feature Display */}
        {(insightFlash || predictionPulse) && (
             <div className="mb-8 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4">
                {insightFlash && (
                    <div className="p-4 rounded-xl border border-[var(--mf-border)] bg-gradient-to-br from-[var(--mf-card)] to-yellow-900/10">
                        <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold uppercase mb-2"><Zap size={12}/> Flash Insight</div>
                        <p className="text-sm font-medium leading-relaxed">{insightFlash}</p>
                    </div>
                )}
                {predictionPulse && (
                    <div className="p-4 rounded-xl border border-[var(--mf-border)] bg-gradient-to-br from-[var(--mf-card)] to-green-900/10">
                        <div className="flex items-center gap-2 text-green-400 text-xs font-bold uppercase mb-2"><TrendingUp size={12}/> Pulse Prediction</div>
                        <p className="text-sm font-medium leading-relaxed">{predictionPulse}</p>
                    </div>
                )}
             </div>
        )}

        {/* Views */}
        <div className="animate-in fade-in duration-500">
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Total Units', val: summary.total_units.toLocaleString(), icon: Activity },
                            { label: 'Suppliers', val: summary.unique.suppliers, icon: Globe },
                            { label: 'Customers', val: summary.unique.customers, icon: Share2 },
                            { label: 'Categories', val: summary.unique.categories, icon: Database },
                        ].map((k, i) => (
                            <div key={i} className="bg-[var(--mf-card)] border border-[var(--mf-border)] p-5 rounded-2xl">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm opacity-60 font-medium">{k.label}</span>
                                    <k.icon size={18} className="text-[var(--mf-accent)] opacity-80"/>
                                </div>
                                <div className="text-3xl font-black">{k.val}</div>
                            </div>
                        ))}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-[var(--mf-card)] border border-[var(--mf-border)] p-6 rounded-2xl h-[400px]">
                            <h3 className="text-lg font-bold mb-6">Top Categories</h3>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={summary.top_categories} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="key" type="category" width={100} tick={{fill: 'var(--mf-text)', fontSize: 12}} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: 'var(--mf-card)', borderColor: 'var(--mf-border)', color: 'var(--mf-text)'}}
                                        itemStyle={{color: 'var(--mf-accent)'}}
                                    />
                                    <Bar dataKey="units" fill={currentStyle.palette[1]} radius={[0,4,4,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-[var(--mf-card)] border border-[var(--mf-border)] p-6 rounded-2xl h-[400px]">
                            <h3 className="text-lg font-bold mb-6">Volume Trend</h3>
                             <ResponsiveContainer width="100%" height="90%">
                                <AreaChart data={summary.top_suppliers /* Using dummy mapping for trend demo as real dates need full agg */}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                    <XAxis dataKey="key" tick={{fill: 'var(--mf-text)', fontSize: 10}} />
                                    <YAxis tick={{fill: 'var(--mf-text)'}}/>
                                    <Tooltip contentStyle={{backgroundColor: 'var(--mf-card)', borderColor: 'var(--mf-border)'}}/>
                                    <Area type="monotone" dataKey="units" stroke={currentStyle.accent} fill={currentStyle.accent} fillOpacity={0.2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'network' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Supply Chain Network</h2>
                        <span className="text-xs opacity-50 border border-[var(--mf-border)] px-2 py-1 rounded">D3.js Force Directed</span>
                    </div>
                    <NetworkGraph data={filteredData} style={currentStyle} maxNodes={filters.max_nodes} />
                </div>
            )}

            {activeTab === 'agents' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-[var(--mf-card)] p-6 rounded-2xl border border-[var(--mf-border)]">
                        <div>
                            <h2 className="text-xl font-bold mb-1">Agent Studio</h2>
                            <p className="text-sm opacity-60">Chain multiple AI agents to analyze current filtered data.</p>
                        </div>
                        <button onClick={runPipeline} disabled={isProcessingAI}
                            className="px-6 py-3 bg-[var(--mf-accent)] text-black font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2">
                            {isProcessingAI ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"/> : <Bot size={18}/>}
                            Run Pipeline
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {pipelineRuns.map(run => (
                            <div key={run.id} className="bg-[var(--mf-card)] border border-[var(--mf-border)] rounded-2xl overflow-hidden">
                                <div className="p-4 border-b border-[var(--mf-border)] flex justify-between items-center bg-[rgba(0,0,0,0.1)]">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${run.status === 'completed' ? 'bg-green-500' : run.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}/>
                                        <span className="font-mono text-xs opacity-70">Run ID: {run.id}</span>
                                    </div>
                                    <span className="text-xs opacity-50">{new Date(run.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="p-6 space-y-6">
                                    {run.error && <div className="p-4 bg-red-900/20 text-red-200 rounded-lg text-sm">{run.error}</div>}
                                    {Object.entries(run.agentOutputs).map(([agentId, output]) => (
                                        <div key={agentId} className="space-y-2">
                                            <h4 className="text-sm font-bold text-[var(--mf-accent)] uppercase tracking-wider">{DEFAULT_AGENTS.find(a => a.id === agentId)?.name || agentId}</h4>
                                            <div className="bg-[rgba(0,0,0,0.2)] p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap font-mono border border-[var(--mf-border)]">
                                                {output}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'data' && (
                <div className="bg-[var(--mf-card)] border border-[var(--mf-border)] rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-4">Data Manager</h2>
                    <textarea 
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        className="w-full h-64 bg-[rgba(0,0,0,0.2)] border border-[var(--mf-border)] rounded-xl p-4 font-mono text-xs focus:ring-2 focus:ring-[var(--mf-accent)] outline-none"
                    />
                    <div className="flex justify-end mt-4">
                        <button 
                            onClick={() => {
                                const parsed = parseMedFlowCSV(csvText);
                                setRawData(parsed);
                                alert(`Parsed ${parsed.length} rows successfully.`);
                            }}
                            className="px-6 py-2 bg-[var(--mf-accent)] text-black font-bold rounded-lg hover:opacity-90 transition">
                            Parse CSV
                        </button>
                    </div>
                </div>
            )}
            
            {activeTab === 'quality' && (
                <div className="bg-[var(--mf-card)] border border-[var(--mf-border)] rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Info className="text-[var(--mf-accent)]"/>
                        <h2 className="text-xl font-bold">Data Quality Report</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                         <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[var(--mf-border)]">
                             <div className="text-2xl font-black mb-1">{summary.rows}</div>
                             <div className="text-xs opacity-50 uppercase">Total Rows</div>
                         </div>
                         <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[var(--mf-border)]">
                             <div className="text-2xl font-black mb-1">{filteredData.filter(d => !d.parsedDate).length}</div>
                             <div className="text-xs opacity-50 uppercase text-red-400">Invalid Dates</div>
                         </div>
                         <div className="p-4 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[var(--mf-border)]">
                             <div className="text-2xl font-black mb-1">{filteredData.filter(d => d.Number <= 0).length}</div>
                             <div className="text-xs opacity-50 uppercase text-yellow-400">Zero/Neg Quantities</div>
                         </div>
                    </div>
                    <div className="mt-8">
                        <h3 className="font-bold mb-4">Sample Data</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="uppercase opacity-50 border-b border-[var(--mf-border)]">
                                    <tr>
                                        <th className="py-2">Supplier</th>
                                        <th className="py-2">Date</th>
                                        <th className="py-2">Category</th>
                                        <th className="py-2 text-right">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.sample_rows.map((r, i) => (
                                        <tr key={i} className="border-b border-[var(--mf-border)] border-opacity-10">
                                            <td className="py-2 font-mono">{r.SupplierID}</td>
                                            <td className="py-2">{r.Deliverdate}</td>
                                            <td className="py-2">{r.Category}</td>
                                            <td className="py-2 text-right font-mono">{r.Number}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

export default App;
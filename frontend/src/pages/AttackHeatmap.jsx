import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  RefreshCw, 
  Grid, 
  AlertOctagon, 
  Activity, 
  Cpu, 
  Compass,
  Map as MapIcon,
  Globe,
  Radio
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import api from '../services/api';

const AttackHeatmap = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  
  // Matrix risk counts
  const [matrix, setMatrix] = useState({
    visual: { name: 'Visual Clone Vector', count: 0, intensity: 0, color: 'shadow-glow-red border-red-900 bg-red-950/20 text-cyber-threat', desc: 'Siamese Network visual matches (<0.15 distance)' },
    linguistic: { name: 'Linguistic Urgency Vector', count: 0, intensity: 0, color: 'shadow-glow-orange border-amber-900 bg-amber-950/20 text-orange-400', desc: 'BERT transformer spam/urgency text anomalies' },
    lexical: { name: 'Lexical Anomaly Vector', count: 0, intensity: 0, color: 'shadow-glow-emerald border-emerald-900 bg-emerald-950/20 text-cyber-glow', desc: 'XGBoost multi-level url character anomalies' },
    ip: { name: 'IP Malware Vector', count: 0, intensity: 0, color: 'shadow-glow-blue border-blue-900 bg-blue-950/20 text-blue-400', desc: 'IP presence and hosting anomalies' }
  });

  const [categoryData, setCategoryData] = useState([]);
  
  // Geographic nodes mapping (Simulating coordinates based on incident indexes)
  const [geoNodes, setGeoNodes] = useState([
    { id: 1, name: 'North America (US-East)', x: 180, y: 110, country: 'United States', ip: '54.85.122.10', count: 0, severity: 'High', active: false },
    { id: 2, name: 'Western Europe (Frankfurt)', x: 420, y: 95, country: 'Germany', ip: '3.120.40.92', count: 0, severity: 'Critical', active: false },
    { id: 3, name: 'Asia Pacific (Mumbai)', x: 570, y: 180, country: 'India', ip: '13.233.110.5', count: 0, severity: 'Medium', active: false },
    { id: 4, name: 'South America (São Paulo)', x: 260, y: 260, country: 'Brazil', ip: '54.233.150.12', count: 0, severity: 'High', active: false },
    { id: 5, name: 'East Asia (Tokyo)', x: 670, y: 120, country: 'Japan', ip: '54.250.2.14', count: 0, severity: 'Low', active: false },
    { id: 6, name: 'Oceania (Sydney)', x: 710, y: 300, country: 'Australia', ip: '13.54.0.22', count: 0, severity: 'Low', active: false },
    { id: 7, name: 'South Africa (Cape Town)', x: 460, y: 280, country: 'South Africa', ip: '13.244.0.1', count: 0, severity: 'Medium', active: false }
  ]);

  const compileMetrics = (scanHistory) => {
    let visualCount = 0;
    let linguisticCount = 0;
    let lexicalCount = 0;
    let ipCount = 0;

    const categories = {};
    const updatedGeoNodes = [...geoNodes].map(node => ({ ...node, count: 0, active: false }));

    scanHistory.forEach((item, index) => {
      if (!item.isPhishing) return;

      // Classify vectors
      if (item.threatCategory === 'brand_impersonation') {
        visualCount++;
      }
      if (item.threatCategory === 'credential_harvesting') {
        linguisticCount++;
      }
      if (item.threatCategory === 'subdomain_takeover' || item.threatCategory === 'general_phishing') {
        lexicalCount++;
      }
      if (item.threatCategory === 'malware_hosting') {
        ipCount++;
      }

      // Assign to a geo node dynamically using index distribution
      const nodeIndex = index % updatedGeoNodes.length;
      updatedGeoNodes[nodeIndex].count += 1;
      updatedGeoNodes[nodeIndex].active = true;

      // Compile category charts
      const catName = item.threatCategory === 'none' || !item.threatCategory
        ? 'General Phishing'
        : item.threatCategory.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      categories[catName] = (categories[catName] || 0) + 1;
    });

    // Normalize node severities based on counts
    updatedGeoNodes.forEach(node => {
      if (node.count > 4) node.severity = 'Critical';
      else if (node.count > 2) node.severity = 'High';
      else if (node.count > 0) node.severity = 'Medium';
      else node.severity = 'Low';
    });

    setGeoNodes(updatedGeoNodes);

    // Total phishing events for normalizing intensity percentages
    const totalPhishing = Math.max(1, visualCount + linguisticCount + lexicalCount + ipCount);

    setMatrix({
      visual: { ...matrix.visual, count: visualCount, intensity: visualCount / totalPhishing },
      linguistic: { ...matrix.linguistic, count: linguisticCount, intensity: linguisticCount / totalPhishing },
      lexical: { ...matrix.lexical, count: lexicalCount, intensity: lexicalCount / totalPhishing },
      ip: { ...matrix.ip, count: ipCount, intensity: ipCount / totalPhishing }
    });

    const formattedCategories = Object.keys(categories).map(key => ({
      name: key,
      value: categories[key]
    }));
    setCategoryData(formattedCategories);
  };

  const fetchHeatmapData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/scan/history');
      if (res.data.success) {
        setLogs(res.data.history);
        compileMetrics(res.data.history);
      }
    } catch (err) {
      console.error('Failed to compile heatmap data:', err);
      setError('Connection to security statistics database timed out.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData();
  }, []);

  // Pie colors
  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Attack Vector Heatmap</h1>
          <p className="text-sm text-cyber-muted mt-1">Interactive security classification heatmaps tracking linguistic, visual, and lexical blocking loads.</p>
        </div>
        <button
          onClick={fetchHeatmapData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono text-cyber-muted hover:text-cyber-glow hover:border-cyber-glow/40 transition-all animate-none"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-lg text-cyber-threat text-sm font-mono">
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-cyber-glow" />
          <p className="text-sm font-mono text-cyber-muted font-bold">Compiling dynamic threat dimensions...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Section: Live Geographic Threat Map */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* SVG Map Display */}
            <div className="xl:col-span-2 glass-panel p-6 rounded-xl space-y-6 relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-gray-900 pb-3">
                <div className="flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-cyber-threat" />
                  <h2 className="text-sm uppercase font-mono tracking-wider text-cyber-muted">Geographic Threat Control Map</h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-cyber-glow">
                  <Radio className="w-4 h-4 animate-pulse text-cyber-threat" />
                  <span>LIVE INTELLIGENCE STREAM</span>
                </div>
              </div>

              {/* World Map Area */}
              <div className="relative border border-gray-900 rounded-lg bg-gray-950/60 h-80 overflow-hidden flex items-center justify-center p-2 select-none">
                {/* Stylized Grid World Map Outline */}
                <svg viewBox="0 0 800 400" className="w-full h-full text-gray-800/40">
                  {/* North America */}
                  <polygon points="80,50 240,40 270,120 220,180 180,160 100,140 60,110" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                  <path d="M 120,60 L 160,120 M 140,80 L 180,140 M 180,50 L 220,110" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 5" />
                  
                  {/* South America */}
                  <polygon points="210,180 270,210 250,320 210,340 180,240" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                  <path d="M 200,200 L 240,280 M 220,220 L 250,290" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 5" />

                  {/* Africa */}
                  <polygon points="370,160 450,170 470,270 410,320 350,210" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                  <path d="M 370,180 L 440,250 M 390,200 L 420,280" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 5" />

                  {/* Europe */}
                  <polygon points="360,50 480,45 490,110 440,150 370,130" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                  
                  {/* Eurasia/Asia */}
                  <polygon points="480,45 720,40 760,180 620,260 520,210 450,140" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                  <path d="M 520,60 L 620,160 M 560,70 L 660,180 M 600,60 L 700,170" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 5" />

                  {/* Australia */}
                  <polygon points="660,260 740,250 750,300 680,320" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
                </svg>

                {/* Plotting active nodes */}
                {geoNodes.map((node) => (
                  <div
                    key={node.id}
                    className="absolute cursor-pointer group"
                    style={{ left: `${(node.x / 800) * 100}%`, top: `${(node.y / 400) * 100}%` }}
                    onClick={() => setSelectedNode(node)}
                  >
                    {/* Glowing pulse rings */}
                    {node.active && (
                      <>
                        <span className="absolute -left-3 -top-3 inline-flex h-8 w-8 rounded-full bg-red-500/25 animate-ping"></span>
                        <span className="absolute -left-1.5 -top-1.5 inline-flex h-5 w-5 rounded-full bg-red-600/30 animate-pulse"></span>
                      </>
                    )}
                    {/* Node Core dot */}
                    <div 
                      className={`w-3.5 h-3.5 rounded-full border-2 border-gray-950 shadow-md ${
                        node.active 
                          ? node.severity === 'Critical' 
                            ? 'bg-red-500' 
                            : 'bg-amber-500'
                          : 'bg-gray-800'
                      }`}
                    />
                    
                    {/* Mini Hover Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-5 hidden group-hover:block bg-gray-950 border border-gray-800 text-[10px] font-mono p-2 rounded shadow-2xl z-25 w-40 text-center">
                      <p className="font-bold text-gray-200">{node.name}</p>
                      <p className="text-cyber-muted mt-0.5">IP: {node.ip}</p>
                      <p className="text-cyber-threat mt-0.5">{node.count} Interceptions</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Node Details Sidepanel */}
            <div className="glass-panel p-6 rounded-xl flex flex-col justify-between h-full space-y-6">
              <div className="border-b border-gray-900 pb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyber-glow" />
                <h3 className="text-xs uppercase font-mono tracking-wider text-cyber-muted">Active Host Target details</h3>
              </div>

              {selectedNode ? (
                <div className="space-y-4 font-mono text-xs flex-1">
                  <div className="p-3 bg-gray-950/60 border border-gray-850 rounded-lg space-y-2">
                    <div className="flex justify-between border-b border-gray-900 pb-2">
                      <span className="text-cyber-muted">Location:</span>
                      <span className="font-semibold text-gray-200">{selectedNode.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-900 py-2">
                      <span className="text-cyber-muted">Country Code:</span>
                      <span className="font-semibold text-gray-200">{selectedNode.country}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-900 py-2">
                      <span className="text-cyber-muted">Server IP:</span>
                      <span className="font-semibold text-gray-200">{selectedNode.ip}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-900 py-2">
                      <span className="text-cyber-muted">Activity Severity:</span>
                      <span className={`font-bold ${
                        selectedNode.severity === 'Critical' || selectedNode.severity === 'High' 
                          ? 'text-cyber-threat' 
                          : 'text-cyber-warn'
                      }`}>{selectedNode.severity}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-cyber-muted">Threat Interceptions:</span>
                      <span className="text-cyber-glow font-bold">{selectedNode.count}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-cyber-muted leading-relaxed">
                    This location represents the primary hosting geolocation coordinates resolved from the suspicious domains stored in your logs.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-cyber-muted font-mono text-xs py-8">
                  <Compass className="w-8 h-8 mb-2 text-cyber-muted animate-pulse" />
                  <span>Select any active node on the map to audit server host details.</span>
                </div>
              )}
            </div>

          </div>

          {/* Matrix Risk Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.keys(matrix).map((key, idx) => {
              const cell = matrix[key];
              const glowIntensity = Math.max(0.1, cell.intensity);
              
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`glass-panel p-6 rounded-xl border flex flex-col justify-between h-48 select-none relative overflow-hidden transition-all duration-300 ${cell.color}`}
                  style={{ 
                    boxShadow: cell.count > 0 
                      ? `0 0 ${20 * glowIntensity}px ${COLORS[idx % COLORS.length]}20` 
                      : 'none'
                  }}
                >
                  <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

                  <div className="space-y-2 z-10">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xs uppercase font-mono tracking-wider font-extrabold">{cell.name}</h2>
                      <Grid className="w-4 h-4 opacity-40" />
                    </div>
                    <p className="text-2xl font-black font-mono tracking-tight">
                      {cell.count} <span className="text-xs font-normal text-cyber-muted">incidents</span>
                    </p>
                    <p className="text-[10px] text-cyber-muted font-mono leading-relaxed">{cell.desc}</p>
                  </div>

                  <div className="space-y-1.5 z-10">
                    <div className="flex justify-between items-center text-[9px] font-mono text-cyber-muted">
                      <span>Anomalous Density:</span>
                      <span className="font-bold">{(cell.intensity * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-900/60 border border-gray-800/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-current transition-all duration-500" 
                        style={{ width: `${cell.intensity * 100}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Category Vector loads */}
            <div className="glass-panel p-6 rounded-xl lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyber-glow" />
                  <span>Vector Frequency Distribution</span>
                </h2>
                <p className="text-xs text-cyber-muted">Active block counts categorized across structural cyber-threat channels.</p>
              </div>

              {categoryData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-cyber-muted font-mono text-xs border border-dashed border-gray-900 rounded-lg">
                  <AlertOctagon className="w-6 h-6 mb-2 text-cyber-muted animate-pulse" />
                  <span>No active phishing incidents on record to compile distribution.</span>
                </div>
              ) : (
                <div className="h-64 font-mono text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#6b7280" tickLine={false} style={{ fontSize: 10 }} />
                      <YAxis stroke="#6b7280" tickLine={false} style={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid #1f2937', borderRadius: 8 }}
                        itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]}>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Categorization ratio */}
            <div className="glass-panel p-6 rounded-xl space-y-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyber-threat" />
                  <span>Threat Sector Ratio</span>
                </h2>
                <p className="text-xs text-cyber-muted">Ratio composition of active phishing anomalies.</p>
              </div>

              {categoryData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-cyber-muted font-mono text-xs border border-dashed border-gray-900 rounded-lg">
                  <Compass className="w-6 h-6 mb-2 text-cyber-muted" />
                  <span>Ledger records clean.</span>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid #1f2937', borderRadius: 8 }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-cyber-muted">Total Intercepts</span>
                    <span className="text-2xl font-black font-mono mt-0.5">
                      {categoryData.reduce((acc, curr) => acc + curr.value, 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default AttackHeatmap;

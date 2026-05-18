import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  RefreshCw, 
  Grid, 
  AlertOctagon, 
  Activity, 
  Cpu, 
  Compass
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import api from '../services/api';

const AttackHeatmap = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Matrix risk counts
  const [matrix, setMatrix] = useState({
    visual: { name: 'Visual Clone Vector', count: 0, intensity: 0, color: 'shadow-glow-red border-red-900 bg-red-950/20 text-cyber-threat', desc: 'Siamese Network visual matches (<0.15 distance)' },
    linguistic: { name: 'Linguistic Urgency Vector', count: 0, intensity: 0, color: 'shadow-glow-orange border-amber-900 bg-amber-950/20 text-orange-400', desc: 'BERT transformer spam/urgency text anomalies' },
    lexical: { name: 'Lexical Anomaly Vector', count: 0, intensity: 0, color: 'shadow-glow-emerald border-emerald-900 bg-emerald-950/20 text-cyber-glow', desc: 'XGBoost multi-level url character anomalies' },
    ip: { name: 'IP Malware Vector', count: 0, intensity: 0, color: 'shadow-glow-blue border-blue-900 bg-blue-950/20 text-blue-400', desc: 'IP presence and hosting anomalies' }
  });

  const [categoryData, setCategoryData] = useState([]);

  const compileMetrics = (scanHistory) => {
    let visualCount = 0;
    let linguisticCount = 0;
    let lexicalCount = 0;
    let ipCount = 0;

    const categories = {};

    scanHistory.forEach(item => {
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

      // Compile category charts
      const catName = item.threatCategory === 'none' || !item.threatCategory
        ? 'General Phishing'
        : item.threatCategory.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      categories[catName] = (categories[catName] || 0) + 1;
    });

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
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono text-cyber-muted hover:text-cyber-glow hover:border-cyber-glow/40 transition-all"
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
          {/* Main Grid */}
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
                  {/* Grid overlay */}
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

                  {/* Heat Indicator */}
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

                  {/* Legend Overlay */}
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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Search, 
  Filter, 
  ArrowUpDown, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle,
  FileText,
  Clock
} from 'lucide-react';
import api from '../services/api';

const IncidentLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL'); // ALL | HIGH | SAFE
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/scan/history');
      if (res.data.success) {
        setLogs(res.data.history);
      } else {
        setError('Gateway response did not contain historical data.');
      }
    } catch (err) {
      console.error('Failed to fetch full logs:', err);
      setError('Connection to security log repository failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Format relative time helper
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Sorting utility
  const handleSort = (field) => {
    const order = (sortField === field && sortOrder === 'desc') ? 'asc' : 'desc';
    setSortField(field);
    setSortOrder(order);
  };

  // Dynamic filter and search pipelines
  const filteredLogs = logs
    .filter(log => {
      const matchSearch = log.url.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.threatCategory && log.threatCategory.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const isHigh = log.riskScore >= 0.60;
      if (riskFilter === 'HIGH') return matchSearch && isHigh;
      if (riskFilter === 'SAFE') return matchSearch && !isHigh;
      return matchSearch;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle null cases
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
    });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Incident Audit Logs</h1>
          <p className="text-sm text-cyber-muted mt-1">Audit security anomalies, domain classifications, and historical risk assessments recorded on this gateway.</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono text-cyber-muted hover:text-cyber-glow hover:border-cyber-glow/40 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Controller bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-cyber-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs by domain, URL pattern, or category tags..."
            className="w-full bg-gray-950/60 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-cyber-glow transition-all font-mono"
          />
        </div>

        {/* Risk Filter Select */}
        <div className="flex bg-gray-950/60 border border-gray-800 rounded-lg p-1 font-mono text-xs">
          {['ALL', 'HIGH', 'SAFE'].map((filter) => (
            <button
              key={filter}
              onClick={() => setRiskFilter(filter)}
              className={`flex-1 py-1.5 rounded-md font-bold transition-all ${
                riskFilter === filter 
                  ? filter === 'HIGH' 
                    ? 'bg-red-950/40 text-cyber-threat border border-red-900/30' 
                    : filter === 'SAFE'
                      ? 'bg-emerald-950/40 text-cyber-glow border border-emerald-900/30'
                      : 'bg-gray-900 text-cyber-text border border-gray-800'
                  : 'text-cyber-muted hover:text-cyber-text'
              }`}
            >
              {filter} RISK
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-gray-950/80 border-b border-gray-900/80 text-cyber-muted select-none">
                <th className="p-4 cursor-pointer hover:text-cyber-text" onClick={() => handleSort('url')}>
                  <div className="flex items-center gap-1.5">
                    <span>AUDITED URL / PAYLOAD</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-cyber-text" onClick={() => handleSort('riskScore')}>
                  <div className="flex items-center gap-1.5">
                    <span>RISK FACTOR</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-cyber-text" onClick={() => handleSort('threatCategory')}>
                  <div className="flex items-center gap-1.5">
                    <span>VECTOR</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-cyber-text" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1.5">
                    <span>TIMESTAMP</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-cyber-muted">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-cyber-glow" />
                    <span>Synchronizing ledger records...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-cyber-threat font-bold">
                    ⚠ {error}
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-16 text-center text-cyber-muted">
                    <FileText className="w-8 h-8 mx-auto mb-3 text-cyber-muted" />
                    <span>No matching incident audit records found.</span>
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false}>
                  {filteredLogs.map((log, idx) => {
                    const isHigh = log.riskScore >= 0.60;
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="border-b border-gray-900/40 bg-gray-950/15 hover:bg-gray-900/30 transition-colors"
                      >
                        <td className="p-4 font-bold text-gray-300 truncate max-w-xs md:max-w-md">
                          {log.url}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-gray-900 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isHigh ? 'bg-cyber-threat' : 'bg-cyber-glow'}`} 
                                style={{ width: `${(log.riskScore || 0) * 100}%` }}
                              />
                            </div>
                            <span className={`font-bold ${isHigh ? 'text-cyber-threat' : 'text-cyber-glow'}`}>
                              {((log.riskScore || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 border rounded text-[10px] uppercase font-bold tracking-wider ${
                            isHigh 
                              ? 'bg-red-950/20 border-red-900/30 text-cyber-threat' 
                              : 'bg-emerald-950/20 border-emerald-900/30 text-cyber-glow'
                          }`}>
                            {log.threatCategory === 'none' || !log.threatCategory
                              ? (log.isPhishing ? 'Phishing' : 'Safe')
                              : log.threatCategory.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-cyber-muted text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDate(log.createdAt)}</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IncidentLogs;

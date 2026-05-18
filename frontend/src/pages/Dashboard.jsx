import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  TrendingUp, 
  ShieldAlert, 
  Users, 
  Terminal,
  RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useAppStore from '../store/useAppStore';
import useSocket from '../hooks/useSocket';
import api from '../services/api';

// Map database returned icon strings to Lucide components
const iconMap = {
  Database: Database,
  ShieldAlert: ShieldAlert,
  Shield: Shield,
  CheckCircle: CheckCircle,
  Users: Users,
  AlertTriangle: AlertTriangle
};

const Dashboard = () => {
  const { user } = useAppStore();
  const socket = useSocket();
  const role = user?.role || 'user';

  const [stats, setStats] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Core Fetch routines
  const fetchStats = async () => {
    try {
      const res = await api.get('/analytics/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err.message);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await api.get('/analytics/telemetry');
      if (res.data.success) {
        setTelemetry(res.data.telemetry);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry:', err.message);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/scan/history');
      if (res.data.success) {
        // Map scan records to uniform threat logs format
        const historyLogs = res.data.history.map(item => ({
          id: item.id,
          url: item.url,
          category: item.threatCategory === 'none' || !item.threatCategory
            ? (item.isPhishing ? 'Suspicious Phishing' : 'Verified Safe')
            : item.threatCategory.replace(/_/g, ' '),
          score: item.riskScore || 0,
          time: formatTimeAgo(item.createdAt)
        }));
        setIncidents(historyLogs.slice(0, 5)); // Show latest 5 items initially
      }
    } catch (err) {
      console.error('Failed to fetch history:', err.message);
    }
  };

  // Helper to render relative timestamps
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // 2. Lifecycle triggers: Initial Load & WebSocket event bindings
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        await Promise.all([
          fetchStats(),
          fetchTelemetry(),
          fetchHistory()
        ]);
      } catch (err) {
        setError('Failed to establish session metrics.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [role]);

  useEffect(() => {
    if (!socket) return;

    // Secure operational thread listener for real-time threat broadcasts
    socket.on('threat:alert', (threat) => {
      console.log('[Dashboard] Real-Time Threat Event Intercepted:', threat);
      setIncidents(prev => {
        const formatted = {
          id: threat.id,
          url: threat.url,
          category: threat.category,
          score: threat.score,
          time: 'Just now'
        };
        const updated = [formatted, ...prev];
        if (updated.length > 5) updated.pop();
        return updated;
      });
      // Increment top counters
      fetchStats();
    });

    // Operational trend listener for telemetry updates
    socket.on('telemetry:tick', (tick) => {
      console.log('[Dashboard] Telemetry update stream:', tick);
      fetchTelemetry();
      fetchStats();
    });

    return () => {
      socket.off('threat:alert');
      socket.off('telemetry:tick');
    };
  }, [socket]);

  // Role-Specific Headers
  const getHeaderDetails = () => {
    if (role === 'admin') {
      return {
        title: 'System Administration Console',
        subtitle: 'Global configurations, ML prediction score overrides, and primary engine telemetry.',
      };
    }
    if (role === 'analyst') {
      return {
        title: 'Security Operations Center (SOC)',
        subtitle: 'Real-time corporate threat feeds, suspicious email reports, and explainable models.',
      };
    }
    return {
      title: 'Personal Threat Intel Hub',
      subtitle: 'Audit web links, scan message contexts, and manage your immediate browsing security.',
    };
  };

  const header = getHeaderDetails();
  const isStandardUser = role === 'user';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-cyber-glow" />
        <p className="text-sm font-mono text-cyber-muted">Connecting to security network telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{header.title}</h1>
          <p className="text-sm text-cyber-muted mt-1">{header.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono">
          <Terminal className="w-3.5 h-3.5 text-cyber-glow" />
          <span className="text-cyber-muted">Role: </span>
          <span className="text-cyber-glow uppercase font-bold">{role}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-lg text-cyber-threat text-sm font-mono">
          ⚠ {error}
        </div>
      )}

      {/* Analytics stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = iconMap[stat.icon] || Shield;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel p-6 rounded-xl relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-cyber-muted tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-extrabold mt-2 tracking-tight">{stat.value}</p>
                  <span className="text-[10px] text-cyber-muted mt-1 block font-mono">{stat.desc}</span>
                </div>
                <div className={`p-2.5 bg-gray-900 border border-gray-800 rounded-lg ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Live Threat Chart & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recharts Area Chart */}
        <div className="glass-panel p-6 rounded-xl lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">{isStandardUser ? 'My Scan Telemetry' : 'Hourly Intrusion Frequency'}</h2>
              <p className="text-xs text-cyber-muted font-mono">{isStandardUser ? 'Audit query history across the current week.' : 'Telemetry feed of AI-categorized block alerts.'}</p>
            </div>
            <div className="p-2 bg-emerald-950/20 border border-emerald-900/35 rounded-lg flex items-center gap-1.5 text-xs text-cyber-glow font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{isStandardUser ? 'Usage: active' : '+18.4% peak load'}</span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis stroke="#6b7280" tickLine={false} style={{ fontSize: 10, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0b0f19', border: '1px solid #1f2937', borderRadius: 8 }}
                  labelStyle={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: 11 }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="attacks" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAttacks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Attack Feed */}
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold">{isStandardUser ? 'My Audited History' : 'Incident Log Stream'}</h2>
            <p className="text-xs text-cyber-muted">{isStandardUser ? 'Recent inspection logs on this workstation.' : 'Streaming active network detection events.'}</p>
          </div>

          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {incidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-cyber-muted font-mono text-xs border border-dashed border-gray-900 rounded-lg">
                  <Terminal className="w-5 h-5 mb-2 text-cyber-muted" />
                  <span>Awaiting threat metrics...</span>
                </div>
              ) : (
                incidents.map((detection) => (
                  <motion.div
                    key={detection.id}
                    initial={{ opacity: 0, x: -30, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0, x: 30, height: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="p-3 bg-gray-950/40 border border-gray-900 rounded-lg flex flex-col gap-2 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] px-2 py-0.5 border rounded-full font-mono uppercase tracking-wider font-semibold ${
                        detection.score >= 0.6 
                          ? 'bg-red-950/30 border-red-900/30 text-cyber-threat' 
                          : 'bg-emerald-950/30 border-emerald-900/30 text-cyber-glow'
                      }`}>
                        {detection.category}
                      </span>
                      <span className="text-[10px] text-cyber-muted font-mono">{detection.time}</span>
                    </div>
                    <p className="text-xs font-mono truncate text-gray-300 pr-1">{detection.url}</p>
                    <div className="flex justify-between items-center mt-1 border-t border-gray-900/60 pt-2 text-[10px] font-mono">
                      <span className="text-cyber-muted">{detection.score >= 0.6 ? 'Anomaly Index:' : 'Safety Index:'}</span>
                      <span className={detection.score >= 0.6 ? 'text-cyber-threat font-bold' : 'text-cyber-glow font-bold'}>
                        {(detection.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

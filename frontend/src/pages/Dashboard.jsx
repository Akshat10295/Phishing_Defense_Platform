import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Database, TrendingUp, ShieldAlert, Users, Terminal } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useAppStore from '../store/useAppStore';

const mockChartDataGlobal = [
  { name: '08:00', attacks: 12 },
  { name: '10:00', attacks: 19 },
  { name: '12:00', attacks: 34 },
  { name: '14:00', attacks: 21 },
  { name: '16:00', attacks: 45 },
  { name: '18:00', attacks: 15 },
  { name: '20:00', attacks: 8 },
];

const mockChartDataPersonal = [
  { name: 'Mon', attacks: 2 },
  { name: 'Tue', attacks: 5 },
  { name: 'Wed', attacks: 1 },
  { name: 'Thu', attacks: 8 },
  { name: 'Fri', attacks: 3 },
  { name: 'Sat', attacks: 0 },
  { name: 'Sun', attacks: 2 },
];

const mockRecentDetectionsGlobal = [
  { id: 1, url: 'http://secure-update-paypal.confirm-account.net/login', category: 'Credential Harvesting', score: 0.94, time: '2 mins ago' },
  { id: 2, url: 'https://amazn.support-portal-alert.com/refund', category: 'Financial Fraud', score: 0.88, time: '14 mins ago' },
  { id: 3, url: 'http://microsoft-billing-verification.com/outlook', category: 'Lookalike Brand', score: 0.79, time: '32 mins ago' },
  { id: 4, url: 'http://office365-upgrade.xyz/sharepoint', category: 'Credential Harvesting', score: 0.91, time: '1 hour ago' },
];

const mockRecentDetectionsPersonal = [
  { id: 1, url: 'https://github.com/login', category: 'Verified Safe', score: 0.05, time: '10 mins ago' },
  { id: 2, url: 'http://secure-verify-paypal.support-login.com/web', category: 'Credential Harvesting', score: 0.91, time: '2 hours ago' },
  { id: 3, url: 'https://google.com', category: 'Verified Safe', score: 0.02, time: '1 day ago' },
];

const Dashboard = () => {
  const { user } = useAppStore();
  const role = user?.role || 'user';

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

  // Role-Specific Stats Cards
  const getStatsCards = () => {
    if (role === 'user') {
      return [
        { title: 'My Scans Performed', value: '47', desc: 'Queries in current session', icon: Database, color: 'text-blue-400' },
        { title: 'Phishing Intercepted', value: '4', desc: 'Securely blocked link requests', icon: ShieldAlert, color: 'text-cyber-threat' },
        { title: 'Active ML Precision', value: '94.2%', desc: 'State-of-the-art accuracy', icon: Shield, color: 'text-cyber-glow' },
        { title: 'Security Status', value: 'FULLY ARMORED', desc: 'Zero anomalies reported', icon: CheckCircle, color: 'text-cyber-glow' },
      ];
    }
    
    // Analyst and Admin stats (Global stats)
    return [
      { title: 'Total Handled Scans', value: '45,821', desc: '+12% from last 24h', icon: Database, color: 'text-blue-400' },
      { title: 'Interceptions Enforced', value: '1,492', desc: '100% active block rate', icon: ShieldAlert, color: 'text-cyber-threat' },
      { title: 'Active ML Accuracy', value: '94.2%', desc: 'Trained on 500k features', icon: Shield, color: 'text-cyber-glow' },
      { title: role === 'admin' ? 'Managed Analysts' : 'Brand Clones Flagged', value: role === 'admin' ? '28 Active' : '312 Spoofs', desc: role === 'admin' ? 'Total provisioned users' : 'Zero-day detections', icon: role === 'admin' ? Users : AlertTriangle, color: 'text-cyber-warn' },
    ];
  };

  const header = getHeaderDetails();
  const stats = getStatsCards();
  const isStandardUser = role === 'user';

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

      {/* Analytics stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
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
              <span>{isStandardUser ? 'Usage: stable' : '+18.4% peak load'}</span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={isStandardUser ? mockChartDataPersonal : mockChartDataGlobal} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
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
            {(isStandardUser ? mockRecentDetectionsPersonal : mockRecentDetectionsGlobal).map((detection) => (
              <div key={detection.id} className="p-3 bg-gray-950/40 border border-gray-900 rounded-lg flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className={`text-[10px] px-2 py-0.5 border rounded-full font-mono uppercase tracking-wider font-semibold ${
                    detection.score >= 0.8 
                      ? 'bg-red-950/30 border-red-900/30 text-cyber-threat' 
                      : 'bg-emerald-950/30 border-emerald-900/30 text-cyber-glow'
                  }`}>
                    {detection.category}
                  </span>
                  <span className="text-[10px] text-cyber-muted font-mono">{detection.time}</span>
                </div>
                <p className="text-xs font-mono truncate text-gray-300">{detection.url}</p>
                <div className="flex justify-between items-center mt-1 border-t border-gray-900/60 pt-2 text-[10px] font-mono">
                  <span className="text-cyber-muted">{detection.score >= 0.8 ? 'Anomaly Index:' : 'Safety Index:'}</span>
                  <span className={detection.score >= 0.8 ? 'text-cyber-threat font-bold' : 'text-cyber-glow font-bold'}>
                    {(detection.score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

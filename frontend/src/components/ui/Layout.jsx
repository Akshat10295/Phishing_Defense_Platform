import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Shield, Globe, Mail, History, Map, Settings, LogOut, Terminal, User } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import api from '../../services/api';

const Layout = () => {
  const { user, clearAuth } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Security Center', path: '/', icon: Shield, roles: ['user', 'analyst', 'admin'] },
    { name: 'URL Inspector', path: '/url-scanner', icon: Globe, roles: ['user', 'analyst', 'admin'] },
    { name: 'Email NLP Audit', path: '/email-scanner', icon: Mail, roles: ['user', 'analyst', 'admin'] },
    { name: 'Threat Feed & Logs', path: '/history', icon: History, roles: ['analyst', 'admin'] },
    { name: 'Attack Heatmap', path: '/heatmap', icon: Map, roles: ['analyst', 'admin'] },
    { name: 'Engine Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || 'user')
  );

  return (
    <div className="flex h-screen bg-cyber-dark overflow-hidden text-cyber-text">
      {/* Sidebar navigation */}
      <aside className="w-64 glass-panel border-r border-gray-800 flex flex-col justify-between">
        <div>
          {/* Logo brand container */}
          <div className="p-6 flex items-center gap-3 border-b border-gray-800">
            <div className="p-2 bg-emerald-950/50 border border-cyber-glow rounded-lg shadow-glow-emerald">
              <Shield className="w-6 h-6 text-cyber-glow" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider text-cyber-text flex items-center gap-1">
                SENTINEL<span className="text-cyber-glow cyber-glow-text">AI</span>
              </h1>
              <p className="text-[10px] text-cyber-muted font-mono tracking-widest uppercase">Phishing Core</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-950/30 border border-emerald-800/40 text-cyber-glow shadow-glow-emerald'
                        : 'text-cyber-muted hover:bg-gray-900/60 hover:text-cyber-text'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Profile / Bottom capsule */}
        <div className="p-4 border-t border-gray-850 flex flex-col gap-3 bg-gray-950/40">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 bg-gray-900 border border-gray-800 rounded-full">
                <User className="w-4 h-4 text-cyber-muted" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate leading-none">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-glow shadow-glow-emerald"></span>
                  <span className="text-[9px] font-mono uppercase text-cyber-glow tracking-wider font-semibold">{user.role}</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-cyber-threat hover:text-white rounded-lg text-xs font-semibold transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main panel layout */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Sleek top action status header */}
        <header className="h-16 glass-panel border-b border-gray-800 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-cyber-glow" />
            <span className="text-xs font-mono text-cyber-muted">sec-analyst@sentinelai:~# <span className="text-cyber-text">tail -f /var/log/phish-engine.log</span></span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/20 border border-emerald-900/30 rounded-full">
              <span className="w-2 h-2 rounded-full bg-cyber-glow animate-pulse"></span>
              <span className="text-cyber-glow uppercase font-bold text-[10px] tracking-wider">Engine: ACTIVE</span>
            </div>
          </div>
        </header>

        {/* Content outlet viewport */}
        <section className="flex-1 overflow-y-auto p-8 bg-cyber-dark/40">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default Layout;

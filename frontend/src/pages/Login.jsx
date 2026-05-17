import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, Mail, Terminal, ArrowRight, ShieldCheck, UserPlus } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import api from '../services/api';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAppStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email, password } : { email, password, role };

      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        const { user, accessToken, refreshToken } = response.data;
        setAuth(user, accessToken, refreshToken);
        navigate('/');
      } else {
        setError(response.data.error || 'Request processing failed.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.error || err.response.data.errors?.[0] || 'Authentication failed.');
      } else {
        setError('Cannot establish bridge with security gateway.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-6 relative overflow-hidden text-cyber-text">
      {/* Decorative neon background grid/glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 z-10">
        {/* Brand logo banner */}
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-emerald-950/40 border border-cyber-glow rounded-xl shadow-glow-emerald mb-4">
            <Shield className="w-8 h-8 text-cyber-glow" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-widest text-cyber-text">
            SENTINEL<span className="text-cyber-glow cyber-glow-text">AI</span>
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-cyber-muted mt-1">Real-Time Threat Gateway</p>
        </div>

        {/* Input Card Container */}
        <div className="glass-panel p-8 rounded-2xl shadow-2xl relative">
          <div className="border-b border-gray-900 pb-4 mb-6 flex justify-between items-center">
            <h2 className="text-sm font-mono text-cyber-muted flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyber-glow" />
              <span>{isLogin ? 'user_authenticate.sh' : 'new_analyst_register.sh'}</span>
            </h2>
            <span className="text-[10px] text-cyber-glow font-bold uppercase tracking-wider font-mono">SECURE</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-cyber-muted uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@sentinelai.com"
                  className="w-full bg-gray-950/70 border border-gray-800 rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-cyber-glow transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-cyber-muted uppercase tracking-wider">Authentication Passkey</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-gray-950/70 border border-gray-800 rounded-lg py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-cyber-glow transition-all font-mono"
                  required
                />
              </div>
            </div>

            {/* Role select list (Register mode only) */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-cyber-muted uppercase tracking-wider">Assigned Security Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-gray-950/70 border border-gray-800 rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-cyber-glow transition-all font-mono text-cyber-muted"
                >
                  <option value="user">User / Standard Client</option>
                  <option value="analyst">Security Analyst</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
            )}

            {/* Error logs */}
            {error && (
              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-cyber-threat text-xs font-mono">
                ⚠ {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-950/40 hover:bg-cyber-glow border border-emerald-800/40 hover:border-cyber-glow text-cyber-glow hover:text-cyber-dark py-3 px-4 rounded-lg font-bold text-sm transition-all duration-300 shadow-glow-emerald flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Decrypting profiles...</span>
              ) : (
                <>
                  <span>{isLogin ? 'Access Security Gateway' : 'Provision Analyst Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Switch */}
          <div className="text-center mt-6 pt-4 border-t border-gray-900/60 text-xs font-mono text-cyber-muted">
            {isLogin ? (
              <button onClick={() => setIsLogin(false)} className="hover:text-cyber-glow flex items-center justify-center gap-1.5 mx-auto">
                <UserPlus className="w-3.5 h-3.5" />
                <span>New deployment? Register security profile</span>
              </button>
            ) : (
              <button onClick={() => setIsLogin(true)} className="hover:text-cyber-glow flex items-center justify-center gap-1.5 mx-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Have security profile? Authenticate</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, AlertTriangle, ShieldCheck, Cpu, RefreshCw, BarChart2, ShieldAlert } from 'lucide-react';
import api from '../services/api';

const URLScanner = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Temporary status request check to verify backend connectivity
      const response = await api.get('/status');
      
      // Let's create a beautiful mock scan outcome mapping our architectural explainability JSON outputs
      setTimeout(() => {
        setResult({
          url: url,
          risk_score: url.includes('paypal') || url.includes('secure') ? 0.89 : 0.12,
          confidence: 0.94,
          threat_category: url.includes('paypal') || url.includes('secure') ? 'Credential Harvesting' : 'Safe / Trusted Brand',
          explanations: url.includes('paypal') || url.includes('secure') ? [
            { factor: "suspicious_domain_age", impact: 0.28, description: "Domain registered less than 7 days ago." },
            { factor: "fake_login_form_detected", impact: 0.22, description: "Presence of password input forms targeted externally." },
            { factor: "ssl_mismatch", impact: 0.18, description: "SSL certificate domain mismatch error." },
            { factor: "lookalike_domain", impact: 0.21, description: "Levenshtein distance close to legitimate PayPal domain." }
          ] : [
            { factor: "domain_reputation", impact: -0.4, description: "High Alexa rank and verified legacy domain." }
          ]
        });
        setLoading(false);
      }, 1500);

    } catch (err) {
      console.error('Scan error:', err.message);
      setError('Connection to security gateway failed.');
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-cyber-threat border-red-900/35 bg-red-950/20';
    if (score >= 0.5) return 'text-cyber-warn border-amber-900/35 bg-amber-950/20';
    return 'text-cyber-glow border-emerald-900/35 bg-emerald-950/20';
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header Info */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">AI Heuristic URL Inspector</h1>
        <p className="text-sm text-cyber-muted mt-1">Submit web addresses to audit domain reputation, brand spoofing, and fake login DOM layouts.</p>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleScan} className="glass-panel p-6 rounded-xl flex gap-4 items-center">
        <div className="flex-1 relative">
          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-muted" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter suspicious web address (e.g., http://paypal-secure-verify.com)..."
            className="w-full bg-gray-950/60 border border-gray-800 rounded-lg py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-cyber-glow focus:ring-1 focus:ring-cyber-glow transition-all font-mono"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-900/80 hover:bg-cyber-glow border border-emerald-800/40 text-cyber-text hover:text-cyber-dark py-3.5 px-6 rounded-lg font-bold text-sm transition-all duration-200 shadow-glow-emerald flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing Heuristics...</span>
            </>
          ) : (
            <>
              <Cpu className="w-4 h-4" />
              <span>Inspect URL</span>
            </>
          )}
        </button>
      </form>

      {/* Errors */}
      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-lg text-cyber-threat text-sm font-mono">
          ⚠ {error}
        </div>
      )}

      {/* Output Panel */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Risk Gauge Card */}
            <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-between text-center relative overflow-hidden">
              <div className="w-full text-left border-b border-gray-900 pb-3">
                <h3 className="text-xs uppercase font-mono tracking-wider text-cyber-muted">VERDICT METRICS</h3>
              </div>

              <div className="my-8 relative flex items-center justify-center">
                <div className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center ${getScoreColor(result.risk_score)} shadow-glow-emerald`}>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Risk Index</span>
                  <span className="text-4xl font-extrabold tracking-tight mt-1">{(result.risk_score * 100).toFixed(0)}%</span>
                </div>
              </div>

              <div className="w-full space-y-2 font-mono text-xs">
                <div className="flex justify-between border-b border-gray-950 py-2">
                  <span className="text-cyber-muted">Verdict:</span>
                  <span className={result.risk_score >= 0.8 ? 'text-cyber-threat font-bold' : 'text-cyber-glow font-bold'}>
                    {result.risk_score >= 0.8 ? 'PHISHING / FRAUD' : 'VERIFIED SAFE'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-950 py-2">
                  <span className="text-cyber-muted">Confidence:</span>
                  <span className="font-semibold text-gray-300">{(result.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-cyber-muted">Class:</span>
                  <span className="font-semibold text-gray-300">{result.threat_category}</span>
                </div>
              </div>
            </div>

            {/* Explainable AI / SHAP breakdowns */}
            <div className="glass-panel p-6 rounded-xl md:col-span-2 space-y-6">
              <div className="border-b border-gray-900 pb-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyber-glow" />
                <h3 className="text-xs uppercase font-mono tracking-wider text-cyber-muted">SHAP EXPLAINABLE AI ANALYSIS FACTORS</h3>
              </div>

              <div className="space-y-4">
                {result.explanations.map((item, idx) => (
                  <div key={idx} className="space-y-1.5 p-3 bg-gray-950/40 border border-gray-900 rounded-lg">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-semibold uppercase tracking-wide text-gray-200">{item.factor.replace(/_/g, ' ')}</span>
                      <span className={item.impact > 0 ? 'text-cyber-threat font-bold' : 'text-cyber-glow font-bold'}>
                        {item.impact > 0 ? `+${(item.impact * 100).toFixed(0)}% risk` : `${(item.impact * 100).toFixed(0)}% risk`}
                      </span>
                    </div>
                    
                    {/* Linear bar representation */}
                    <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.impact > 0 ? 'bg-cyber-threat' : 'bg-cyber-glow'}`} 
                        style={{ width: `${Math.abs(item.impact) * 100}%` }}
                      ></div>
                    </div>

                    <p className="text-[11px] text-cyber-muted leading-relaxed font-mono mt-1">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default URLScanner;

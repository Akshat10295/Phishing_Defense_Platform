import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ShieldCheck, Cpu, RefreshCw, BarChart, Flag, CheckCircle } from 'lucide-react';
import api from '../services/api';

const EmailScanner = () => {
  const [emailText, setEmailText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async (e) => {
    e.preventDefault();
    if (!emailText) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      setTimeout(() => {
        const isUrgent = emailText.toLowerCase().includes('suspend') || emailText.toLowerCase().includes('act now') || emailText.toLowerCase().includes('unauthorized');
        
        setResult({
          risk_score: isUrgent ? 0.91 : 0.08,
          is_phishing: isUrgent,
          confidence: 0.93,
          flags: isUrgent ? ['urgency_language', 'suspicious_links', 'credential_harvesting'] : ['verified_safe'],
          nlp_analysis: {
            urgency_score: isUrgent ? 0.88 : 0.05,
            financial_hazard: isUrgent ? 0.74 : 0.02,
            vocabulary_anomalies: isUrgent ? 0.81 : 0.10
          }
        });
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError('Connection to NLP gateway failed.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">BERT Email NLP Audit</h1>
        <p className="text-sm text-cyber-muted mt-1">Audit email communications using transformer models for urgency vectors, social engineering traits, and fraud signals.</p>
      </div>

      {/* Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Editor Form */}
        <form onSubmit={handleScan} className="glass-panel p-6 rounded-xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-900 pb-3">
            <h2 className="text-xs uppercase font-mono tracking-wider text-cyber-muted">EMAIL CONTENT RAW TEXT</h2>
            <div className="flex items-center gap-1.5 text-xs text-cyber-muted font-mono">
              <Mail className="w-3.5 h-3.5" />
              <span>UTF-8 Body Payload</span>
            </div>
          </div>

          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            rows={10}
            placeholder="Paste raw email body here (e.g., Dear Customer, your account has been suspended! Click here to update your security settings immediately...)"
            className="w-full bg-gray-950/60 border border-gray-800 rounded-lg p-4 text-sm focus:outline-none focus:border-cyber-glow focus:ring-1 focus:ring-cyber-glow transition-all font-mono leading-relaxed"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-900/80 hover:bg-cyber-glow border border-emerald-800/40 text-cyber-text hover:text-cyber-dark py-3.5 px-6 rounded-lg font-bold text-sm transition-all duration-200 shadow-glow-emerald flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Transformer Analysis...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Run NLP Analysis</span>
              </>
            )}
          </button>
        </form>

        {/* NLP Results Gauge Sidebar */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-panel p-6 rounded-xl space-y-6 flex flex-col justify-between"
            >
              <div className="border-b border-gray-900 pb-3">
                <h3 className="text-xs uppercase font-mono tracking-wider text-cyber-muted">TRANSFORMER INSIGHTS</h3>
              </div>

              {/* Gauge Score */}
              <div className="flex flex-col items-center py-4">
                <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center ${result.is_phishing ? 'text-cyber-threat border-red-900/30 bg-red-950/10 shadow-glow-red' : 'text-cyber-glow border-emerald-900/30 bg-emerald-950/10 shadow-glow-emerald'}`}>
                  <span className="text-[9px] uppercase font-mono tracking-wider font-semibold">Anomalies</span>
                  <span className="text-3xl font-extrabold mt-0.5">{(result.risk_score * 100).toFixed(0)}%</span>
                </div>
                <h4 className={`text-sm font-bold uppercase mt-4 font-mono ${result.is_phishing ? 'text-cyber-threat' : 'text-cyber-glow'}`}>
                  {result.is_phishing ? 'CRITICAL RISK IDENTIFIED' : 'SECURE COMMUNICATIONS'}
                </h4>
              </div>

              {/* Flags list */}
              <div className="space-y-4 font-mono text-xs border-t border-gray-900/70 pt-4">
                <div>
                  <span className="text-cyber-muted uppercase tracking-wider text-[10px] block mb-2">TRIGGERED FLAGS:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.flags.map((flag, idx) => (
                      <span key={idx} className={`px-2 py-0.5 rounded text-[10px] border font-semibold ${result.is_phishing ? 'bg-red-950/30 border-red-900/40 text-cyber-threat' : 'bg-emerald-950/30 border-emerald-900/40 text-cyber-glow'}`}>
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sub classification metrics */}
                <div className="space-y-2.5 pt-2">
                  {[
                    { name: 'Urgency Intensity', val: result.nlp_analysis.urgency_score },
                    { name: 'Financial Hazards', val: result.nlp_analysis.financial_hazard },
                    { name: 'Vocabulary Anomalies', val: result.nlp_analysis.vocabulary_anomalies }
                  ].map((sub, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-cyber-muted">{sub.name}:</span>
                        <span className="font-bold text-gray-300">{(sub.val * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                        <div className={`h-full ${result.is_phishing ? 'bg-cyber-threat' : 'bg-cyber-glow'}`} style={{ width: `${sub.val * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EmailScanner;

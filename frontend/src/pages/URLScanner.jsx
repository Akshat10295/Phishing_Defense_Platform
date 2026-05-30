import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, AlertTriangle, ShieldCheck, Cpu, RefreshCw, BarChart2, ShieldAlert, QrCode } from 'lucide-react';
import api from '../services/api';
import useSocket from '../hooks/useSocket';

const URLScanner = () => {
  const socket = useSocket();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSuccessMsg, setQrSuccessMsg] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [pendingScanId, setPendingScanId] = useState(null);

  // Maintain active scan ID ref for real-time WebSocket state synchrony
  const pendingScanIdRef = useRef(null);
  useEffect(() => {
    pendingScanIdRef.current = pendingScanId;
  }, [pendingScanId]);

  useEffect(() => {
    if (!socket) return;

    const handleScanCompleted = (data) => {
      console.log('[URLScanner] Live scan complete signal received:', data);
      if (data.success && data.scan && data.scan.id === pendingScanIdRef.current) {
        const scanData = data.scan;
        setResult({
          url: scanData.url,
          risk_score: scanData.riskScore,
          confidence: scanData.confidence,
          threat_category: scanData.threatCategory,
          explanations: scanData.explanations.map(item => ({
            factor: item.factor,
            impact: item.impact,
            description: item.label
          }))
        });
        setLoading(false);
        setPendingScanId(null);
      }
    };

    const handleScanFailed = (data) => {
      console.warn('[URLScanner] Live scan failed signal received:', data);
      if (data.scanId === pendingScanIdRef.current) {
        setError(data.error || 'Deep security evaluation timed out.');
        setLoading(false);
        setPendingScanId(null);
      }
    };

    socket.on('scan:completed', handleScanCompleted);
    socket.on('scan:failed', handleScanFailed);

    return () => {
      socket.off('scan:completed', handleScanCompleted);
      socket.off('scan:failed', handleScanFailed);
    };
  }, [socket]);

  const handleScan = async (e) => {
    if (e) e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError('');
    setResult(null);
    setPendingScanId(null);
    setQrSuccessMsg('');

    try {
      const response = await api.post('/scan/url', { url });
      
      if (response.data && response.data.success) {
        const data = response.data;
        if (data.status === 'completed') {
          // Cache hit: slide in results immediately!
          const scanData = data.scan;
          setResult({
            url: scanData.url,
            risk_score: scanData.riskScore,
            confidence: scanData.confidence,
            threat_category: scanData.threatCategory,
            explanations: scanData.explanations.map(item => ({
              factor: item.factor,
              impact: item.impact,
              description: item.label
            }))
          });
          setLoading(false);
        } else {
          // Enqueued in Bull Queue: Keep loader spinning and await websocket completion event!
          setPendingScanId(data.scanId);
          console.log(`[URLScanner] Scan enqueued (ID: ${data.scanId}). Awaiting WebSocket callback...`);
        }
      } else {
        setError('Scanning failed to yield a security assessment.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Scan error:', err.message);
      setError(err.response?.data?.error || 'Connection to security gateway failed.');
      setLoading(false);
    }
  };

  const triggerScanWithUrl = async (scannedUrl) => {
    setLoading(true);
    setError('');
    setResult(null);
    setPendingScanId(null);

    try {
      const response = await api.post('/scan/url', { url: scannedUrl });
      if (response.data && response.data.success) {
        const data = response.data;
        if (data.status === 'completed') {
          const scanData = data.scan;
          setResult({
            url: scanData.url,
            risk_score: scanData.riskScore,
            confidence: scanData.confidence,
            threat_category: scanData.threatCategory,
            explanations: scanData.explanations.map(item => ({
              factor: item.factor,
              impact: item.impact,
              description: item.label
            }))
          });
          setLoading(false);
        } else {
          setPendingScanId(data.scanId);
        }
      } else {
        setError('Scanning failed to yield a security assessment.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Scan error:', err.message);
      setError(err.response?.data?.error || 'Connection to security gateway failed.');
      setLoading(false);
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setQrLoading(true);
    setError('');
    setQrSuccessMsg('');
    setResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const response = await api.post('/scan/qr', { image: base64String });
        if (response.data && response.data.success) {
          if (response.data.qr_found) {
            const decodedUrl = response.data.payload;
            setUrl(decodedUrl);
            setQrSuccessMsg(`Decoded URL: ${decodedUrl}`);
            
            // Auto trigger scan
            setTimeout(() => {
              triggerScanWithUrl(decodedUrl);
            }, 800);
          } else {
            setError(response.data.message || 'No active QR code detected in the scanned image.');
          }
        } else {
          setError(response.data.error || 'Failed to scan QR code.');
        }
      } catch (err) {
        console.error('QR upload scan error:', err);
        setError(err.response?.data?.error || 'Connection to security gateway failed during QR analysis.');
      } finally {
        setQrLoading(false);
        // Reset file input value so same file can be uploaded again if needed
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
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
        <p className="text-sm text-cyber-muted mt-1">Submit web addresses or upload QR codes to audit domain reputation, brand spoofing, and visual clones.</p>
      </div>

      {/* Query Bar */}
      <div className="space-y-4">
        <form onSubmit={handleScan} className="glass-panel p-6 rounded-xl flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full relative">
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
          <div className="flex gap-3 w-full md:w-auto">
            <button
              type="submit"
              disabled={loading || qrLoading}
              className="flex-1 md:flex-none bg-emerald-900/80 hover:bg-cyber-glow border border-emerald-800/40 text-cyber-text hover:text-cyber-dark py-3.5 px-6 rounded-lg font-bold text-sm transition-all duration-200 shadow-glow-emerald flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>Inspect URL</span>
                </>
              )}
            </button>
            
            <label className="flex-1 md:flex-none cursor-pointer bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 text-cyber-muted hover:text-cyber-text py-3.5 px-6 rounded-lg font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 select-none text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleQrUpload}
                disabled={loading || qrLoading}
                className="hidden"
              />
              {qrLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Decoding...</span>
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Scan QR Image</span>
                </>
              )}
            </label>
          </div>
        </form>

        {qrSuccessMsg && (
          <div className="p-3 bg-emerald-950/20 border border-cyber-glow/30 rounded-lg text-cyber-glow text-xs font-mono">
            ✔ {qrSuccessMsg}
          </div>
        )}
      </div>

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

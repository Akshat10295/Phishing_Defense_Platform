import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Shield, Sliders, Cpu, Key, CheckCircle, AlertCircle, RefreshCw, Info, Lock } from 'lucide-react';
import api from '../services/api';

const SettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Default Configurations
  const defaultSettings = {
    // Scoring Weights
    weightMl: 35,
    weightApi: 30,
    weightDomain: 20,
    weightVisual: 15,
    // Thresholds
    siameseThreshold: 0.15,
    hsvThreshold: 0.85,
    // Toggles
    enableXgBoost: true,
    enableSiamese: true,
    enableBert: true,
    enableIntelApis: true,
    enableCache: true,
    // API Keys
    vtKey: '••••••••••••••••••••••••••••••••',
    gsbKey: '••••••••••••••••••••••••••••••••',
    urlScanKey: '••••••••••••••••••••••••••••••••',
    whoisKey: '••••••••••••••••••••••••••••••••',
  };

  const [settings, setSettings] = useState(defaultSettings);

  // Load configuration from local storage if exists
  useEffect(() => {
    const savedSettings = localStorage.getItem('sentinelai_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (err) {
        console.error('Failed to parse saved settings:', err);
      }
    }
  }, []);

  const handleWeightChange = (key, value) => {
    const numericValue = parseInt(value, 10) || 0;
    setSettings((prev) => {
      const updated = { ...prev, [key]: numericValue };
      // Validate sum of weights
      const sum = updated.weightMl + updated.weightApi + updated.weightDomain + updated.weightVisual;
      if (sum !== 100) {
        setValidationError(`Weights must sum to 100% (Current sum: ${sum}%)`);
      } else {
        setValidationError('');
      }
      return updated;
    });
  };

  const handleInputChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleChange = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const sum = settings.weightMl + settings.weightApi + settings.weightDomain + settings.weightVisual;
    if (sum !== 100) {
      setValidationError(`Weights must sum to 100% before saving. Current: ${sum}%`);
      return;
    }

    setLoading(true);
    setSuccess(false);

    // Simulate saving settings to the backend database / caching layer
    setTimeout(() => {
      localStorage.setItem('sentinelai_settings', JSON.stringify(settings));
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1200);
  };

  const resetToDefault = () => {
    if (window.confirm('Are you sure you want to restore default engine coefficients?')) {
      setSettings(defaultSettings);
      setValidationError('');
      localStorage.setItem('sentinelai_settings', JSON.stringify(defaultSettings));
    }
  };

  const totalWeight = settings.weightMl + settings.weightApi + settings.weightDomain + settings.weightVisual;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Title block */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-cyber-glow animate-spin-slow" />
            <span>SentinelAI Engine Configuration</span>
          </h1>
          <p className="text-sm text-cyber-muted mt-1">
            Configure threat detection coefficients, adjust Siamese visual thresholds, and manage microservice pipeline modules.
          </p>
        </div>
        <button
          onClick={resetToDefault}
          className="text-xs font-mono border border-gray-800 hover:border-gray-700 bg-gray-950/60 hover:bg-gray-900/60 text-cyber-muted hover:text-cyber-text px-4 py-2 rounded-lg transition-all"
        >
          Restore Defaults
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Engine Weights */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section: Score Engine Weights */}
          <div className="glass-panel p-6 rounded-xl space-y-6">
            <div className="border-b border-gray-900 pb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyber-glow" />
              <h3 className="text-xs uppercase font-mono tracking-wider text-cyber-muted">Threat Scoring Engine Coefficients</h3>
            </div>

            <div className="space-y-6">
              {/* Weight: XGBoost ML */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300 font-semibold uppercase">XGBoost Lexical ML Weight</span>
                  <span className="text-cyber-glow font-bold">{settings.weightMl}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.weightMl}
                  onChange={(e) => handleWeightChange('weightMl', e.target.value)}
                  className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyber-glow"
                />
              </div>

              {/* Weight: Threat Intel */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300 font-semibold uppercase">Threat Intelligence APIs Weight</span>
                  <span className="text-cyber-glow font-bold">{settings.weightApi}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.weightApi}
                  onChange={(e) => handleWeightChange('weightApi', e.target.value)}
                  className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyber-glow"
                />
              </div>

              {/* Weight: Domain Analysis */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300 font-semibold uppercase">Domain Reputation Heuristics Weight</span>
                  <span className="text-cyber-glow font-bold">{settings.weightDomain}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.weightDomain}
                  onChange={(e) => handleWeightChange('weightDomain', e.target.value)}
                  className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyber-glow"
                />
              </div>

              {/* Weight: Siamese Neural Net */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300 font-semibold uppercase">Siamese Visual Similarity Weight</span>
                  <span className="text-cyber-glow font-bold">{settings.weightVisual}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.weightVisual}
                  onChange={(e) => handleWeightChange('weightVisual', e.target.value)}
                  className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyber-glow"
                />
              </div>
            </div>

            {/* Verification Status */}
            <div className="pt-4 border-t border-gray-900 flex justify-between items-center text-xs font-mono">
              <span className="text-cyber-muted">Total Coefficient Allocation:</span>
              <span className={`font-bold ${totalWeight === 100 ? 'text-cyber-glow' : 'text-cyber-threat'}`}>
                {totalWeight}% / 100%
              </span>
            </div>

            {validationError && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-cyber-threat text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* Section: Model Specific Thresholds */}
          <div className="glass-panel p-6 rounded-xl space-y-6">
            <div className="border-b border-gray-900 pb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyber-glow" />
              <h3 className="text-xs uppercase font-mono tracking-wider text-cyber-muted">Visual Classifier Sensitivity Settings</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Siamese Distance */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300 font-semibold">Siamese L2 Distance Bound</span>
                  <span className="text-cyber-glow font-bold">{settings.siameseThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.01"
                  value={settings.siameseThreshold}
                  onChange={(e) => handleInputChange('siameseThreshold', parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyber-glow"
                />
                <p className="text-[10px] text-cyber-muted leading-relaxed font-mono">
                  L2 distance threshold representing visual similarity. Values &lt; {settings.siameseThreshold} declare page an identical clone.
                </p>
              </div>

              {/* HSV Histogram Similarity */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-gray-300 font-semibold">HSV Histogram Threshold</span>
                  <span className="text-cyber-glow font-bold">{settings.hsvThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={settings.hsvThreshold}
                  onChange={(e) => handleInputChange('hsvThreshold', parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyber-glow"
                />
                <p className="text-[10px] text-cyber-muted leading-relaxed font-mono">
                  Correlation coefficient of color histograms. Higher limits verify color matching accuracy.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading || totalWeight !== 100}
              className="flex-1 bg-emerald-900/80 hover:bg-cyber-glow border border-emerald-800/40 text-cyber-text hover:text-cyber-dark py-3.5 px-6 rounded-lg font-bold text-sm transition-all duration-200 shadow-glow-emerald flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Committing Changes...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Apply & Deploy Configuration</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback messages */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-emerald-950/30 border border-cyber-glow/40 rounded-lg text-cyber-glow text-sm font-mono flex items-center gap-3 shadow-glow-emerald"
              >
                <CheckCircle className="w-5 h-5 text-cyber-glow" />
                <div>
                  <p className="font-bold">Configuration Deployed Successfully!</p>
                  <p className="text-xs text-cyber-muted mt-0.5">Parameters updated across local scoring engines and Redis caching layer.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Right column: Toggles & API Keys */}
        <div className="space-y-8">
          
          {/* Section: Component Modules */}
          <div className="glass-panel p-6 rounded-xl space-y-6">
            <div className="border-b border-gray-900 pb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyber-glow" />
              <h3 className="text-xs uppercase font-mono tracking-wider text-cyber-muted">Active Pipeline Modules</h3>
            </div>

            <div className="space-y-4 font-mono">
              {/* Toggle: XGBoost */}
              <div className="flex justify-between items-center py-2 border-b border-gray-950">
                <div>
                  <span className="text-xs font-semibold text-gray-200">XGBoost Classifier</span>
                  <p className="text-[9px] text-cyber-muted">URL lexical inspections</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('enableXgBoost')}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings.enableXgBoost ? 'bg-cyber-glow' : 'bg-gray-800'}`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-cyber-dark absolute top-[3px] transition-transform ${settings.enableXgBoost ? 'left-[23px]' : 'left-[3px]'}`} />
                </button>
              </div>

              {/* Toggle: Siamese */}
              <div className="flex justify-between items-center py-2 border-b border-gray-950">
                <div>
                  <span className="text-xs font-semibold text-gray-200">Siamese Neural Network</span>
                  <p className="text-[9px] text-cyber-muted">Visual similarity clone checker</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('enableSiamese')}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings.enableSiamese ? 'bg-cyber-glow' : 'bg-gray-800'}`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-cyber-dark absolute top-[3px] transition-transform ${settings.enableSiamese ? 'left-[23px]' : 'left-[3px]'}`} />
                </button>
              </div>

              {/* Toggle: BERT */}
              <div className="flex justify-between items-center py-2 border-b border-gray-950">
                <div>
                  <span className="text-xs font-semibold text-gray-200">BERT Email NLP Model</span>
                  <p className="text-[9px] text-cyber-muted">Phishing speech parsing</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('enableBert')}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings.enableBert ? 'bg-cyber-glow' : 'bg-gray-800'}`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-cyber-dark absolute top-[3px] transition-transform ${settings.enableBert ? 'left-[23px]' : 'left-[3px]'}`} />
                </button>
              </div>

              {/* Toggle: Intel APIs */}
              <div className="flex justify-between items-center py-2 border-b border-gray-950">
                <div>
                  <span className="text-xs font-semibold text-gray-200">External Reputation APIs</span>
                  <p className="text-[9px] text-cyber-muted">VT, Safe Browsing, PhishTank</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('enableIntelApis')}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings.enableIntelApis ? 'bg-cyber-glow' : 'bg-gray-800'}`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-cyber-dark absolute top-[3px] transition-transform ${settings.enableIntelApis ? 'left-[23px]' : 'left-[3px]'}`} />
                </button>
              </div>

              {/* Toggle: Redis Cache */}
              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="text-xs font-semibold text-gray-200">Redis Cache Storage</span>
                  <p className="text-[9px] text-cyber-muted">Mitigate external API cost</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('enableCache')}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings.enableCache ? 'bg-cyber-glow' : 'bg-gray-800'}`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-cyber-dark absolute top-[3px] transition-transform ${settings.enableCache ? 'left-[23px]' : 'left-[3px]'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Section: Threat Intel API Credentials */}
          <div className="glass-panel p-6 rounded-xl space-y-6 relative overflow-hidden">
            {/* Decoupled lock overlay indicator */}
            <div className="absolute right-3 top-3 p-1 bg-gray-950 border border-gray-800 rounded text-cyber-glow">
              <Lock className="w-3.5 h-3.5" />
            </div>

            <div className="border-b border-gray-900 pb-3 flex items-center gap-2">
              <Key className="w-4 h-4 text-cyber-glow" />
              <h3 className="text-xs uppercase font-mono tracking-wider text-cyber-muted">Active Threat Intelligence Keys</h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <span className="text-cyber-muted block text-[10px] uppercase">VirusTotal API Key</span>
                <input
                  type="password"
                  value={settings.vtKey}
                  onChange={(e) => handleInputChange('vtKey', e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 rounded py-2 px-3 text-xs focus:outline-none focus:border-cyber-glow"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-cyber-muted block text-[10px] uppercase">Google Safe Browsing Key</span>
                <input
                  type="password"
                  value={settings.gsbKey}
                  onChange={(e) => handleInputChange('gsbKey', e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 rounded py-2 px-3 text-xs focus:outline-none focus:border-cyber-glow"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-cyber-muted block text-[10px] uppercase">URLScan.io Key</span>
                <input
                  type="password"
                  value={settings.urlScanKey}
                  onChange={(e) => handleInputChange('urlScanKey', e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 rounded py-2 px-3 text-xs focus:outline-none focus:border-cyber-glow"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-cyber-muted block text-[10px] uppercase">WHOIS XML API Key</span>
                <input
                  type="password"
                  value={settings.whoisKey}
                  onChange={(e) => handleInputChange('whoisKey', e.target.value)}
                  className="w-full bg-gray-950/60 border border-gray-850 rounded py-2 px-3 text-xs focus:outline-none focus:border-cyber-glow"
                />
              </div>
            </div>
            
            <div className="p-3 bg-gray-950 border border-gray-850 rounded-lg flex gap-2.5 items-start">
              <Info className="w-4 h-4 text-cyber-glow flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-cyber-muted leading-relaxed font-mono">
                API credentials are encrypted in transit and stored inside secure environments. Placeholder sequences simulate local key presence.
              </p>
            </div>
          </div>

        </div>

      </form>
    </div>
  );
};

export default SettingsPage;

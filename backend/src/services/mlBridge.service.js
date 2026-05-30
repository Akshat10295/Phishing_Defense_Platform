/**
 * ML Service Bridge
 * Coordinates REST communication with the Python ML Flask microservice.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Call the Python Flask ML Service to classify the URL and get SHAP force indicators
 * @param {string} url The target URL to scan
 * @returns {Promise<Object>} The ML prediction payload or a fallback structure on failure
 */
const predictUrl = async (url) => {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`ML Service responded with status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      riskScore: data.risk_score,
      confidence: data.confidence,
      threatCategory: data.threat_category,
      explanations: data.explanations,
      features: data.features,
    };
  } catch (error) {
    console.warn(`[mlBridge] Python ML service is offline/unreachable: ${error.message}. Activating gateway heuristic backup.`);
    
    // Return a structured graceful fallback using rule heuristics in JS
    const fallbackFeatures = extractHeuristicFeatures(url);
    const fallbackScore = calculateHeuristicScore(fallbackFeatures);
    
    return {
      success: false,
      fallback: true,
      riskScore: fallbackScore,
      confidence: 0.70,
      threatCategory: determineHeuristicCategory(fallbackFeatures, fallbackScore),
      explanations: getHeuristicExplanations(fallbackFeatures),
      features: fallbackFeatures,
    };
  }
};

/**
 * Local lexical features extractor for gateway fallback
 */
const extractHeuristicFeatures = (url) => {
  const cleanUrl = url.toLowerCase();
  let domain = '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `http://${url}`);
    domain = parsed.hostname;
  } catch (e) {
    domain = cleanUrl.split('/')[0];
  }

  const specialChars = ['login', 'verify', 'secure', 'account', 'update', 'signin', 'portal', 'bank'];
  const keywordCount = specialChars.reduce((acc, kw) => acc + (cleanUrl.includes(kw) ? 1 : 0), 0);

  const highRiskTlds = ['.xyz', '.top', '.tk', '.ml', '.cf', '.gq', '.club', '.work', '.info', '.click'];
  const tldRisk = highRiskTlds.some(tld => domain.endsWith(tld)) ? 1.0 : 0.0;

  const brandLookalike = ['paypal', 'netflix', 'microsoft', 'google', 'apple', 'amazon', 'chase'].some(
    brand => cleanUrl.includes(brand) && !domain.startsWith(brand) && !domain.includes(`.${brand}.`)
  ) ? 1 : 0;

  const ipPresence = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(domain) ? 1 : 0;

  return {
    url_length: url.length,
    domain_length: domain.length,
    qty_dot: (url.match(/\./g) || []).length,
    qty_hyphen: (url.match(/-/g) || []).length,
    qty_slash: (url.match(/\//g) || []).length,
    qty_subdomain: Math.max(0, domain.split('.').length - 2),
    ip_presence: ipPresence,
    tld_risk: tldRisk,
    brand_lookalike: brandLookalike,
    has_https: url.startsWith('https://') ? 1 : 0,
    phishing_keywords: keywordCount,
  };
};

/**
 * Local heuristic rules for threat scoring fallback
 */
const calculateHeuristicScore = (features) => {
  let score = 0.1; // Baseline
  if (features.phishing_keywords > 0) score += 0.25 * features.phishing_keywords;
  if (features.ip_presence === 1) score += 0.35;
  if (features.brand_lookalike === 1) score += 0.30;
  if (features.tld_risk > 0) score += 0.20;
  if (features.has_https === 0) score += 0.15;
  return Math.min(1.0, Math.max(0.0, parseFloat(score.toFixed(4))));
};

const determineHeuristicCategory = (features, score) => {
  if (score < 0.35) return 'none';
  if (features.brand_lookalike === 1) return 'brand_impersonation';
  if (features.ip_presence === 1) return 'malware_hosting';
  if (features.phishing_keywords >= 2) return 'credential_harvesting';
  return 'general_phishing';
};

const getHeuristicExplanations = (features) => {
  const explanations = [];
  if (features.phishing_keywords > 0) {
    explanations.push({
      factor: 'phishing_keywords',
      label: 'Social Engineering Keywords Density',
      impact: 0.25 * features.phishing_keywords,
    });
  }
  if (features.ip_presence === 1) {
    explanations.push({
      factor: 'ip_presence',
      label: 'Numeric IP Address Host',
      impact: 0.35,
    });
  }
  if (features.brand_lookalike === 1) {
    explanations.push({
      factor: 'brand_lookalike',
      label: 'Spoofed Brand Name Pattern',
      impact: 0.30,
    });
  }
  if (features.tld_risk > 0) {
    explanations.push({
      factor: 'tld_risk',
      label: 'High-Risk Top Level Domain (.xyz, .top)',
      impact: 0.20,
    });
  }
  if (features.has_https === 0) {
    explanations.push({
      factor: 'has_https',
      label: 'Secure Layer Transport (HTTPS)',
      impact: 0.15,
    });
  }
  return explanations;
};

/**
 * Call Python ML service to decode QR code in image
 * @param {string} base64Image The image containing a QR code as base64 string
 * @returns {Promise<Object>} QR decoding results
 */
const predictQr = async (base64Image) => {
  try {
    const base64Data = base64Image.split(';base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('image', blob, 'qrcode.png');

    const response = await fetch(`${ML_SERVICE_URL}/predict/qr`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ML Service QR responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[mlBridge] predictQr error:', error.message);
    return {
      success: false,
      error: `ML service connection failure: ${error.message}`,
    };
  }
};

module.exports = {
  predictUrl,
  predictQr,
};

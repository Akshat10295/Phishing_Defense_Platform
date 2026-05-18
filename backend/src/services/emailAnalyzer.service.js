/**
 * SentinelAI Email NLP Analyzer Service
 * Direct client coordinator interfacing with the Python Flask BERT sequence classifier.
 */

const axios = require('axios');
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Scan raw email text body via Python HuggingFace Transformer endpoints
 * @param {string} body - Raw email message payload
 * @returns {Promise<object>} Integrated scoring metrics
 */
const scanEmail = async (body) => {
  try {
    console.log('[emailAnalyzer] Querying Flask microservice for BERT NLP prediction...');
    
    const response = await axios.post(`${ML_SERVICE_URL}/predict/email`, { body }, {
      timeout: 5000 // 5 seconds timeout limit
    });
    
    if (response.data && response.data.success !== false) {
      return {
        riskScore: response.data.risk_score,
        isPhishing: response.data.is_phishing,
        confidence: response.data.confidence,
        flags: response.data.flags,
        nlpAnalysis: response.data.nlp_analysis
      };
    }
    
    throw new Error('ML endpoint returned invalid classification payload.');
  } catch (err) {
    console.warn(`[emailAnalyzer] Deep learning gateway timed out or failed (${err.message}). Invoking high-speed local JS fallback.`);
    return executeLocalFallback(body);
  }
};

/**
 * Robust local Javascript heuristic sequence classifier to protect gateway uptime
 */
const executeLocalFallback = (body) => {
  const text = body.toLowerCase();
  
  // Keyword density and weighting tables
  const urgencyWeight = (text.match(/\b(suspend|verify|immediate|urgent|act now|restrict|expire|alert)\b/g) || []).length * 0.3;
  const financialWeight = (text.match(/\b(bank|card|payment|transfer|invoice|billing|irs|funds|refund)\b/g) || []).length * 0.25;
  const vocabWeight = (text.match(/\b(click here|login|sign in|update|dear customer|secured link)\b/g) || []).length * 0.2;
  
  const urgency_score = Math.min(0.95, urgencyWeight);
  const financial_hazard = Math.min(0.95, financialWeight);
  const vocabulary_anomalies = Math.min(0.95, vocabWeight);
  
  const riskScore = parseFloat((0.35 * urgency_score + 0.35 * financial_hazard + 0.30 * vocabulary_anomalies).toFixed(4));
  const isPhishing = riskScore >= 0.50;
  
  const flags = [];
  if (urgency_score >= 0.4) flags.append ? flags.push('urgency_language') : null;
  if (financial_hazard >= 0.4) flags.push('financial_hazard');
  if (vocabulary_anomalies >= 0.4) flags.push('credential_harvesting');
  if (flags.length === 0) flags.push('verified_safe');
  
  return {
    riskScore,
    isPhishing,
    confidence: parseFloat((0.80 + (isPhishing ? riskScore * 0.1 : (1 - riskScore) * 0.1)).toFixed(4)),
    flags,
    nlpAnalysis: {
      urgency_score,
      financial_hazard,
      vocabulary_anomalies
    },
    fallbackActive: true
  };
};

module.exports = {
  scanEmail
};

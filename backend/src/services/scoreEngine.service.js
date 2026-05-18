/**
 * SentinelAI Threat Scoring Engine
 * Implements the weighted score aggregation algorithm described in Section 8 of the architecture.
 */

/**
 * Aggregate all analytical layers into a final threat assessment
 * @param {number} mlScore Risk score from XGBoost ML service (0.0 to 1.0)
 * @param {number} apiScore Aggregated risk score from threat intel APIs (0.0 to 1.0)
 * @param {Object} features Lexical features extracted from the URL
 * @param {Object} whois Whois database results containing domain age
 * @returns {Object} Full threat scoring assessment, including final score, category, level, and dynamic explanations
 */
const evaluateThreat = (mlScore, apiScore, features, whois) => {
  // 1. Calculate Domain Reputation Score (20% weight)
  let domainScore = 0.0;
  const domainExplanations = [];

  if (features.tld_risk > 0) {
    domainScore += 0.40;
    domainExplanations.push({ factor: 'tld_risk', label: 'Registered on High-Risk Top Level Domain (.xyz, .top)', impact: 0.20 });
  }

  // Domain age under 30 days is extremely critical for phishing
  const ageDays = whois?.domainAgeDays !== undefined ? whois.domainAgeDays : 365;
  if (ageDays <= 30) {
    domainScore += 0.50;
    domainExplanations.push({ factor: 'domain_age', label: `Brand New Domain Registration (${ageDays} days old)`, impact: 0.25 });
  } else if (ageDays <= 90) {
    domainScore += 0.25;
    domainExplanations.push({ factor: 'domain_age_medium', label: `Suspiciously New Domain Age (${ageDays} days old)`, impact: 0.12 });
  }

  if (features.entropy > 4.0) {
    domainScore += 0.20;
    domainExplanations.push({ factor: 'entropy', label: 'Elevated Domain Character Randomness (Entropy)', impact: 0.10 });
  }

  if (features.qty_subdomain >= 3) {
    domainScore += 0.20;
    domainExplanations.push({ factor: 'qty_subdomain', label: 'Dangerous Subdomain Nested Structure', impact: 0.10 });
  }
  domainScore = Math.min(1.0, domainScore);

  // 2. Calculate Behavioral Signals Score (15% weight)
  let behavioralScore = 0.0;
  const behavioralExplanations = [];

  if (features.brand_lookalike === 1) {
    behavioralScore += 0.50;
    behavioralExplanations.push({ factor: 'brand_lookalike', label: 'Impersonation of Established Digital Brand', impact: 0.25 });
  }

  if (features.has_https === 0) {
    behavioralScore += 0.30;
    behavioralExplanations.push({ factor: 'insecure_scheme', label: 'Missing SSL Transport Layer Security (HTTP)', impact: 0.15 });
  }

  if (features.phishing_keywords > 0) {
    const keywordImpact = Math.min(0.40, 0.20 * features.phishing_keywords);
    behavioralScore += keywordImpact;
    behavioralExplanations.push({ 
      factor: 'phishing_keywords', 
      label: `Social Engineering Keyphrase Density (${features.phishing_keywords} flags)`, 
      impact: parseFloat((keywordImpact / 2).toFixed(4)) 
    });
  }

  if (features.ip_presence === 1) {
    behavioralScore += 0.40;
    behavioralExplanations.push({ factor: 'ip_presence', label: 'Explicit Numeric IP Address in Place of Domain', impact: 0.20 });
  }
  behavioralScore = Math.min(1.0, behavioralScore);

  // 3. Compile Final Weighted Score
  // Weights: ML = 35%, APIs = 30%, Domain = 20%, Behavioral = 15%
  const finalScore = parseFloat(
    (
      (mlScore * 0.35) +
      (apiScore * 0.30) +
      (domainScore * 0.20) +
      (behavioralScore * 0.15)
    ).toFixed(4)
  );

  // 4. Map Final Score to Tiers, Levels and Colors
  let riskLevel = 'SAFE';
  let riskColor = 'green';
  let threatCategory = 'none';

  if (finalScore >= 0.8) {
    riskLevel = 'PHISHING';
    riskColor = 'red';
  } else if (finalScore >= 0.6) {
    riskLevel = 'HIGH RISK';
    riskColor = 'orange';
  } else if (finalScore >= 0.3) {
    riskLevel = 'SUSPICIOUS';
    riskColor = 'yellow';
  }

  // 5. Determine Threat Category
  if (finalScore >= 0.3) {
    if (features.brand_lookalike === 1) {
      threatCategory = 'brand_impersonation';
    } else if (features.ip_presence === 1) {
      threatCategory = 'malware_hosting';
    } else if (features.phishing_keywords >= 2) {
      threatCategory = 'credential_harvesting';
    } else {
      threatCategory = 'general_phishing';
    }
  }

  // 6. Aggregate Explanations for Frontend Display
  // Standardize the explainability matrix
  const explanations = [];

  // Add domain & behavioral signals first as they are concrete heuristics
  explanations.push(...domainExplanations, ...behavioralExplanations);

  // Include high level indicators for ML and APIs in the factor display
  if (mlScore > 0.5) {
    explanations.push({
      factor: 'ml_prediction',
      label: `XGBoost ML Classifier Verdict (confidence: ${Math.round(mlScore * 100)}%)`,
      impact: parseFloat((mlScore * 0.35).toFixed(4))
    });
  }
  if (apiScore > 0.5) {
    explanations.push({
      factor: 'threat_intel',
      label: 'Negative Reputation in External Threat Registries (VT/GSB)',
      impact: parseFloat((apiScore * 0.30).toFixed(4))
    });
  }

  // Sort factor list by impact descending to show critical details first
  explanations.sort((a, b) => b.impact - a.impact);

  return {
    riskScore: finalScore,
    riskLevel,
    riskColor,
    threatCategory,
    confidence: mlScore > 0.5 ? mlScore : parseFloat((1.0 - mlScore).toFixed(4)),
    explanations,
    breakdown: {
      mlScore,
      apiScore,
      domainScore,
      behavioralScore,
    }
  };
};

module.exports = {
  evaluateThreat,
};

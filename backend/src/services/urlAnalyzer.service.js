/**
 * URL Scanner Orchestrator
 * Coordinates caching, parallel ML & Threat Intel scans, score aggregation, and DB persistence.
 */

const prisma = require('../config/db');
const mlBridge = require('./mlBridge.service');
const threatIntel = require('./threatIntel.service');
const scoreEngine = require('./scoreEngine.service');

/**
 * Standardizes and sanitizes a URL
 */
const normalizeUrl = (url) => {
  if (!url) return '';
  let clean = url.trim();
  // Ensure protocol is present for standard parsing downstream
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'http://' + clean;
  }
  return clean;
};

/**
 * Extract host domain name
 */
const getDomain = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    return url.split('/')[2] || url.split('/')[0];
  }
};

/**
 * Coordinates end-to-end URL threat analysis
 * @param {string} rawUrl The target URL to scan
 * @param {string|null} userId The ID of the authenticated analyst (optional)
 * @returns {Promise<Object>} The complete saved scan report
 */
const analyzeUrl = async (rawUrl, userId = null) => {
  const url = normalizeUrl(rawUrl);
  if (!url) {
    throw new Error('A valid URL must be provided for scanning.');
  }

  const domain = getDomain(url);

  // 1. Check for recent cached scan (within last 1 hour) in PostgreSQL to preserve API quota
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const cachedScan = await prisma.urlScan.findFirst({
    where: {
      url: url,
      createdAt: {
        gte: oneHourAgo
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (cachedScan) {
    console.log(`[urlAnalyzer] Serving cached scan result for: ${url} (ID: ${cachedScan.id})`);
    return {
      id: cachedScan.id,
      url: cachedScan.url,
      riskScore: cachedScan.riskScore,
      confidence: cachedScan.confidence,
      isPhishing: cachedScan.isPhishing,
      threatCategory: cachedScan.threatCategory,
      features: cachedScan.features,
      explanations: cachedScan.explanations,
      vtResult: cachedScan.vtResult,
      gsbResult: cachedScan.gsbResult,
      createdAt: cachedScan.createdAt,
      cached: true
    };
  }

  console.log(`[urlAnalyzer] Initiating live hybrid analysis pipeline for: ${url}`);

  // 2. Perform live scanning in parallel
  const [mlResult, intelResult] = await Promise.all([
    mlBridge.predictUrl(url),
    threatIntel.scanThreatIntel(url)
  ]);

  // 3. Aggregate all threat indexes
  const evaluation = scoreEngine.evaluateThreat(
    mlResult.riskScore,
    intelResult.riskScore,
    mlResult.features,
    intelResult.whoisResult
  );

  const isPhishing = evaluation.riskScore >= 0.6;

  // 4. Save scan to the url_scans PostgreSQL table via Prisma
  const savedScan = await prisma.urlScan.create({
    data: {
      userId: userId,
      url: url,
      riskScore: evaluation.riskScore,
      confidence: evaluation.confidence,
      isPhishing: isPhishing,
      threatCategory: evaluation.threatCategory,
      features: mlResult.features,
      explanations: evaluation.explanations,
      vtResult: intelResult.vtResult,
      gsbResult: intelResult.gsbResult
    }
  });

  // 5. Intelligence Feedback Loop: If verdict is high risk/phishing, log domain in malicious_domains
  if (isPhishing) {
    try {
      await prisma.maliciousDomain.upsert({
        where: { domain: domain },
        update: {
          source: 'sentinelai_scoring_engine',
          threatType: evaluation.threatCategory,
          addedAt: new Date()
        },
        create: {
          domain: domain,
          source: 'sentinelai_scoring_engine',
          threatType: evaluation.threatCategory
        }
      });
      console.log(`[urlAnalyzer] Successfully cached malicious domain in blacklist: ${domain}`);
    } catch (dbErr) {
      console.warn(`[urlAnalyzer] Failed to upsert blacklist domain: ${dbErr.message}`);
    }
  }

  // 6. Return response tailored to frontend visual specs
  return {
    id: savedScan.id,
    url: savedScan.url,
    riskScore: savedScan.riskScore,
    confidence: savedScan.confidence,
    isPhishing: savedScan.isPhishing,
    threatCategory: savedScan.threatCategory,
    features: savedScan.features,
    explanations: savedScan.explanations,
    vtResult: savedScan.vtResult,
    gsbResult: savedScan.gsbResult,
    createdAt: savedScan.createdAt,
    cached: false
  };
};

module.exports = {
  analyzeUrl,
};

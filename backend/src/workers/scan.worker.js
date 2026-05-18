/**
 * SentinelAI Threat Scanning Queue Worker
 * Decoupled background process handler that executes ML/API inspections,
 * commits records to PostgreSQL, and pushes real-time WebSocket signals.
 */

const prisma = require('../config/db');
const { urlScanQueue } = require('../services/queue.service');
const mlBridge = require('../services/mlBridge.service');
const threatIntel = require('../services/threatIntel.service');
const scoreEngine = require('../services/scoreEngine.service');
const socketService = require('../services/socket.service');

/**
 * Standardizes domain extraction
 */
const getDomain = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch (e) {
    return url.split('/')[2] || url.split('/')[0];
  }
};

console.log('[scanWorker] Background Bull job worker initialized.');

// Register processing pipeline
urlScanQueue.process(async (job) => {
  const { url, userId, scanId } = job.data;
  console.log(`[scanWorker] Processing scheduled scan job (Job ID: ${job.id}, Scan UUID: ${scanId}) for: ${url}`);

  try {
    // 1. Run live analytical tasks in parallel for optimal throughput
    const [mlResult, intelResult] = await Promise.all([
      mlBridge.predictUrl(url),
      threatIntel.scanThreatIntel(url)
    ]);

    // 2. Aggregate final threat score (weighted calculation)
    const evaluation = scoreEngine.evaluateThreat(
      mlResult.riskScore,
      intelResult.riskScore,
      mlResult.features,
      intelResult.whoisResult
    );

    const isPhishing = evaluation.riskScore >= 0.6;
    const domain = getDomain(url);

    // 3. Update the PENDING database record in PostgreSQL via Prisma
    const updatedScan = await prisma.urlScan.update({
      where: { id: scanId },
      data: {
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

    console.log(`[scanWorker] DB Scan record updated: ${scanId}. Score: ${evaluation.riskScore}, Verdict: ${evaluation.riskLevel}`);

    // 4. Intelligence Feedback Loop: Upsert malicious domain to blacklist if flagged
    if (isPhishing) {
      try {
        await prisma.maliciousDomain.upsert({
          where: { domain: domain },
          update: {
            source: 'sentinelai_scoring_worker',
            threatType: evaluation.threatCategory,
            addedAt: new Date()
          },
          create: {
            domain: domain,
            source: 'sentinelai_scoring_worker',
            threatType: evaluation.threatCategory
          }
        });
        console.log(`[scanWorker] Threat domain blacklisted: ${domain}`);
      } catch (dbErr) {
        console.warn(`[scanWorker] Blacklist domain save skipped: ${dbErr.message}`);
      }
    }

    // 5. Streams Real-Time WebSocket Signals
    // Unicast completion payload back to the specific Analyst's personal room
    if (userId) {
      socketService.sendToUser(userId, 'scan:completed', {
        success: true,
        scan: updatedScan
      });
    }

    // Broadcast global incident threat feed alert if URL is malicious
    if (isPhishing) {
      socketService.broadcastThreat('threat:alert', {
        id: updatedScan.id,
        url: updatedScan.url,
        category: evaluation.threatCategory === 'none' ? 'General Phishing' : evaluation.threatCategory.replace(/_/g, ' '),
        score: evaluation.riskScore,
        createdAt: updatedScan.createdAt
      });
    }

    // Broadcast a general telemetry tick to live Recharts charts
    socketService.broadcastThreat('telemetry:tick', {
      scanId: updatedScan.id,
      riskScore: updatedScan.riskScore,
      isPhishing: isPhishing,
      timeString: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    });

    return { success: true, scanId, riskScore: evaluation.riskScore };
  } catch (err) {
    console.error(`[scanWorker] Job execution crash (Job ID: ${job.id}): ${err.message}`);
    
    // Unicast private failure alert to user if possible
    if (userId) {
      socketService.sendToUser(userId, 'scan:failed', {
        success: false,
        scanId,
        error: 'Dynamic security evaluation failed. External service timeout.'
      });
    }

    throw err; // Re-throw to trigger Bull's automatic exponential retry backoffs
  }
});

module.exports = {
  activeWorker: true,
};

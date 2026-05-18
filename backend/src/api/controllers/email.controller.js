/**
 * SentinelAI Email scan Express Controller
 * Interfaces raw request payloads, triggers BERT models, and persists email scans in Postgres.
 */

const prisma = require('../../config/db');
const emailAnalyzer = require('../../services/emailAnalyzer.service');

/**
 * Scan raw email text body
 * POST /api/v1/scan/email
 */
const scanEmailBody = async (req, res, next) => {
  try {
    const { body, subject, sender } = req.body;

    if (!body) {
      return res.status(400).json({
        success: false,
        error: 'Please provide the raw email text body for NLP auditing.',
      });
    }

    const userId = req.user ? req.user.id : null;

    // 1. Invoke high-performance BERT/Heuristics blended analyzer pipeline
    const result = await emailAnalyzer.scanEmail(body);

    // 2. Persist email scan report inside the PostgreSQL database via Prisma
    const scanReport = await prisma.emailScan.create({
      data: {
        userId,
        subject: subject || 'Ad-hoc Text Audit',
        body,
        sender: sender || 'Unknown Source',
        riskScore: result.riskScore,
        flags: result.flags,
        nlpAnalysis: result.nlpAnalysis
      }
    });

    console.log(`[emailController] Persisted email scan record: ${scanReport.id}, Score: ${result.riskScore}`);

    return res.status(200).json({
      success: true,
      scan: {
        id: scanReport.id,
        risk_score: result.riskScore,
        is_phishing: result.isPhishing,
        confidence: result.confidence,
        flags: result.flags,
        nlp_analysis: result.nlpAnalysis
      }
    });
  } catch (error) {
    console.error('[emailController] NLP email scan error exception:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete sequence classification on email body.',
    });
  }
};

module.exports = {
  scanEmailBody
};

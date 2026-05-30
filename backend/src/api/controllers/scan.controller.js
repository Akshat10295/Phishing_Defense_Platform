/**
 * Threat Scan Express Controller
 * Handles incoming gateway HTTP requests and routes them through the scanners and databases.
 */

const prisma = require('../../config/db');
const urlAnalyzer = require('../../services/urlAnalyzer.service');
const { addScanJob } = require('../../services/queue.service');

/**
 * Trigger dynamic hybrid URL inspection (Asynchronous Bull Queue)
 * POST /api/v1/scan/url
 */
const scanUrl = async (req, res, next) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid URL parameter for inspection.',
      });
    }

    // Standardize protocol normalization
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'http://' + cleanUrl;
    }

    const userId = req.user ? req.user.id : null;

    // 1. Check for recent fully-processed cached scan (within 1 hour) in PostgreSQL to save API quota
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const cachedScan = await prisma.urlScan.findFirst({
      where: {
        url: cleanUrl,
        createdAt: {
          gte: oneHourAgo
        },
        riskScore: {
          not: null // Ensure cached scans represent completed analysis
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (cachedScan) {
      console.log(`[scanController] Instant cache hit for: ${cleanUrl}`);
      return res.status(200).json({
        success: true,
        status: 'completed',
        scan: {
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
        }
      });
    }

    console.log(`[scanController] No cache found. Registering pending scan for: ${cleanUrl}`);

    // 2. Insert a PENDING record in the database (Prisma leaves scores/features null automatically)
    const newScan = await prisma.urlScan.create({
      data: {
        userId,
        url: cleanUrl,
      }
    });

    // 3. Enqueue scanning job in background Bull queue workers
    await addScanJob(cleanUrl, userId, newScan.id);

    // 4. Return rapid 202 Accepted to prevent locking gateway event loops
    return res.status(202).json({
      success: true,
      status: 'pending',
      scanId: newScan.id,
      message: 'Security inspection scheduled in background operations queue.'
    });
  } catch (error) {
    console.error('[scanController] Async URL Scan queue scheduling error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Security Gateway failed to schedule threat inspection in active queues.',
    });
  }
};

/**
 * Get individual scan threat details by database ID
 * GET /api/v1/scan/url/:id
 */
const getScanDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Scan ID parameter is required.',
      });
    }

    const scan = await prisma.urlScan.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        error: 'Scan report not found in SentinelAI threat history index.',
      });
    }

    return res.status(200).json({
      success: true,
      scan,
    });
  } catch (error) {
    console.error('[scanController] Get Scan Details error exception:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve scan audit report.',
    });
  }
};

/**
 * Retrieve current user's scan history
 * GET /api/v1/scan/history
 */
const getScanHistory = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication is required to retrieve personalized threat audits.',
      });
    }

    const whereCondition = req.user.role === 'user' ? { userId: req.user.id } : {};
    const history = await prisma.urlScan.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: 50, // Cap at latest 50 scans for performance
    });

    return res.status(200).json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('[scanController] Get Scan History error exception:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve analyst scan history ledger.',
    });
  }
};

/**
 * Scan QR code containing URL from uploaded base64 image data
 * POST /api/v1/scan/qr
 */
const scanQr = async (req, res, next) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid base64 encoded image string containing a QR code.',
      });
    }

    const mlBridge = require('../../services/mlBridge.service');
    const result = await mlBridge.predictQr(image);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('[scanController] QR scan controller error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to process QR code analysis on security gateway.',
    });
  }
};

module.exports = {
  scanUrl,
  getScanDetails,
  getScanHistory,
  scanQr,
};

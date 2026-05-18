/**
 * Threat Scan Express Controller
 * Handles incoming gateway HTTP requests and routes them through the scanners and databases.
 */

const prisma = require('../../config/db');
const urlAnalyzer = require('../../services/urlAnalyzer.service');

/**
 * Trigger dynamic hybrid URL inspection
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

    // Pass the user ID if the user is authenticated, else run anonymously
    const userId = req.user ? req.user.id : null;
    
    const result = await urlAnalyzer.analyzeUrl(url, userId);

    return res.status(200).json({
      success: true,
      scan: result,
    });
  } catch (error) {
    console.error('[scanController] URL Scan error exception:', error.message);
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Threat scan failed inside the SentinelAI analyzer engine.',
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

    const history = await prisma.urlScan.findMany({
      where: { userId: req.user.id },
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

module.exports = {
  scanUrl,
  getScanDetails,
  getScanHistory,
};

/**
 * SentinelAI Threat Analytics Routing Definitions
 * Maps data endpoints for dashboard statistics and historical trends, secured via JWT.
 */

const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analytics.controller');
const { protect } = require('../../middleware/auth.middleware');

// Secure all analytics queries via JWT validation middleware
router.use(protect);

// Route endpoints definitions
router.get('/stats', analyticsController.getStats);
router.get('/telemetry', analyticsController.getTelemetry);

module.exports = router;

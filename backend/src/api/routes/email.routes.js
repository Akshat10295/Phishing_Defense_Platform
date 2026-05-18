/**
 * SentinelAI Email scan Routing Definitions
 * Maps BERT sequence classification endpoints and protects them via JWT tokens.
 */

const express = require('express');
const router = express.Router();

const emailController = require('../controllers/email.controller');
const { protect } = require('../../middleware/auth.middleware');

// Enforce JWT validation protection globally across email audits
router.use(protect);

// Routing endpoint mapping
router.post('/email', emailController.scanEmailBody);

module.exports = router;

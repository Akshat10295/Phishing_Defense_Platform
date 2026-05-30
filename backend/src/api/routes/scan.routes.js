/**
 * Threat Scan Routing Definitions
 * Maps scanning REST endpoints and secures them with JWT authentication protection.
 */

const express = require('express');
const router = express.Router();

const scanController = require('../controllers/scan.controller');
const { protect } = require('../../middleware/auth.middleware');

// Secure all scan operations via JWT verification middleware
router.use(protect);

// Endpoint routes definitions
router.post('/url', scanController.scanUrl);
router.post('/qr', scanController.scanQr);
router.get('/history', scanController.getScanHistory);
router.get('/url/:id', scanController.getScanDetails);

module.exports = router;

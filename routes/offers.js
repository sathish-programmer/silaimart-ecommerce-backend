const express = require('express');
const router = express.Router();
const { sendOfferToAllUsers, sendOfferToSpecificUsers } = require('../controllers/offerController');
const { adminAuth } = require('../middleware/auth');

// Send offer notification to all users (Admin only)
router.post('/send-to-all', adminAuth, sendOfferToAllUsers);

// Send offer notification to specific users (Admin only)
router.post('/send-to-specific', adminAuth, sendOfferToSpecificUsers);

module.exports = router;
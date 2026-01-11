const express = require('express');
const router = express.Router();
const { sendToAllUsers, sendToUser } = require('../controllers/offerController');
const { adminAuth } = require('../middleware/auth');

// Send offer notification to all users (Admin only)
router.post('/send-to-all', adminAuth, sendToAllUsers);

// Send offer notification to specific user (Admin only)
router.post('/send-to-user', adminAuth, sendToUser);

module.exports = router;
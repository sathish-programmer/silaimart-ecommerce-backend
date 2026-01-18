const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const loyaltyController = require('../controllers/loyaltyController');

// Get loyalty points history
router.get('/history', auth, loyaltyController.getLoyaltyHistory);

// Get loyalty program settings
router.get('/settings', loyaltyController.getLoyaltySettings);

// Get loyalty statistics
router.get('/stats', auth, loyaltyController.getLoyaltyStats);

module.exports = router;
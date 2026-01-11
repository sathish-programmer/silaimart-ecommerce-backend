const express = require('express');
const {
  getSettings,
  getPublicSettings,
  updateSettings,
  updateSettingSection,
  resetSettings
} = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/public', getPublicSettings);

// Admin routes
router.get('/', protect, admin, getSettings);
router.put('/', protect, admin, updateSettings);
router.put('/:section', protect, admin, updateSettingSection);
router.post('/reset', protect, admin, resetSettings);

module.exports = router;
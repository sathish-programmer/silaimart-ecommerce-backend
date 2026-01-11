const express = require('express');
const {
  getBotConfig,
  updateBotConfig,
  handleMessage,
  getConversations,
  getConversation
} = require('../controllers/chatbotController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/config', getBotConfig);
router.post('/message', handleMessage);

// Admin routes
router.put('/config', adminAuth, updateBotConfig);
router.get('/conversations', adminAuth, getConversations);
router.get('/conversations/:id', adminAuth, getConversation);

module.exports = router;
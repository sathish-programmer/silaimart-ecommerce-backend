const express = require('express');
const { 
  getBotFlow, 
  getQuestion, 
  getRecommendations, 
  createQuestion, 
  updateQuestion, 
  deleteQuestion, 
  getAllQuestions 
} = require('../controllers/botController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/start', getBotFlow);
router.get('/question/:id', getQuestion);
router.post('/recommendations', getRecommendations);

// Admin routes
router.get('/questions', adminAuth, getAllQuestions);
router.post('/questions', adminAuth, createQuestion);
router.put('/questions/:id', adminAuth, updateQuestion);
router.delete('/questions/:id', adminAuth, deleteQuestion);

module.exports = router;
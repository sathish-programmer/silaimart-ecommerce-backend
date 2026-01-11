const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  getUserReview,
  getAllReviews,
  updateReviewStatus,
  deleteReview
} = require('../controllers/reviewController');
const { protect, admin } = require('../middleware/auth');

// Customer routes
router.post('/', protect, createReview);
router.get('/product/:productId', getProductReviews);
router.get('/user/:productId', protect, getUserReview);

// Admin routes
router.get('/admin', protect, admin, getAllReviews);
router.put('/admin/:id', protect, admin, updateReviewStatus);
router.delete('/admin/:id', protect, admin, deleteReview);

module.exports = router;
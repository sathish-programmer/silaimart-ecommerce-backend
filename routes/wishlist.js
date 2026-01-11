const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.get('/', protect, getWishlist);
router.post('/', protect, addToWishlist);
router.delete('/:productId', protect, removeFromWishlist);
router.get('/check/:productId', protect, checkWishlist);
router.delete('/', protect, clearWishlist);

module.exports = router;
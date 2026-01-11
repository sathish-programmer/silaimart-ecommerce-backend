const express = require('express');
const {
  getBanners,
  getAllBanners,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
  updateBannerOrder
} = require('../controllers/bannerController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getBanners);

// Admin routes
router.get('/admin/all', protect, admin, getAllBanners);
router.get('/:id', protect, admin, getBanner);
router.post('/', protect, admin, createBanner);
router.put('/:id', protect, admin, updateBanner);
router.delete('/:id', protect, admin, deleteBanner);
router.put('/admin/order', protect, admin, updateBannerOrder);

module.exports = router;
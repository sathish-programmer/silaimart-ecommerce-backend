const express = require('express');
const { 
  getCoupons, 
  getCoupon, 
  validateCoupon, 
  createCoupon, 
  updateCoupon, 
  deleteCoupon 
} = require('../controllers/couponController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/validate', validateCoupon);
router.get('/public', getCoupons);

// Admin routes
router.get('/', adminAuth, getCoupons);
router.get('/:id', adminAuth, getCoupon);
router.post('/', adminAuth, createCoupon);
router.put('/:id', adminAuth, updateCoupon);
router.delete('/:id', adminAuth, deleteCoupon);

module.exports = router;
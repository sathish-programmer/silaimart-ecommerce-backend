const express = require('express');
const { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  createStripePaymentIntent, 
  confirmStripePayment,
  getPaymentMethods,
  generateQRCode,
  verifyQRPayment
} = require('../controllers/paymentController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Payment methods
router.get('/methods', getPaymentMethods);

// QR Code payment
router.post('/qr/generate', auth, generateQRCode);
router.post('/qr/verify', auth, verifyQRPayment);

// Razorpay routes
router.post('/razorpay/create', auth, createRazorpayOrder);
router.post('/razorpay/verify', auth, verifyRazorpayPayment);

// Stripe routes
router.post('/stripe/create', auth, createStripePaymentIntent);
router.post('/stripe/confirm', auth, confirmStripePayment);

module.exports = router;
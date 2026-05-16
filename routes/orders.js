const express = require('express');
const { 
  createOrder, 
  getOrders, 
  getOrder, 
  updateOrderStatus, 
  generateInvoice, 
  trackOrder,
  cancelOrder
} = require('../controllers/orderController');
const { auth, adminAuth } = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');

const router = express.Router();

// Public routes
router.get('/track/:orderNumber', trackOrder);

// User routes
router.post('/', auth, idempotency, createOrder);
router.get('/', auth, getOrders);
router.get('/:id', auth, getOrder);
router.get('/:id/invoice', auth, generateInvoice);

// Admin routes
router.put('/:id/status', adminAuth, updateOrderStatus);
router.post('/:id/cancel', adminAuth, cancelOrder);

module.exports = router;
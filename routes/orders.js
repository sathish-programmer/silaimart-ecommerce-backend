const express = require('express');
const { createOrder, getOrders, getOrder, updateOrderStatus, generateInvoice } = require('../controllers/orderController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// User routes
router.post('/', auth, createOrder);
router.get('/', auth, getOrders);
router.get('/:id', auth, getOrder);
router.get('/:id/invoice', auth, generateInvoice);

// Admin routes
router.put('/:id/status', adminAuth, updateOrderStatus);

module.exports = router;
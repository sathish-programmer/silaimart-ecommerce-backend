const express = require('express');
const router = express.Router();
const { sendOrderConfirmation, sendOrderStatusUpdate, sendDeliveryDateUpdate, sendOfferNotification } = require('../services/emailService');

// Test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    const { email, type = 'confirmation' } = req.body;
    
    const testUser = {
      name: 'Test User',
      email: email || 'test@example.com'
    };
    
    const testOrder = {
      orderNumber: 'SM' + Date.now(),
      total: 2500,
      paymentMethod: 'razorpay',
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      trackingNumber: 'TRK123456',
      items: [
        {
          product: { name: 'Test Product' },
          quantity: 1,
          price: 2000,
          discountPrice: 1800
        }
      ]
    };
    
    switch (type) {
      case 'confirmation':
        await sendOrderConfirmation(testOrder, testUser);
        break;
      case 'status':
        await sendOrderStatusUpdate(testOrder, testUser, 'pending', 'shipped');
        break;
      case 'delivery':
        await sendDeliveryDateUpdate(testOrder, testUser);
        break;
      case 'offer':
        const testOffer = {
          title: 'Diwali Special Offer',
          description: 'Get amazing discounts on all products',
          discountPercentage: 25,
          couponCode: 'DIWALI25',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };
        await sendOfferNotification(testUser, testOffer);
        break;
      default:
        return res.status(400).json({ message: 'Invalid email type' });
    }
    
    res.json({ 
      success: true, 
      message: `Test ${type} email sent to ${testUser.email}` 
    });
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
const Razorpay = require('razorpay');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const QRCode = require('qrcode');
const { Order, Settings } = require('../models');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.getPaymentMethods = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    const paymentMethods = {
      razorpay: {
        enabled: settings?.payment?.razorpay?.enabled || false,
        keyId: settings?.payment?.razorpay?.keyId || process.env.RAZORPAY_KEY_ID
      },
      stripe: {
        enabled: settings?.payment?.stripe?.enabled || false,
        publicKey: settings?.payment?.stripe?.publicKey || process.env.STRIPE_PUBLIC_KEY
      },
      cod: {
        enabled: settings?.payment?.cod?.enabled || true,
        minimumAmount: settings?.payment?.cod?.minimumAmount || 0,
        maximumAmount: settings?.payment?.cod?.maximumAmount || 5000
      },
      qr: {
        enabled: settings?.payment?.qr?.enabled || false,
        upiId: settings?.payment?.qr?.upiId || 'silaimart@paytm'
      }
    };
    
    res.json(paymentMethods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateQRCode = async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    const settings = await Settings.findOne();
    
    if (!settings?.payment?.qr?.enabled) {
      return res.status(400).json({ message: 'QR payment not enabled' });
    }
    
    const upiId = settings.payment.qr.upiId;
    const upiString = `upi://pay?pa=${upiId}&pn=SilaiMart&am=${amount}&cu=INR&tn=Order%20${orderId}`;
    
    const qrCodeDataURL = await QRCode.toDataURL(upiString, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({ 
      qrCode: qrCodeDataURL,
      upiString,
      instructions: [
        'Scan this QR code with any UPI app',
        'Enter your UPI PIN to complete payment',
        'Payment will be verified automatically'
      ]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', orderId } = req.body;
    
    // Get Razorpay credentials from settings
    const settings = await Settings.findOne();
    const razorpayKeyId = settings?.payment?.razorpay?.keyId || process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = settings?.payment?.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET;
    
    if (!razorpayKeyId || !razorpayKeySecret) {
      return res.status(400).json({ message: 'Razorpay credentials not configured' });
    }
    
    const razorpayInstance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
    
    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency,
      receipt: `receipt_${orderId || Date.now()}`,
      notes: {
        orderId: orderId || 'direct_payment'
      }
    };

    const order = await razorpayInstance.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    
    // Get Razorpay secret from settings
    const settings = await Settings.findOne();
    const razorpayKeySecret = settings?.payment?.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET;
    
    if (!razorpayKeySecret) {
      return res.status(400).json({ message: 'Razorpay secret not configured' });
    }
    
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', razorpayKeySecret);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      // Update order status
      const order = await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        paymentId: razorpay_payment_id,
        orderStatus: 'confirmed'
      }, { new: true });
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      res.json({ 
        message: 'Payment verified successfully',
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus
        }
      });
    } else {
      res.status(400).json({ message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.createStripePaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'inr', orderId } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // amount in smallest currency unit
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: orderId || 'direct_payment'
      }
    });

    res.json({ 
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe payment intent creation error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.confirmStripePayment = async (req, res) => {
  try {
    const { payment_intent_id, orderId } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    if (paymentIntent.status === 'succeeded') {
      const order = await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        paymentId: payment_intent_id,
        orderStatus: 'confirmed'
      }, { new: true });
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      res.json({ 
        message: 'Payment confirmed successfully',
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus
        }
      });
    } else {
      res.status(400).json({ message: 'Payment not successful' });
    }
  } catch (error) {
    console.error('Stripe payment confirmation error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.verifyQRPayment = async (req, res) => {
  try {
    const { orderId, transactionId, amount } = req.body;
    
    // In a real implementation, you would verify the transaction with your payment provider
    // For now, we'll simulate verification
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Simulate payment verification (in production, verify with actual payment gateway)
    if (transactionId && amount === order.total) {
      const updatedOrder = await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        paymentId: transactionId,
        orderStatus: 'confirmed'
      }, { new: true });
      
      res.json({ 
        message: 'QR payment verified successfully',
        order: {
          _id: updatedOrder._id,
          orderNumber: updatedOrder.orderNumber,
          paymentStatus: updatedOrder.paymentStatus,
          orderStatus: updatedOrder.orderStatus
        }
      });
    } else {
      res.status(400).json({ message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('QR payment verification error:', error);
    res.status(500).json({ message: error.message });
  }
};
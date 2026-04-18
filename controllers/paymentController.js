const Razorpay = require('razorpay');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Order, Settings, Product, Coupon, User, LoyaltyTransaction } = require('../models');
const { sendOrderNotification, sendPaymentNotification } = require('../services/notificationService');
const { sendOrderConfirmation, sendOrderStatusUpdate } = require('../services/emailService');

console.log('🚀 [DEBUG] Payment Controller Loaded');

/* ── Helper: get validated Razorpay instance ── */
/* ── Helper: get validated Razorpay instance ── */
async function getRazorpayInstance() {
  console.log('🔍 [DEBUG] getRazorpayInstance: Fetching settings...');
  let settings;
  try {
    settings = await Settings.getSettings(); // Uses the static method for safety
  } catch (err) {
    console.error('❌ [DEBUG] Settings.getSettings() failed:', err.message);
  }

  const keyId     = settings?.payment?.razorpay?.keyId     || process.env.RAZORPAY_KEY_ID;
  const keySecret = settings?.payment?.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET;

  console.log('🔍 [DEBUG] Razorpay Keys Check:', {
    hasKeyId: !!keyId,
    keyIdPrefix: keyId ? keyId.substring(0, 10) : 'none',
    hasKeySecret: !!keySecret,
    isPlaceholder: keyId?.startsWith('your_') || false
  });

  if (!keyId || !keySecret || keyId.startsWith('your_') || keySecret.startsWith('your_')) {
    throw new Error('Razorpay keys are not configured. Please add your Key ID and Key Secret in Admin → Settings → Payment Gateway.');
  }

  return { instance: new Razorpay({ key_id: keyId, key_secret: keySecret }), keyId, keySecret };
}

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
        minimumAmount: settings?.payment?.cod?.minimumAmount ?? 0,
        maximumAmount: settings?.payment?.cod?.maximumAmount ?? 5000
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
    const merchantName = settings.payment.qr.merchantName || 'SilaiMart';
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=Order%20${orderId}`;
    
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

/* ── Initiate Razorpay Checkout (Pre-Order Calculation) ── */
exports.createRazorpayOrder = async (req, res) => {
  console.log('📥 [DEBUG] createRazorpayOrder hit. Body:', JSON.stringify(req.body, null, 2));
  console.log('👤 [DEBUG] User from req:', req.user ? { userId: req.user.userId, id: req.user.id } : 'undefined');

  try {
    const { items, amount: legacyAmount, couponCode, loyaltyPointsUsed = 0, currency = 'INR', orderId } = req.body;

    let subtotal = 0;
    let total = 0;

    // Support both new (items-based) and legacy (amount-based) payloads
    if (items && Array.isArray(items) && items.length > 0) {
      console.log('🛒 [DEBUG] Processing items for calculation...');
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product || product.stock < item.quantity) {
          console.warn('⚠️ [DEBUG] Stock check failed for:', item.product);
          return res.status(400).json({ message: `Insufficient stock for ${product?.name || 'item'}` });
        }
        subtotal += (product.discountPrice || product.price) * item.quantity;
      }

      let discount = 0;
      if (couponCode) {
        const coupon = await Coupon.findOne({
          code: couponCode.toUpperCase(),
          isActive: true,
          validFrom: { $lte: new Date() },
          validUntil: { $gte: new Date() }
        });
        if (coupon && subtotal >= coupon.minimumAmount) {
          discount = coupon.type === 'percentage' 
            ? Math.min((subtotal * coupon.value) / 100, coupon.maximumDiscount || Infinity) 
            : coupon.value;
        }
      }

      let loyaltyDiscount = 0;
      if (loyaltyPointsUsed > 0) {
        const user = await User.findById(req.user?.userId);
        if ((user?.loyaltyPoints || 0) >= loyaltyPointsUsed) {
          loyaltyDiscount = loyaltyPointsUsed; // 1 point = ₹1
        }
      }

      const settings = await Settings.getSettings();
      const shippingCost = subtotal >= (settings?.shipping?.freeShippingThreshold ?? 1000) ? 0 : (settings?.shipping?.standardShipping ?? 50);
      const taxRate = settings?.tax?.rate || 18;
      const taxEnabled = settings?.tax?.enabled !== false;
      const tax = taxEnabled ? Math.round((subtotal - discount - loyaltyDiscount) * (taxRate / 100)) : 0;
      total = Math.max(0, subtotal - discount - loyaltyDiscount + shippingCost + tax);
      console.log('💰 [DEBUG] Calculated Total:', total, '(Subtotal:', subtotal, 'Discount:', discount, 'Tax:', tax, ')');
    } else if (legacyAmount) {
      console.log('⚠️ [DEBUG] Using legacy amount fallback:', legacyAmount);
      total = legacyAmount;
    } else {
      console.error('❌ [DEBUG] Invalid payload: No items or amount');
      return res.status(400).json({ message: 'Missing order items or amount' });
    }

    if (total < 1) {
      console.error('❌ [DEBUG] Amount too low:', total);
      return res.status(400).json({ message: 'Order amount must be at least ₹1' });
    }

    // 2. Create Razorpay order
    const { instance: razorpayInstance } = await getRazorpayInstance();
    const razorpayData = {
      amount: Math.round(total * 100), // paise
      currency: (currency || 'INR').toUpperCase(),
      receipt: `init_${Date.now().toString().slice(-8)}`,
      notes: { userId: req.user?.userId || 'guest', legacyOrderId: orderId || '' }
    };

    console.log('📡 [DEBUG] Sending request to Razorpay handle...');
    const order = await razorpayInstance.orders.create(razorpayData);
    console.log('✅ [DEBUG] Razorpay Order created:', order.id);
    res.json({ razorpayOrder: order, calculatedTotal: total });
  } catch (error) {
    if (!error) {
       console.error('❌ [DEBUG] Razorpay initiation error: error object is literal undefined!');
    } else {
       console.error('❌ [DEBUG] Razorpay initiation error:', error);
       console.error('❌ [DEBUG] Error stack:', error.stack);
    }
    res.status(500).json({ message: error?.message || 'Internal Server Error during Razorpay initiation' });
  }
};

/* ── Verify Signature AND Create Order record ── */
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      orderData // full details from frontend
    } = req.body;

    const { keySecret } = await getRazorpayInstance();

    // 1. Signature Check
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    if (hmac.digest('hex') !== razorpay_signature) {
      return res.status(400).json({ message: 'Security check failed: signature mismatch' });
    }

    // 2. Re-calculate and SAVE ORDER (Copy logic from orderController)
    const { items, shippingAddress, couponCode, loyaltyPointsUsed = 0 } = orderData;
    
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ message: `Stock changed during payment for ${product?.name || 'item'}` });
      }
      const price = product.discountPrice || product.price;
      orderItems.push({ product: product._id, quantity: item.quantity, price: product.price, discountPrice: product.discountPrice });
      subtotal += price * item.quantity;
    }

    let discount = 0;
    let couponRef = null;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && subtotal >= coupon.minimumAmount) {
        discount = coupon.type === 'percentage' ? Math.min((subtotal * coupon.value) / 100, coupon.maximumDiscount || Infinity) : coupon.value;
        couponRef = { code: coupon.code, discount };
        await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 } });
      }
    }

    let loyaltyDiscount = 0;
    if (loyaltyPointsUsed > 0) {
      const user = await User.findById(req.user.userId);
      if (user.loyaltyPoints >= loyaltyPointsUsed) {
        loyaltyDiscount = loyaltyPointsUsed;
        await User.findByIdAndUpdate(req.user.userId, { $inc: { loyaltyPoints: -loyaltyPointsUsed } });
      }
    }

    const appSettings = await Settings.findOne();
    const shippingCost = subtotal >= (appSettings?.shipping?.freeShippingThreshold ?? 1000) ? 0 : (appSettings?.shipping?.standardShipping ?? 50);
    const taxAmount = Math.round((subtotal - discount - loyaltyDiscount) * ((appSettings?.tax?.rate || 18) / 100));
    const total = Math.max(0, subtotal - discount - loyaltyDiscount + shippingCost + taxAmount);

    const orderNumber = `SM${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const order = new Order({
      orderNumber,
      user: req.user.userId,
      items: orderItems,
      subtotal, discount, loyaltyPointsUsed, loyaltyDiscount, shippingCost, tax: taxAmount, total,
      coupon: couponRef,
      shippingAddress,
      paymentMethod: 'razorpay',
      orderStatus: 'confirmed',
      paymentStatus: 'paid',
      paymentId: razorpay_payment_id
    });

    await order.save();

    // Deduct Stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // Notifications & Emails
    const populatedOrder = await Order.findById(order._id).populate('items.product').populate('user');
    await sendOrderConfirmation(populatedOrder, populatedOrder.user);
    await sendOrderNotification(req.user.userId, order._id, 'created', populatedOrder);
    await sendPaymentNotification(req.user.userId, 'success', { orderId: order._id, amount: order.total });

    res.status(201).json({ success: true, message: 'Order created successfully', order: populatedOrder });
  } catch (error) {
    console.error('❌ Verify & Save error:', error);
    res.status(500).json({ message: error.message || 'Verification failed' });
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

/* ── Refund Razorpay Payment ── */
exports.refundRazorpayPayment = async (order, reason = 'Order cancelled by admin') => {
  console.log(`📡 [DEBUG] Initiating refund for Order: ${order.orderNumber}, Payment: ${order.paymentId}`);
  
  try {
    if (!order.paymentId) {
      throw new Error('No payment ID found for this order.');
    }

    const { instance: razorpayInstance } = await getRazorpayInstance();
    
    // Razorpay amount is in paise (₹1 = 100 paise)
    const refundData = {
      amount: Math.round(order.total * 100),
      notes: {
        orderNumber: order.orderNumber,
        reason: reason,
        adminAction: 'true'
      }
    };

    console.log('📡 [DEBUG] Requesting Razorpay Refund:', refundData);
    const refund = await razorpayInstance.payments.refund(order.paymentId, refundData);
    console.log('✅ [DEBUG] Razorpay Refund Successful:', refund.id);

    return {
      success: true,
      refundId: refund.id,
      status: refund.status,
      amount: order.total,
      at: new Date()
    };
  } catch (error) {
    console.error('❌ [DEBUG] Razorpay Refund Error Details:', {
      message: error.message,
      description: error.description,
      code: error.code,
      metadata: error.metadata,
      reason: error.reason
    });
    
    // Throw a more descriptive error message if available
    const errorMessage = error.description || error.message || 'Failed to process refund through Razorpay';
    throw new Error(errorMessage);
  }
};
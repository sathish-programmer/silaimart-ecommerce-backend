const mongoose = require('mongoose');
const { Order, Product, Coupon, User, Settings, LoyaltyTransaction } = require('../models');
const loyaltyService = require('../services/loyaltyService');
const { sendOrderNotification, sendPaymentNotification } = require('../services/notificationService');
const { sendOrderConfirmation, sendOrderStatusUpdate, sendDeliveryDateUpdate, sendLoyaltyPointsNotification } = require('../services/emailService');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const crypto = require('crypto');

exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};

    if (status) filter.orderStatus = status;

    const orders = await Order.find(filter)
      .populate('items.product', 'name images price createdBy')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};

    // Regular admin can only see orders for products they created
    const adminProducts = await Product.find({ createdBy: req.user.userId }).select('_id');
    const productIds = adminProducts.map(p => p._id);

    if (productIds.length > 0) {
      filter['items.product'] = { $in: productIds };
    } else {
      // If admin has no products, return empty result
      return res.json({
        success: true,
        orders: [],
        totalPages: 0,
        currentPage: page,
        total: 0
      });
    }

    if (status) filter.orderStatus = status;

    const orders = await Order.find(filter)
      .populate('items.product', 'name images price createdBy')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const isId = mongoose.Types.ObjectId.isValid(req.params.id);
    const filter = isId ? { _id: req.params.id } : { orderNumber: req.params.id };

    const order = await Order.findOne(filter)
      .populate('items.product', 'name images price')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        order: null
      });
    }

    // Ensure items array exists
    if (!order.items) {
      order.items = [];
    }

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        items: order.items || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      order: null
    });
  }
};

exports.createOrder = async (req, res) => {
  const isStandalone = process.env.NODE_ENV === 'development' || 
                       process.env.MONGODB_URI?.includes('localhost') || 
                       process.env.MONGODB_URI?.includes('127.0.0.1');

  let session = null;
  let opt = undefined;

  if (!isStandalone) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      opt = { session };
    } catch (err) {
      console.warn('[MongoDB] Failed to start transaction, running without transaction');
      opt = undefined;
    }
  } else {
    console.warn('[MongoDB] Standalone mode detected: running createOrder without transaction');
  }

  try {
    const { items, shippingAddress, paymentMethod, couponCode, loyaltyPointsUsed = 0 } = req.body;

    let subtotal = 0;
    const orderItems = [];

    // 1. Atomic Stock Check & Decrement
    for (const item of items) {
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, ...opt }
      );

      if (!updatedProduct) {
        if (opt && session?.inTransaction()) await session.abortTransaction();
        if (opt && session) session.endSession();
        return res.status(400).json({ 
          message: `Product ${item.product} is out of stock or insufficient quantity` 
        });
      }

      const price = updatedProduct.discountPrice || updatedProduct.price;
      orderItems.push({
        product: updatedProduct._id,
        quantity: item.quantity,
        price: updatedProduct.price,
        discountPrice: updatedProduct.discountPrice
      });

      subtotal += price * item.quantity;
    }

    let discount = 0;
    let coupon = null;
    let loyaltyDiscount = 0;

    // 2. Coupon Validation
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      }).session(opt ? opt.session : null);

      if (coupon && subtotal >= coupon.minimumAmount) {
        if (coupon.type === 'percentage') {
          discount = (subtotal * coupon.value) / 100;
          if (coupon.maximumDiscount) discount = Math.min(discount, coupon.maximumDiscount);
        } else {
          discount = coupon.value;
        }

        await Coupon.updateOne(
          { _id: coupon._id },
          { $inc: { usedCount: 1 } },
          opt
        );
      }
    }

    // 3. Loyalty Validation
    if (loyaltyPointsUsed > 0) {
      const user = await User.findById(req.user.userId).session(opt ? opt.session : null);
      if ((user.loyaltyPoints || 0) >= loyaltyPointsUsed) {
        loyaltyDiscount = loyaltyPointsUsed; 
        user.loyaltyPoints -= loyaltyPointsUsed;
        await user.save(opt);
      } else {
        if (opt && session?.inTransaction()) await session.abortTransaction();
        if (opt && session) session.endSession();
        return res.status(400).json({ message: 'Insufficient loyalty points' });
      }
    }

    // 4. Calculations
    const settings = await Settings.getSettings();
    const freeShippingThreshold = settings.shipping?.freeShippingThreshold ?? 1000;
    const standardShippingPrice = settings.shipping?.standardShipping ?? 50;
    
    const shippingCost = subtotal >= freeShippingThreshold ? 0 : standardShippingPrice;
    const wowDiscount = settings.offers?.wowDeal?.enabled ? Math.round(subtotal * (settings.offers.wowDeal.discountPercentage || 15) / 100) : 0;
    const totalDiscount = discount + loyaltyDiscount + wowDiscount;
    const taxRate = settings.tax?.rate ?? 18;
    const tax = Math.round((subtotal - totalDiscount) * (taxRate / 100));
    const total = Math.max(0, subtotal - totalDiscount + shippingCost + tax);

    const orderNumber = `SM${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    // 5. Order Record
    const order = new Order({
      orderNumber,
      user: req.user.userId,
      items: orderItems,
      subtotal,
      discount,
      loyaltyPointsUsed: loyaltyPointsUsed || 0,
      loyaltyDiscount,
      shippingCost,
      tax,
      total,
      coupon: coupon ? { code: coupon.code, discount } : null,
      shippingAddress,
      paymentMethod,
      orderStatus: 'pending',
      paymentStatus: 'pending'
    });

    await order.save(opt);

    // 6. Loyalty Ledger
    if (loyaltyPointsUsed > 0) {
      await LoyaltyTransaction.create([{
        user: req.user.userId,
        type: 'redeemed',
        points: loyaltyPointsUsed,
        description: `Redeemed ${loyaltyPointsUsed} points for order discount`,
        orderId: order._id,
        balanceAfter: (await User.findById(req.user.userId).session(opt ? opt.session : null)).loyaltyPoints
      }], opt);
    }

    if (opt && session?.inTransaction()) {
      await session.commitTransaction();
    }
    if (opt && session) session.endSession();

    // 7. Post-Transaction Actions (Notifications)
    try {
      const populatedOrder = await Order.findById(order._id)
        .populate('items.product', 'name images price')
        .populate('user', 'name email');

      await sendOrderConfirmation(populatedOrder, populatedOrder.user);
      
      // Notify the customer
      await sendOrderNotification(req.user.userId, order._id, 'created', populatedOrder);

      // Notify the admins
      const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).select('_id');
      for (const admin of admins) {
        await sendOrderNotification(admin._id, order._id, 'created', populatedOrder);
      }

      if (paymentMethod === 'cod') {
        await sendPaymentNotification(req.user.userId, 'success', {
          orderId: order._id,
          amount: order.total
        });
      }
    } catch (notifyError) {
      console.error('[OrderController] Post-order notifications failed:', notifyError);
    }

    res.status(201).json({ 
      success: true, 
      message: 'Order created successfully',
      orderId: order._id, 
      orderNumber: order.orderNumber 
    });

  } catch (error) {
    if (opt && session?.inTransaction()) await session.abortTransaction();
    if (opt && session) session.endSession();
    console.error('Order creation error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};

    if (!['admin', 'superadmin'].includes(req.user.role)) {
      filter.user = req.user.userId;
    }

    if (status) filter.orderStatus = status;

    const orders = await Order.find(filter)
      .populate('items.product', 'name images price')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      orders: orders || [],
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      orders: [],
      totalPages: 0,
      currentPage: 1,
      total: 0
    });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const isId = mongoose.Types.ObjectId.isValid(req.params.id);
    const filter = isId ? { _id: req.params.id } : { orderNumber: req.params.id };

    if (!['admin', 'superadmin'].includes(req.user.role)) {
      filter.user = req.user.userId;
    }

    const order = await Order.findOne(filter)
      .populate('items.product', 'name images price')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        order: null
      });
    }

    // Ensure items array exists
    if (!order.items) {
      order.items = [];
    }

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        items: order.items || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      order: null
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus, trackingNumber, notes, estimatedDeliveryDate, deliveryNotes, sendEmail } = req.body;

    console.log('Update order request:', { orderStatus, paymentStatus, sendEmail, orderId: req.params.id });

    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const originalStatus = order.orderStatus;
    const originalDeliveryDate = order.estimatedDeliveryDate;

    const updateData = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (notes !== undefined) updateData.notes = notes;
    if (estimatedDeliveryDate) updateData.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
    if (deliveryNotes) updateData.deliveryNotes = deliveryNotes;
    if (orderStatus === 'delivered') updateData.actualDeliveryDate = new Date();

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('items.product', 'name images price')
      .populate('user', 'name email');

    // Award loyalty points when order is delivered using centralized service
    if (orderStatus === 'delivered' && originalStatus !== 'delivered') {
      try {
        const transaction = await loyaltyService.creditPointsForOrder(updatedOrder.user._id, updatedOrder);
        
        if (transaction && sendEmail) {
          // Send loyalty points email
          await sendLoyaltyPointsNotification(updatedOrder.user, transaction.points, 'earned', {
            orderNumber: updatedOrder.orderNumber,
            total: updatedOrder.total
          });
        }
      } catch (loyaltyError) {
        console.error('[OrderController] Loyalty credit failed:', loyaltyError);
        // Don't fail the order update if loyalty fails, but log it
      }

      try {
        console.log('Generating premium PDF invoice for automatic delivery...');
        const pdfBuffer = await generateInvoicePDF(updatedOrder);
        await require('../services/emailService').sendInvoiceEmail(updatedOrder, updatedOrder.user, pdfBuffer);
        console.log('Premium Invoice emailed successfully to', updatedOrder.user.email);
      } catch (pdfError) {
        console.error('Failed to auto-generate or send invoice:', pdfError);
      }
    }

    // Reverse loyalty points if order is cancelled after being delivered
    if (orderStatus === 'cancelled' && originalStatus === 'delivered') {
      try {
        await loyaltyService.reversePointsForOrder(updatedOrder.user._id, updatedOrder._id);
      } catch (reverseError) {
        console.error('[OrderController] Loyalty reversal failed:', reverseError);
      }
    }
    if (sendEmail) {
      console.log('Sending email notifications...');
      try {
        if (orderStatus && orderStatus !== originalStatus) {
          console.log('Sending order status update email');
          console.log('User email:', updatedOrder.user.email);
          console.log('Order details:', { orderNumber: updatedOrder.orderNumber, status: orderStatus });
          await sendOrderStatusUpdate(updatedOrder, updatedOrder.user, originalStatus, orderStatus);
          await sendOrderNotification(updatedOrder.user._id, req.params.id, orderStatus, updatedOrder);
        }

        // Send payment status update email for all relevant status changes
        if (paymentStatus && paymentStatus !== order.paymentStatus) {
          console.log('Sending payment status update email');
          await sendOrderStatusUpdate(updatedOrder, updatedOrder.user, order.paymentStatus, paymentStatus);
        }

        // Send delivery date update email
        if (estimatedDeliveryDate && originalDeliveryDate?.getTime() !== new Date(estimatedDeliveryDate).getTime()) {
          console.log('Sending delivery date update email');
          await sendDeliveryDateUpdate(updatedOrder, updatedOrder.user);
        }
        console.log('Email notifications sent successfully');
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the request if email fails
      }
    } else {
      console.log('Email sending skipped (sendEmail = false)');
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      filter.user = req.user.userId;
    }

    const order = await Order.findOne(filter)
      .populate('items.product', 'name images price')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!['delivered', 'completed'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invoice only available for delivered orders'
      });
    }

    // Generate premium PDF invoice
    const pdfBuffer = await generateInvoicePDF(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice'
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const filter = { _id: req.params.id };

    if (!['admin', 'superadmin'].includes(req.user.role)) {
      filter.user = req.user.userId;
    }

    const order = await Order.findOne(filter).populate('user');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    if (!['pending', 'confirmed', 'processing'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled at stage: ${order.orderStatus}`
      });
    }

    // ── 1. Handle Razorpay Refund ──
    let refundInfo = null;
    if (order.paymentStatus === 'paid' && order.paymentMethod === 'razorpay' && order.paymentId) {
      try {
        const { refundRazorpayPayment } = require('./paymentController');
        refundInfo = await refundRazorpayPayment(order, reason);
        
        order.paymentStatus = 'refunded';
        order.refundId = refundInfo.refundId;
        order.refundStatus = refundInfo.status;
        order.refundAmount = refundInfo.amount;
        order.refundAt = refundInfo.at;
        order.refundReason = reason;
      } catch (refundError) {
        console.error('❌ Refund failed during cancellation:', refundError);
        return res.status(500).json({ 
          success: false, 
          message: `Refund failed: ${refundError.message}. Order not cancelled.` 
        });
      }
    }

    // ── 2. Restore loyalty points if used ──
    if (order.loyaltyPointsUsed > 0) {
      console.log(`💎 Restoring ${order.loyaltyPointsUsed} points for order ${order.orderNumber}`);
      await User.findByIdAndUpdate(order.user._id, {
        $inc: { loyaltyPoints: order.loyaltyPointsUsed }
      });

      const updatedUser = await User.findById(order.user._id);
      await LoyaltyTransaction.create({
        user: order.user._id,
        type: 'earned', // Labelled as reward/refund
        points: order.loyaltyPointsUsed,
        description: `Refunded points for cancelled order #${order.orderNumber}`,
        orderId: order._id,
        balanceAfter: updatedUser.loyaltyPoints,
        metadata: { orderNumber: order.orderNumber, action: 'cancel_refund' }
      });
      
      try {
        await sendLoyaltyPointsNotification(updatedUser, order.loyaltyPointsUsed, 'earned', {
          orderNumber: order.orderNumber,
          total: order.total
        });
      } catch (e) { console.error('Loyalty email failed:', e); }
    }

    // ── 3. Restore product stock ──
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    // ── 4. Finalize Order Status ──
    order.orderStatus = 'cancelled';
    order.cancelReason = reason;
    order.cancelledAt = new Date();
    await order.save();

    // ── 5. Notifications ──
    try {
      await sendOrderNotification(order.user._id, order._id, 'cancelled', order);
      await sendOrderStatusUpdate(order, order.user, 'processing', 'cancelled');
      
      if (refundInfo) {
        await sendPaymentNotification(order.user._id, 'refund', {
          orderId: order._id,
          amount: order.total
        });
      }
    } catch (notifError) {
      console.error('⚠️ Post-cancel notifications failed:', notifError);
    }

    res.json({
      success: true,
      message: refundInfo ? 'Order cancelled and refund initiated successfully' : 'Order cancelled successfully',
      order,
      refunded: !!refundInfo
    });
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get order statistics for admin dashboard
exports.getOrderStats = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'pending'] }, 1, 0] }
          },
          confirmedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'confirmed'] }, 1, 0] }
          },
          shippedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'shipped'] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const dailyStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0
      },
      dailyStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Track order by order number (public endpoint)
exports.trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .select('orderNumber orderStatus trackingNumber createdAt shippingAddress items')
      .populate('items.product', 'name images');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const statusHistory = [
      { status: 'pending', date: order.createdAt, completed: true },
      { status: 'confirmed', completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.orderStatus) },
      { status: 'processing', completed: ['processing', 'shipped', 'delivered'].includes(order.orderStatus) },
      { status: 'shipped', completed: ['shipped', 'delivered'].includes(order.orderStatus) },
      { status: 'delivered', completed: order.orderStatus === 'delivered' }
    ];

    res.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        trackingNumber: order.trackingNumber,
        items: order.items,
        shippingAddress: order.shippingAddress,
        statusHistory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
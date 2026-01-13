const { Order, Product, Coupon, User } = require('../models');
const { sendOrderNotification, sendPaymentNotification } = require('../services/notificationService');
const { sendOrderConfirmation, sendOrderStatusUpdate, sendDeliveryDateUpdate } = require('../services/emailService');
const crypto = require('crypto');

exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = {};
    
    // Role-based filtering - only for regular admin, superadmin sees all
    if (req.user.role === 'admin') {
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
    }
    // Superadmin sees all orders (no filter applied)
    
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
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images price')
      .populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, couponCode } = req.body;
    
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}` 
        });
      }

      const price = product.discountPrice || product.price;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        discountPrice: product.discountPrice
      });
      
      subtotal += price * item.quantity;
    }

    let discount = 0;
    let coupon = null;

    if (couponCode) {
      coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      });

      if (coupon && subtotal >= coupon.minimumAmount) {
        if (coupon.type === 'percentage') {
          discount = (subtotal * coupon.value) / 100;
          if (coupon.maximumDiscount) {
            discount = Math.min(discount, coupon.maximumDiscount);
          }
        } else {
          discount = coupon.value;
        }
        
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const shippingCost = subtotal >= 1000 ? 0 : 50;
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = subtotal - discount + shippingCost + tax;

    // Generate unique order number
    const orderNumber = `SM${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const order = new Order({
      orderNumber,
      user: req.user.userId,
      items: orderItems,
      subtotal,
      discount,
      shippingCost,
      tax,
      total,
      coupon: coupon ? { code: coupon.code, discount } : null,
      shippingAddress,
      paymentMethod,
      orderStatus: 'pending',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending'
    });

    await order.save();

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    await order.populate([
      { path: 'items.product', select: 'name images price' },
      { path: 'user', select: 'name email' }
    ]);

    // Send email confirmation
    const user = await User.findById(req.user.userId);
    await sendOrderConfirmation(order, user);

    // Send notifications
    await sendOrderNotification(req.user.userId, order._id, 'created', order);
    
    // Send payment notification for COD orders
    if (paymentMethod === 'cod') {
      await sendPaymentNotification(req.user.userId, 'success', {
        orderId: order._id,
        amount: order.total
      });
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Order created successfully', 
      order,
      orderNumber: order.orderNumber 
    });
  } catch (error) {
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
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrder = async (req, res) => {
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

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    // Send email notifications only if sendEmail is true
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
        
        // Send payment status update email
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

    // Generate PDF invoice
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).text('SILAIMART', 50, 50);
    doc.fontSize(12).text('Divine Art to Your Doorstep', 50, 75);
    doc.text('Email: silaimartindia@gmail.com', 50, 90);
    
    // Invoice title
    doc.fontSize(18).text('INVOICE', 400, 50);
    doc.fontSize(12).text(`Invoice #: ${order.orderNumber}`, 400, 75);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 400, 105);
    
    // Customer details
    doc.text('Bill To:', 50, 130);
    doc.text(order.shippingAddress.name, 50, 145);
    doc.text(order.shippingAddress.street, 50, 160);
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, 50, 175);
    doc.text(`${order.shippingAddress.pincode}, ${order.shippingAddress.country}`, 50, 190);
    doc.text(`Phone: ${order.shippingAddress.phone}`, 50, 205);
    
    // Items table header
    const tableTop = 250;
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Price', 350, tableTop);
    doc.text('Total', 450, tableTop);
    
    // Draw line
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    // Items
    let yPosition = tableTop + 30;
    order.items.forEach((item) => {
      const price = item.discountPrice || item.price;
      const total = price * item.quantity;
      
      doc.text(item.product.name, 50, yPosition);
      doc.text(item.quantity.toString(), 300, yPosition);
      doc.text(`Rs.${price.toLocaleString()}`, 350, yPosition);
      doc.text(`Rs.${total.toLocaleString()}`, 450, yPosition);
      
      yPosition += 20;
    });
    
    // Summary
    yPosition += 20;
    doc.moveTo(300, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 15;
    
    doc.text('Subtotal:', 350, yPosition);
    doc.text(`Rs.${order.subtotal.toLocaleString()}`, 450, yPosition);
    yPosition += 15;
    
    if (order.discount > 0) {
      doc.text('Discount:', 350, yPosition);
      doc.text(`-Rs.${order.discount.toLocaleString()}`, 450, yPosition);
      yPosition += 15;
    }
    
    doc.text('Shipping:', 350, yPosition);
    doc.text(order.shippingCost === 0 ? 'Free' : `Rs.${order.shippingCost}`, 450, yPosition);
    yPosition += 15;
    
    doc.text('Tax (18% GST):', 350, yPosition);
    doc.text(`Rs.${order.tax.toLocaleString()}`, 450, yPosition);
    yPosition += 15;
    
    doc.moveTo(300, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 15;
    
    doc.fontSize(14).text('Total:', 350, yPosition);
    doc.text(`Rs.${order.total.toLocaleString()}`, 450, yPosition);
    
    // Footer
    doc.fontSize(10).text('Thank you for your business!', 50, 700);
    doc.text('For any queries, contact us at silaimartindia@gmail.com', 50, 715);
    
    doc.end();
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

    const order = await Order.findOne(filter);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order cannot be cancelled at this stage' 
      });
    }

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity } }
      );
    }

    order.orderStatus = 'cancelled';
    order.cancelReason = reason;
    order.cancelledAt = new Date();
    await order.save();

    await sendOrderNotification(order.user, order._id, 'cancelled', order);

    res.json({ 
      success: true, 
      message: 'Order cancelled successfully', 
      order 
    });
  } catch (error) {
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
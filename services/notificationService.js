const { createNotification } = require('../controllers/notificationController');

// Order notification templates
const orderNotifications = {
  created: {
    title: 'Order Placed Successfully! 🎉',
    message: 'Your order has been placed and is being processed.',
    type: 'order',
    priority: 'high',
    icon: 'shopping-bag'
  },
  confirmed: {
    title: 'Order Confirmed ✅',
    message: 'Great news! Your order has been confirmed and will be processed soon.',
    type: 'order',
    priority: 'high',
    icon: 'check-circle'
  },
  processing: {
    title: 'Order Processing 🔄',
    message: 'Your order is being carefully prepared by our artisans.',
    type: 'order',
    priority: 'medium',
    icon: 'cog'
  },
  shipped: {
    title: 'Order Shipped 🚚',
    message: 'Your divine sculptures are on their way to you!',
    type: 'shipping',
    priority: 'high',
    icon: 'truck'
  },
  delivered: {
    title: 'Order Delivered 📦',
    message: 'Your order has been delivered. Enjoy your divine sculptures!',
    type: 'shipping',
    priority: 'high',
    icon: 'gift'
  },
  cancelled: {
    title: 'Order Cancelled ❌',
    message: 'Your order has been cancelled. Refund will be processed if applicable.',
    type: 'order',
    priority: 'high',
    icon: 'x-circle'
  }
};

// Payment notification templates
const paymentNotifications = {
  success: {
    title: 'Payment Successful 💳',
    message: 'Your payment has been processed successfully.',
    type: 'payment',
    priority: 'high',
    icon: 'credit-card'
  },
  failed: {
    title: 'Payment Failed ⚠️',
    message: 'Your payment could not be processed. Please try again.',
    type: 'payment',
    priority: 'high',
    icon: 'alert-triangle'
  },
  refund: {
    title: 'Refund Processed 💰',
    message: 'Your refund has been processed and will reflect in 3-5 business days.',
    type: 'payment',
    priority: 'medium',
    icon: 'money'
  }
};

// Send order notification
exports.sendOrderNotification = async (userId, orderId, status, orderData = {}) => {
  const template = orderNotifications[status];
  if (!template) return;

  const notification = {
    ...template,
    data: {
      orderId,
      amount: orderData.total,
      url: `/orders/${orderId}`
    }
  };

  return await createNotification(userId, notification);
};

// Send payment notification
exports.sendPaymentNotification = async (userId, status, paymentData = {}) => {
  const template = paymentNotifications[status];
  if (!template) return;

  const notification = {
    ...template,
    data: {
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      url: paymentData.orderId ? `/orders/${paymentData.orderId}` : '/orders'
    }
  };

  return await createNotification(userId, notification);
};

// Send offer notification
exports.sendOfferNotification = async (userId, offerData) => {
  const notification = {
    title: `🎉 ${offerData.title}`,
    message: offerData.message,
    type: 'promotion',
    priority: 'medium',
    icon: 'gift',
    data: {
      url: offerData.url || '/shop',
      couponCode: offerData.couponCode
    }
  };

  return await createNotification(userId, notification);
};

// Send bulk offer notifications to all users
exports.sendBulkOfferNotification = async (offerData) => {
  try {
    const User = require('../models/User');
    const users = await User.find({ role: 'user' }, '_id');
    
    const notifications = users.map(user => ({
      user: user._id,
      title: `🎉 ${offerData.title}`,
      message: offerData.message,
      type: 'promotion',
      priority: 'medium',
      icon: 'gift',
      data: {
        url: offerData.url || '/shop',
        couponCode: offerData.couponCode
      }
    }));
    
    const Notification = require('../models/Notification');
    await Notification.insertMany(notifications);
    
    return notifications.length;
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    return 0;
  }
};
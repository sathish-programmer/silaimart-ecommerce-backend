/**
 * Centralized Notification Service
 * Dispatches notifications across multiple channels (Push, Email, SMS, In-App).
 */

const { createNotification } = require('../controllers/notificationController');
const User = require('../models/User');
// In production, these would be real service imports
// const emailService = require('./emailService');
// const pushProvider = require('../utils/pushProvider'); 

class NotificationService {
  constructor() {
    this.send = this.send.bind(this);
    this.sendOrderUpdate = this.sendOrderUpdate.bind(this);
    this.sendOrderNotification = this.sendOrderNotification.bind(this);
    this.sendPaymentNotification = this.sendPaymentNotification.bind(this);
    this.sendOfferNotification = this.sendOfferNotification.bind(this);
    this.registerPushToken = this.registerPushToken.bind(this);
  }

  /**
   * Main entry point for sending notifications.
   * Handles preference checks and multi-channel dispatch.
   */
  async send(userId, { title, message, type, priority = 'medium', data = {} }) {
    try {
      const user = await User.findById(userId).select('email phone notificationPreferences pushTokens');
      if (!user) return null;

      const prefs = user.notificationPreferences || { email: true, inApp: true, push: true };
      const results = {};

      // 1. In-App Notification (Always created if enabled)
      if (prefs.inApp) {
        results.inApp = await createNotification(userId, {
          title, message, type, priority, data
        });
      }

      // 2. Email Dispatch
      if (prefs.email) {
        // results.email = await emailService.sendGenericEmail(user.email, title, message);
        console.log(`[NotificationService] Sending Email to ${user.email}: ${title}`);
      }

      // 3. Push Notification Dispatch
      if (prefs.push && user.pushTokens?.length > 0) {
        // results.push = await this._sendPush(user.pushTokens, { title, message, data });
        console.log(`[NotificationService] Sending Push to ${user.pushTokens.length} devices for user ${userId}`);
      }

      // 4. SMS Dispatch (High priority or explicit preference)
      if (prefs.sms && user.phone) {
        console.log(`[NotificationService] Sending SMS to ${user.phone}: ${title}`);
      }

      return results;
    } catch (error) {
      console.error('[NotificationService] Dispatch error:', error);
      // TODO: Implement retry queue for failed critical notifications
      return null;
    }
  }

  /**
   * Specialized method for order updates.
   */
  async sendOrderUpdate(userId, order, status) {
    const templates = {
      created: { title: 'Order Placed! 🎉', message: `Order #${order.orderNumber} is being processed.` },
      shipped: { title: 'Order Shipped! 🚚', message: `Order #${order.orderNumber} is on its way.` },
      delivered: { title: 'Order Delivered! 📦', message: `Order #${order.orderNumber} has been delivered.` },
      cancelled: { title: 'Order Cancelled ❌', message: `Order #${order.orderNumber} was cancelled.` }
    };

    const content = templates[status] || { title: 'Order Update', message: `Order #${order.orderNumber} status: ${status}` };
    return this.send(userId, {
      ...content,
      type: 'order',
      priority: 'high',
      data: { orderId: order._id, orderNumber: order.orderNumber }
    });
  }

  /**
   * Backward compatible helper for orders.
   */
  async sendOrderNotification(userId, orderId, status, orderData = {}) {
    return this.sendOrderUpdate(userId, orderData, status);
  }

  /**
   * Backward compatible helper for payments.
   */
  async sendPaymentNotification(userId, status, paymentData = {}) {
    const titles = {
      success: 'Payment Successful 💳',
      failed: 'Payment Failed ⚠️',
      refund: 'Refund Processed 💰'
    };
    return this.send(userId, {
      title: titles[status] || 'Payment Update',
      message: `Your payment for order #${paymentData.orderNumber || ''} status: ${status}`,
      type: 'payment',
      priority: 'high',
      data: { orderId: paymentData.orderId }
    });
  }

  async sendOfferNotification(userId, offerData) {
    return this.send(userId, {
      title: `🎉 ${offerData.title}`,
      message: offerData.message,
      type: 'promotion',
      data: { url: offerData.url, couponCode: offerData.couponCode }
    });
  }

  /**
   * Opt-in flow for push tokens.
   */
  async registerPushToken(userId, { token, platform, deviceId }) {
    return await User.findByIdAndUpdate(userId, {
      $addToSet: { pushTokens: { token, platform, deviceId } }
    });
  }
}

module.exports = new NotificationService();
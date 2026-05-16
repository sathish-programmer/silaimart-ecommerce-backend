const crypto = require('crypto');
const { Order, Product, User, LoyaltyTransaction } = require('../models');
const { sendOrderNotification, sendPaymentNotification } = require('../services/notificationService');
const { sendOrderConfirmation } = require('../services/emailService');
const mongoose = require('mongoose');

/**
 * Razorpay Webhook Handler
 * Securely handles background payment confirmations and refunds.
 */
exports.handleRazorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  // 1. Verify Signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (expectedSignature !== signature) {
    console.error('[Webhook] Signature verification failed');
    return res.status(400).json({ status: 'invalid signature' });
  }

  const event = req.body;
  console.log(`[Webhook] Received event: ${event.event}`);

  // 2. Process Event
  try {
    switch (event.event) {
      case 'payment.captured':
        paymentAudit('Payment Captured Event Received', { paymentId: event.payload.payment.entity.id });
        await handlePaymentCaptured(event.payload.payment.entity);
        break;
      case 'refund.processed':
        paymentAudit('Refund Processed Event Received', { refundId: event.payload.refund.entity.id });
        break;
      default:
        console.log(`[Webhook] Unhandled event type: ${event.event}`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Atomic Payment Capture Handling
 */

async function safeCommit(session) {
  if (session.inTransaction()) {
    await session.commitTransaction();
  }
}

async function safeAbort(session) {
  if (session.inTransaction()) {
    await session.abortTransaction();
  }
}

async function handlePaymentCaptured(payment) {
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
      console.warn('[Webhook] Standalone mode detected: running without transaction');
      opt = undefined;
    }
  }

  try {
    const orderId = payment.notes.orderId || payment.description?.split(' ')[1];
    const order = await Order.findOne({ 
      $or: [{ _id: orderId }, { paymentId: payment.id }, { orderNumber: orderId }] 
    }).session(opt ? opt.session : null);

    if (!order) {
      console.warn(`[Webhook] Order not found for payment: ${payment.id}`);
      if (opt && session?.inTransaction()) await session.abortTransaction();
      if (opt && session) session.endSession();
      return;
    }

    // Idempotency: Don't process if already paid
    if (order.paymentStatus === 'paid') {
      console.log(`[Webhook] Order ${order.orderNumber} already marked as paid.`);
      if (opt && session?.inTransaction()) await session.abortTransaction();
      if (opt && session) session.endSession();
      return;
    }

    // Update Order
    order.paymentStatus = 'paid';
    order.paymentId = payment.id;
    order.orderStatus = 'confirmed';
    await order.save(opt);

    if (opt && session?.inTransaction()) await session.commitTransaction();
    if (opt && session) session.endSession();
    console.log(`[Webhook] Order ${order.orderNumber} successfully updated to PAID via webhook.`);

    // Post-update actions
    const populatedOrder = await Order.findById(order._id).populate('user').populate('items.product');
    await sendOrderConfirmation(populatedOrder, populatedOrder.user);
    await sendOrderNotification(populatedOrder.user._id, order._id, 'payment_received', populatedOrder);

  } catch (error) {
    if (opt && session?.inTransaction()) await session.abortTransaction();
    if (opt && session) session.endSession();
    throw error;
  }
}


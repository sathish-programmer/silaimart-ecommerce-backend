/**
 * Loyalty Service
 * Centralized logic for points calculation, crediting, and redemption.
 */

const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const User = require('../models/User');
const Settings = require('../models/Settings');
const mongoose = require('mongoose');

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

class LoyaltyService {
  /**
   * Credit points to a user based on an order.
   * Ensures no duplicates are issued for the same order.
   */
  async creditPointsForOrder(userId, order) {
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
        console.warn('[LoyaltyService] Standalone mode detected: running without transaction');
        opt = undefined;
      }
    }

    try {
      // 1. Check for duplicate reward issuance
      const existing = await LoyaltyTransaction.findOne({ 
        user: userId, 
        orderId: order._id, 
        type: 'earned' 
      }).session(opt ? opt.session : null);

      if (existing) {
        console.log(`[LoyaltyService] Points already issued for order ${order._id}`);
        if (opt && session?.inTransaction()) await session.commitTransaction();
        if (opt && session) session.endSession();
        return existing;
      }

      // 2. Fetch loyalty settings
      const settings = await Settings.getSettings();
      if (!settings.loyalty?.enabled) {
        if (opt && session?.inTransaction()) await session.commitTransaction();
        if (opt && session) session.endSession();
        return null;
      }

      const pointsPerRupee = settings.loyalty.pointsPerRupee || 0.01;
      const pointsToEarn = Math.floor(order.total * pointsPerRupee);

      if (pointsToEarn <= 0) {
        if (opt && session?.inTransaction()) await session.commitTransaction();
        if (opt && session) session.endSession();
        return null;
      }

      // 3. Update User balance
      const user = await User.findById(userId).session(opt ? opt.session : null);
      const newBalance = (user.loyaltyPoints || 0) + pointsToEarn;
      user.loyaltyPoints = newBalance;
      await user.save(opt);

      // 4. Record Transaction
      const transaction = new LoyaltyTransaction({
        user: userId,
        type: 'earned',
        points: pointsToEarn,
        description: `Earned points for order #${order.orderNumber}`,
        orderId: order._id,
        balanceAfter: newBalance,
        metadata: {
          orderNumber: order.orderNumber,
          orderTotal: order.total
        }
      });

      await transaction.save(opt);
      if (opt && session?.inTransaction()) await session.commitTransaction();
      
      console.log(`[LoyaltyService] Credited ${pointsToEarn} points to user ${userId}`);
      return transaction;
    } catch (error) {
      if (opt && session?.inTransaction()) await session.abortTransaction();
      console.error('[LoyaltyService] Points credit failed:', error);
      throw error;
    } finally {
      if (opt && session) session.endSession();
    }
  }

  /**
   * Redeem points for a discount.
   */
  async redeemPoints(userId, pointsAmount, orderId = null) {
    // Logic for point redemption validation and deduction
    // This would be called during the checkout process
  }

  /**
   * Reverse points earned from an order (e.g., on cancellation/refund).
   */
  async reversePointsForOrder(userId, orderId) {
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
        console.warn('[LoyaltyService] Standalone mode detected: running without transaction');
        opt = undefined;
      }
    }

    try {
      // 1. Find the original 'earned' transaction
      const originalTx = await LoyaltyTransaction.findOne({ 
        user: userId, 
        orderId: orderId, 
        type: 'earned' 
      }).session(opt ? opt.session : null);

      if (!originalTx) {
        if (opt && session?.inTransaction()) await session.commitTransaction();
        if (opt && session) session.endSession();
        return null;
      }

      // 2. Check if already reversed
      const alreadyReversed = await LoyaltyTransaction.findOne({
        user: userId,
        orderId: orderId,
        type: { $in: ['refunded', 'cancelled'] }
      }).session(opt ? opt.session : null);

      if (alreadyReversed) {
        if (opt && session?.inTransaction()) await session.commitTransaction();
        if (opt && session) session.endSession();
        return alreadyReversed;
      }

      // 3. Update User balance (deduct points)
      const user = await User.findById(userId).session(opt ? opt.session : null);
      const newBalance = Math.max(0, (user.loyaltyPoints || 0) - originalTx.points);
      user.loyaltyPoints = newBalance;
      await user.save(opt);

      // 4. Record Reversal Transaction
      const reversalTx = new LoyaltyTransaction({
        user: userId,
        type: 'refunded',
        points: originalTx.points,
        description: `Reversed points for cancelled/refunded order`,
        orderId: orderId,
        balanceAfter: newBalance,
        metadata: {
          originalTransactionId: originalTx._id
        }
      });

      await reversalTx.save(opt);
      if (opt && session?.inTransaction()) await session.commitTransaction();
      
      console.log(`[LoyaltyService] Reversed ${originalTx.points} points for user ${userId}`);
      return reversalTx;
    } catch (error) {
      if (opt && session?.inTransaction()) await session.abortTransaction();
      console.error('[LoyaltyService] Points reversal failed:', error);
      throw error;
    } finally {
      if (opt && session) session.endSession();
    }
  }
}

module.exports = new LoyaltyService();


const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['earned', 'redeemed', 'expired', 'refunded'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  expiryDate: Date,
  metadata: {
    orderNumber: String,
    orderTotal: Number,
    redemptionAmount: Number
  }
}, {
  timestamps: true
});

loyaltyTransactionSchema.index({ user: 1, orderId: 1, type: 1 }, { unique: true });
loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
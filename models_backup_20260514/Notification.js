const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['order', 'payment', 'shipping', 'general', 'promotion'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['unread', 'read'],
    default: 'unread'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  data: {
    orderId: String,
    productId: String,
    amount: Number,
    url: String
  },
  icon: {
    type: String,
    default: 'bell'
  }
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
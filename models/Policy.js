const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['terms', 'return', 'cancellation', 'privacy', 'shipping'],
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Policy', policySchema);
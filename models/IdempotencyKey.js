const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  responseStatus: Number,
  responseBody: Object,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Expire keys after 24 hours
  }
});

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);

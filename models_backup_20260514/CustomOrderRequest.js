const mongoose = require('mongoose');

const customOrderRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requestDetails: {
    type: String,
    required: true,
    trim: true,
  },
  images: [
    {
      url: String,
      public_id: String,
    },
  ],
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'quoted', 'accepted', 'rejected', 'completed'],
    default: 'pending',
  },
  adminNotes: {
    type: String,
    trim: true,
  },
  quotedPrice: {
    type: Number,
  },
  estimatedDeliveryDate: {
    type: Date,
  },
  adminReplySent: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('CustomOrderRequest', customOrderRequestSchema);



const mongoose = require('mongoose');

const customizationRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sculptureType: {
    type: String,
    enum: ['Religious', 'Abstract', 'Portrait', 'Animal', 'Decorative', 'Custom Design'],
    required: true,
  },
  material: {
    type: String,
    enum: ['Marble', 'Granite', 'Sandstone', 'Bronze', 'Brass', 'Wood', 'Clay', 'Other'],
    required: true,
  },
  size: {
    type: String,
    enum: ['Small (up to 12 inches)', 'Medium (12-24 inches)', 'Large (24-48 inches)', 'Extra Large (48+ inches)', 'Custom Size'],
    required: true,
  },
  dimensions: {
    height: Number,
    width: Number,
    depth: Number,
    unit: { type: String, default: 'inches' }
  },
  color: String,
  finish: {
    type: String,
    enum: ['Polished', 'Matte', 'Textured', 'Antique', 'Natural', '']
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  budget: {
    type: String,
    enum: ['Under ₹10,000', '₹10,000 - ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', 'Above ₹1,00,000', 'Open to suggestions']
  },
  timeline: {
    type: String,
    enum: ['Rush (2-4 weeks)', 'Standard (1-2 months)', 'Extended (2-3 months)', 'No rush (3+ months)', 'Flexible']
  },
  specialRequirements: String,
  images: [
    {
      url: String,
      public_id: String,
    },
  ],
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'quoted', 'accepted', 'rejected', 'in-progress', 'completed'],
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
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('CustomizationRequest', customizationRequestSchema);
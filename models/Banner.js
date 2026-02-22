const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    required: false
  },
  subtitle: String,
  description: String,
  image: {
    url: { type: String, required: true },
    alt: String
  },
  link: {
    url: String,
    text: String,
    target: { type: String, enum: ['_self', '_blank'], default: '_self' }
  },
  position: {
    type: String,
    enum: ['hero', 'shop-top', 'category', 'footer'],
    default: 'shop-top'
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: Date,
  endDate: Date,
  backgroundColor: String,
  textColor: String,
  buttonColor: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

bannerSchema.index({ position: 1, order: 1, isActive: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });

console.log('--- Loading Banner Model ---');
if (mongoose.models.Banner) {
  console.log('--- Deleting existing Banner model ---');
  delete mongoose.models.Banner;
}

module.exports = mongoose.model('Banner', bannerSchema);
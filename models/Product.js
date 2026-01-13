const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  images: [{
    url: String,
    alt: String
  }],
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  sku: {
    type: String,
    unique: true,
    required: true
  },
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  material: String,
  // Sculpture specific fields
  sculptureDetails: {
    stone: {
      type: String,
      enum: ['Marble', 'Granite', 'Sandstone', 'Limestone', 'Basalt', 'Soapstone', 'Other']
    },
    finish: {
      type: String,
      enum: ['Polished', 'Matte', 'Antique', 'Natural', 'Carved']
    },
    deity: String, // For religious sculptures
    origin: String, // Place of origin
    artisan: String, // Artist/craftsman name
    technique: String, // Carving technique
    period: String, // Historical period
    certification: String // Authenticity certificate
  },
  sizes: [{
    name: String, // Small, Medium, Large, Custom
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    weight: Number,
    price: Number,
    stock: Number
  }],
  colors: [{
    name: String,
    code: String, // Hex color code
    image: String // Color variant image
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String],
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  seoTitle: String,
  seoDescription: String,
  // Shipping and handling
  shippingInfo: {
    fragile: { type: Boolean, default: true },
    specialHandling: String,
    estimatedDelivery: String
  }
}, {
  timestamps: true
});

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
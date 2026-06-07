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
  blogLink: {
    type: String,
    trim: true
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
  discountType: {
    type: String,
    enum: ['percentage', 'amount'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
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
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
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
  brand: String,
  // Dynamic Specifications for different categories
  specifications: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Legacy product specific fields (maintained for backward compatibility)
  productDetails: {
    stone: String,
    finish: String,
    deity: String,
    origin: String,
    artisan: String,
    technique: String,
    period: String,
    certification: String
  },
  // Enhanced variants system
  variants: [{
    sku: String,
    name: String,
    price: Number,
    stock: Number,
    attributes: {
      type: Map,
      of: String
    },
    images: [{
      url: String,
      alt: String
    }]
  }],
  // Compatibility with old sizes/colors
  sizes: [{
    name: String,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    weight: Number,
    price: Number,
    stock: Number,
    discountType: {
      type: String,
      enum: ['percentage', 'amount'],
      default: 'percentage'
    },
    discountValue: {
      type: Number,
      min: 0
    },
    discountPrice: {
      type: Number,
      min: 0
    }
  }],
  colors: [{
    name: String,
    code: String,
    image: String
  }],
  // Discovery & Marketing Flags
  isFeatured: {
    type: Boolean,
    default: false
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  isBestSeller: {
    type: Boolean,
    default: false
  },
  isNewArrival: {
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
  // Enterprise SEO Fields
  seo: {
    title: String,
    description: String,
    keywords: [String],
    canonicalUrl: String,
    ogImage: String
  },
  isCustomizable: { type: Boolean, default: false },
  shippingInfo: {
    fragile: { type: Boolean, default: true },
    specialHandling: String,
    estimatedDelivery: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to provide a unified specifications object from both new and legacy fields
productSchema.virtual('allSpecifications').get(function() {
  const specs = this.specifications instanceof Map 
    ? Object.fromEntries(this.specifications) 
    : (this.specifications || {});
    
  // Merge legacy productDetails if they exist and aren't already in specifications
  if (this.productDetails) {
    Object.entries(this.productDetails).forEach(([key, value]) => {
      if (value && !specs[key]) {
        specs[key] = value;
      }
    });
  }
  return specs;
});

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ isTrending: 1 });
productSchema.index({ isBestSeller: 1 });
productSchema.index({ isNewArrival: 1 });

module.exports = mongoose.model('Product', productSchema);
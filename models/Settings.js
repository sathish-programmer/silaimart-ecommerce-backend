const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Payment Settings
  payment: {
    razorpay: {
      enabled: { type: Boolean, default: true },
      keyId: String,
      keySecret: String
    },
    stripe: {
      enabled: { type: Boolean, default: false },
      publicKey: String,
      secretKey: String
    },
    cod: {
      enabled: { type: Boolean, default: true },
      minimumAmount: { type: Number, default: 0 },
      maximumAmount: { type: Number, default: 5000 }
    },
    qr: {
      enabled: { type: Boolean, default: false },
      upiId: { type: String, default: 'silaimart@paytm' },
      merchantName: { type: String, default: 'SilaiMart' }
    }
  },
  
  // Shipping Settings
  shipping: {
    freeShippingThreshold: { type: Number, default: 1000 },
    standardShipping: { type: Number, default: 50 },
    expressShipping: { type: Number, default: 150 },
    internationalShipping: { type: Boolean, default: false },
    estimatedDelivery: {
      standard: { type: String, default: '5-7 business days' },
      express: { type: String, default: '2-3 business days' }
    }
  },
  
  // Tax Settings
  tax: {
    enabled: { type: Boolean, default: true },
    rate: { type: Number, default: 18 }, // GST rate in percentage
    inclusive: { type: Boolean, default: false }
  },
  
  // Site Settings
  site: {
    name: { type: String, default: 'SilaiMart' },
    tagline: { type: String, default: 'Divine Art to Your Doorstep' },
    logo: String,
    favicon: String,
    contactEmail: String,
    contactPhone: String,
    address: String,
    socialMedia: {
      type: {
        facebook: String,
        instagram: String,
        twitter: String,
        youtube: String
      },
      default: {}
    }
  },
  
  // Email Settings
  email: {
    orderConfirmation: { type: Boolean, default: true },
    orderUpdates: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: true },
    smtpHost: String,
    smtpPort: Number,
    smtpUser: String,
    smtpPassword: String
  },
  
  // Inventory Settings
  inventory: {
    lowStockThreshold: { type: Number, default: 5 },
    outOfStockBehavior: { 
      type: String, 
      enum: ['hide', 'show', 'backorder'], 
      default: 'show' 
    },
    trackInventory: { type: Boolean, default: true }
  },
  
  // SEO Settings
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    googleAnalytics: String,
    facebookPixel: String
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
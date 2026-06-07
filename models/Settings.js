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
    tagline: { type: String, default: 'Your Premium Shopping Destination' },
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
    },
    store: {
      sizeGuideImage: String,
      customPincodes: [{
        pincode: String,
        deliveryDays: Number,
        codAvailable: { type: Boolean, default: true },
        freeDelivery: { type: Boolean, default: false }
      }]
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
  },

  // Loyalty Program Settings
  loyalty: {
    enabled: { type: Boolean, default: true },
    pointsPerRupee: { type: Number, default: 0.01 }, // 1 point for every 100 rupees spent
    redemptionRate: { type: Number, default: 1 }, // 1 point = 1 rupee discount
    minimumRedeemPoints: { type: Number, default: 100 }
  },

  // Dynamic Offers Settings (Flipkart style Wow Deals, Bank Offers, SuperCoins)
  offers: {
    wowDeal: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: 'WOW! DEAL Apply offers for maximum savings' },
      discountPercentage: { type: Number, default: 15 }, // e.g. 15% extra off
      minOrderValue: { type: Number, default: 500 }
    },
    superCoin: {
      enabled: { type: Boolean, default: true },
      benefitTitle: { type: String, default: 'SuperCoin Benefit' },
      pointsDiscount: { type: Number, default: 12 }, // e.g. ₹12 off using 12 coins
      coinsRequired: { type: Number, default: 12 }
    },
    bankOffers: [
      {
        id: { type: String, default: 'bank-1' },
        title: { type: String, default: 'Bank Offer' },
        description: { type: String, default: '5% Cashback on Flipkart Axis Bank Card' },
        code: { type: String, default: 'AXIS5' },
        discountPercent: { type: Number, default: 5 }
      },
      {
        id: { type: String, default: 'bank-2' },
        title: { type: String, default: 'Special Offer' },
        description: { type: String, default: '10% off on ICICI Bank Credit Cards, up to ₹100' },
        code: { type: String, default: 'ICICI10' },
        discountPercent: { type: Number, default: 10 }
      }
    ]
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
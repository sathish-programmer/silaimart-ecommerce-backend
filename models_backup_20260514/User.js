const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  phone: String,
  addresses: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      fullName: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' },
      isDefault: { type: Boolean, default: false },
    },
  ],
  isVerified: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  paymentMethods: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      type: { type: String, enum: ['card', 'upi'], required: true },
      cardNumber: String, // Last 4 digits only
      cardType: String, // Visa, MasterCard, etc.
      expiryMonth: String,
      expiryYear: String,
      holderName: String,
      upiId: String,
      isDefault: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  giftCards: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      code: { type: String, required: true },
      balance: { type: Number, required: true },
      originalAmount: { type: Number, required: true },
      expiryDate: Date,
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  sessions: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      token: { type: String, required: true },
      deviceInfo: {
        userAgent: String,
        ip: String,
        device: String,
        browser: String,
        os: String,
        location: String
      },
      isActive: { type: Boolean, default: true },
      lastActivity: { type: Date, default: Date.now },
      expiresAt: { type: Date, default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }, // 3 days
      createdAt: { type: Date, default: Date.now }
    }
  ]
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
const mongoose = require('mongoose');

const chatbotSchema = new mongoose.Schema({
  // Bot Configuration
  name: { type: String, default: 'SilaiMart Assistant' },
  avatar: { type: String, default: '/bot-avatar.png' },
  welcomeMessage: { type: String, default: 'Hello! I\'m here to help you find the perfect sculpture. How can I assist you today?' },
  isActive: { type: Boolean, default: true },
  
  // Predefined Responses
  responses: [{
    trigger: [String], // Keywords that trigger this response
    response: String,
    category: { type: String, enum: ['support', 'product', 'order', 'general'], default: 'general' },
    isActive: { type: Boolean, default: true }
  }],
  
  // Quick Actions
  quickActions: [{
    label: String,
    action: String, // 'message', 'redirect', 'product_search'
    value: String,
    icon: String,
    isActive: { type: Boolean, default: true }
  }],
  
  // Product Recommendations
  recommendations: [{
    name: String,
    criteria: {
      category: String,
      priceRange: { min: Number, max: Number },
      tags: [String]
    },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    isActive: { type: Boolean, default: true }
  }]
}, {
  timestamps: true
});

const conversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messages: [{
    sender: { type: String, enum: ['user', 'bot'], required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['text', 'product', 'action'], default: 'text' },
    data: mongoose.Schema.Types.Mixed // For product recommendations, etc.
  }],
  isActive: { type: Boolean, default: true },
  tags: [String] // For categorizing conversations
}, {
  timestamps: true
});

module.exports = {
  Chatbot: mongoose.model('Chatbot', chatbotSchema),
  Conversation: mongoose.model('Conversation', conversationSchema)
};
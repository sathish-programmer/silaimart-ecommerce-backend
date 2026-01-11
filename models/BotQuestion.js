const mongoose = require('mongoose');

const botQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'text', 'number'],
    default: 'multiple_choice'
  },
  options: [{
    text: String,
    value: String,
    nextQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotQuestion'
    },
    resultAction: {
      type: String,
      enum: ['continue', 'recommend_products', 'redirect_support']
    },
    filters: {
      category: String,
      priceRange: {
        min: Number,
        max: Number
      },
      tags: [String]
    }
  }],
  isStartQuestion: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const botFlowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  startQuestion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BotQuestion',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const BotQuestion = mongoose.model('BotQuestion', botQuestionSchema);
const BotFlow = mongoose.model('BotFlow', botFlowSchema);

module.exports = { BotQuestion, BotFlow };
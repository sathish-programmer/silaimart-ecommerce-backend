const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: String,
  featuredImage: {
    url: String,
    alt: String
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: String,
  tags: [String],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  seoTitle: String,
  seoDescription: String,
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

blogSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Blog', blogSchema);
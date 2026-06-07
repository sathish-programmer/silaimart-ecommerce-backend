const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const mongoose = require('mongoose');

// Get user's review for a product
const updateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      'rating.average': Math.round(stats[0].averageRating * 10) / 10,
      'rating.count': stats[0].totalReviews
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      'rating.average': 0,
      'rating.count': 0
    });
  }
};
exports.getUserReview = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const review = await Review.findOne({
      product: productId,
      user: req.user.id
    }).populate('user', 'name');
    
    res.json({ review });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create review (customer)
exports.createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment, images } = req.body;
    
    // Check if user has purchased this product
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
      'items.product': productId,
      orderStatus: 'delivered'
    });
    
    if (!order) {
      return res.status(400).json({ message: 'You can only review products you have purchased and received' });
    }
    
    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id
    });
    
    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.images = images || [];
      existingReview.isApproved = false; // Reset approval status
      
      await existingReview.save();
      await existingReview.populate('user', 'name');
      
      return res.status(200).json(existingReview);
    }
    
    const review = new Review({
      product: productId,
      user: req.user.id,
      order: orderId,
      rating,
      comment,
      images: images || []
    });
    
    await review.save();
    await review.populate('user', 'name');
    
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get product reviews (public)
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const reviews = await Review.find({
      product: productId,
      isApproved: true
    })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    const total = await Review.countDocuments({
      product: productId,
      isApproved: true
    });
    
    // Calculate average rating
    const stats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratings: {
            $push: '$rating'
          }
        }
      }
    ]);
    
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = 0;
    }
    
    if (stats.length > 0) {
      stats[0].ratings.forEach(rating => {
        ratingDistribution[rating]++;
      });
    }
    
    res.json({
      reviews,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      },
      stats: stats.length > 0 ? {
        averageRating: Math.round(stats[0].averageRating * 10) / 10,
        totalReviews: stats[0].totalReviews,
        ratingDistribution
      } : {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all reviews (admin)
exports.getAllReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // 'pending', 'approved'
    
    let filter = {};
    if (status === 'pending') filter.isApproved = false;
    if (status === 'approved') filter.isApproved = true;
    
    const reviews = await Review.find(filter)
      .populate('user', 'name email')
      .populate('product', 'name images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Review.countDocuments(filter);
    
    res.json({
      reviews,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve/reject review (admin)
exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved, adminResponse, rating, comment } = req.body;
    
    const updateData = { isApproved };
    if (adminResponse !== undefined) updateData.adminResponse = adminResponse;
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;
    
    const review = await Review.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('user', 'name email').populate('product', 'name');
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    await updateProductRating(review.product._id);
    
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete review (admin)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    await updateProductRating(review.product);
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
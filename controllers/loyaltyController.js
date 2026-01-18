const { LoyaltyTransaction, User, Settings } = require('../models');
const mongoose = require('mongoose');

// Get user's loyalty points history
exports.getLoyaltyHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const transactions = await LoyaltyTransaction.find({ user: new mongoose.Types.ObjectId(req.user.userId) })
      .populate('orderId', 'orderNumber total')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LoyaltyTransaction.countDocuments({ user: new mongoose.Types.ObjectId(req.user.userId) });
    
    // Get current balance
    const user = await User.findById(req.user.userId).select('loyaltyPoints');
    
    res.json({
      success: true,
      transactions,
      currentBalance: user.loyaltyPoints || 0,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get loyalty program settings
exports.getLoyaltySettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    res.json({
      success: true,
      settings: {
        enabled: settings.loyalty?.enabled || false,
        pointsPerRupee: settings.loyalty?.pointsPerRupee || 0.01,
        redemptionRate: settings.loyalty?.redemptionRate || 1,
        minimumRedeemPoints: settings.loyalty?.minimumRedeemPoints || 100
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get loyalty statistics for user
exports.getLoyaltyStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get current balance
    const user = await User.findById(userId).select('loyaltyPoints');
    
    // Get total earned points
    const earnedStats = await LoyaltyTransaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: 'earned' } },
      { $group: { _id: null, totalEarned: { $sum: '$points' } } }
    ]);
    
    // Get total redeemed points
    const redeemedStats = await LoyaltyTransaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), type: 'redeemed' } },
      { $group: { _id: null, totalRedeemed: { $sum: '$points' } } }
    ]);
    
    // Get recent transactions
    const recentTransactions = await LoyaltyTransaction.find({ user: userId })
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      success: true,
      stats: {
        currentBalance: user.loyaltyPoints || 0,
        totalEarned: earnedStats[0]?.totalEarned || 0,
        totalRedeemed: redeemedStats[0]?.totalRedeemed || 0,
        recentTransactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const { User } = require('../models');
const { sendOfferNotification } = require('../services/notificationService');

// Send offer notification to all users
exports.sendToAllUsers = async (req, res) => {
  try {
    const { title, message, url, couponCode } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Get all active users
    const users = await User.find({ isActive: true }).select('_id');
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active users found'
      });
    }

    // Send notifications to all users
    const notificationPromises = users.map(user => 
      sendOfferNotification(user._id, {
        title,
        message,
        url: url || '/shop',
        couponCode
      })
    );

    await Promise.all(notificationPromises);

    res.json({
      success: true,
      message: `Offer notification sent to ${users.length} users successfully`
    });
  } catch (error) {
    console.error('Error sending offer to all users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send offer notification'
    });
  }
};

// Send offer notification to specific user
exports.sendToUser = async (req, res) => {
  try {
    const { userId, title, message, url, couponCode } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'User ID, title and message are required'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Send notification to specific user
    await sendOfferNotification(userId, {
      title,
      message,
      url: url || '/shop',
      couponCode
    });

    res.json({
      success: true,
      message: `Offer notification sent to ${user.name} successfully`
    });
  } catch (error) {
    console.error('Error sending offer to user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send offer notification'
    });
  }
};
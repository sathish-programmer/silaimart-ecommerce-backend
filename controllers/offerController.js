const { User } = require('../models');
const { sendOfferNotification } = require('../services/emailService');

// Send offer to all users
const sendOfferToAllUsers = async (req, res) => {
  try {
    const { title, description, discountPercentage, couponCode, validUntil } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and description are required' 
      });
    }

    const offer = {
      title,
      description,
      discountPercentage,
      couponCode,
      validUntil: validUntil ? new Date(validUntil) : null
    };

    // Get all users with role 'user'
    const users = await User.find({ role: 'user' }).select('name email');
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No users found' 
      });
    }

    // Send emails to all users (in batches to avoid overwhelming the email service)
    const batchSize = 10;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (user) => {
        try {
          await sendOfferNotification(user, offer);
          return { success: true, email: user.email };
        } catch (error) {
          console.error(`Failed to send offer email to ${user.email}:`, error);
          return { success: false, email: user.email, error: error.message };
        }
      });

      const results = await Promise.all(emailPromises);
      
      results.forEach(result => {
        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      });

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.json({
      success: true,
      message: `Offer emails sent successfully`,
      stats: {
        totalUsers: users.length,
        sentCount,
        failedCount
      }
    });

  } catch (error) {
    console.error('Error sending offer emails:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Send offer to specific users
const sendOfferToSpecificUsers = async (req, res) => {
  try {
    const { title, description, discountPercentage, couponCode, validUntil, userEmails } = req.body;
    
    if (!title || !description || !userEmails || !Array.isArray(userEmails)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, description, and userEmails array are required' 
      });
    }

    const offer = {
      title,
      description,
      discountPercentage,
      couponCode,
      validUntil: validUntil ? new Date(validUntil) : null
    };

    // Get users by email
    const users = await User.find({ 
      email: { $in: userEmails },
      role: 'user' 
    }).select('name email');
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No valid users found with provided emails' 
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    const emailPromises = users.map(async (user) => {
      try {
        await sendOfferNotification(user, offer);
        return { success: true, email: user.email };
      } catch (error) {
        console.error(`Failed to send offer email to ${user.email}:`, error);
        return { success: false, email: user.email, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    
    results.forEach(result => {
      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    });

    res.json({
      success: true,
      message: `Offer emails sent to specific users`,
      stats: {
        requestedEmails: userEmails.length,
        validUsers: users.length,
        sentCount,
        failedCount
      }
    });

  } catch (error) {
    console.error('Error sending offer emails:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

module.exports = {
  sendOfferToAllUsers,
  sendOfferToSpecificUsers
};
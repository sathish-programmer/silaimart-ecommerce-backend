const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const CustomOrderRequest = require('../models/CustomOrderRequest');
const crypto = require('crypto');
const { sendEmail, sendLoyaltyPointsNotification, sendNewDeviceLoginAlert } = require('../services/emailService');
const { Settings } = require('../models');

const generateToken = (userId, sessionId) => {
  return jwt.sign({ userId, sessionId }, process.env.JWT_SECRET, { expiresIn: '3d' });
};

const getDeviceInfo = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  
  // Simple device detection (you can use a library like 'device' for better detection)
  let device = 'Unknown Device';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  
  if (userAgent.includes('Mobile')) device = 'Mobile';
  else if (userAgent.includes('Tablet')) device = 'Tablet';
  else device = 'Desktop';
  
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
  
  return { userAgent, ip, device, browser, os };
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({ name, email, password, phone, role: role || 'user' });
    await user.save();

    const token = generateToken(user._id);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const deviceInfo = getDeviceInfo(req);
    
    // Check if this is a new device
    const existingSession = user.sessions.find(session => 
      session.isActive && 
      session.deviceInfo.userAgent === deviceInfo.userAgent &&
      session.deviceInfo.ip === deviceInfo.ip
    );
    
    // If new device, send alert email
    if (!existingSession) {
      try {
        await sendNewDeviceLoginAlert(user, {
          ...deviceInfo,
          location: 'Unknown Location' // You can integrate with IP geolocation service
        });
      } catch (emailError) {
        console.error('Failed to send new device alert:', emailError);
      }
    }
    
    // Create new session
    const sessionId = new mongoose.Types.ObjectId();
    const token = generateToken(user._id, sessionId);
    
    user.sessions.push({
      _id: sessionId,
      token,
      deviceInfo,
      isActive: true,
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    });
    
    // Clean up expired sessions
    user.sessions = user.sessions.filter(session => 
      session.expiresAt > new Date() || session._id.equals(sessionId)
    );
    
    await user.save();
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;

    await user.save();
    
    res.json({ message: 'Profile updated successfully', user: user.toObject({ getters: true }) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const { fullName, street, city, state, pincode, country, isDefault } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (isDefault) {
      user.addresses.forEach(addr => (addr.isDefault = false));
    }

    user.addresses.push({
      fullName,
      street,
      city,
      state,
      pincode,
      country,
      isDefault: user.addresses.length === 0 ? true : isDefault,
    });

    await user.save();
    res.status(201).json({ message: 'Address added successfully', addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, street, city, state, pincode, country, isDefault } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === id);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }

    if (isDefault) {
      user.addresses.forEach(addr => (addr.isDefault = false));
    }

    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex].toObject(),
      fullName: fullName || user.addresses[addressIndex].fullName,
      street: street || user.addresses[addressIndex].street,
      city: city || user.addresses[addressIndex].city,
      state: state || user.addresses[addressIndex].state,
      pincode: pincode || user.addresses[addressIndex].pincode,
      country: country || user.addresses[addressIndex].country,
      isDefault: isDefault !== undefined ? isDefault : user.addresses[addressIndex].isDefault,
    };
    // If no other address is default and this one is being updated, ensure one is default
    if (user.addresses.filter(addr => addr.isDefault).length === 0) {
      user.addresses[addressIndex].isDefault = true;
    }

    await user.save();
    res.json({ message: 'Address updated successfully', addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const initialLength = user.addresses.length;
    user.addresses = user.addresses.filter(addr => addr._id.toString() !== id);

    if (user.addresses.length === initialLength) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If the deleted address was the default and there are other addresses, set the first one as default
    if (user.addresses.length > 0 && user.addresses.filter(addr => addr.isDefault).length === 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    res.json({ message: 'Address deleted successfully', addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;
    let userFilter = {};

    if (req.user.role === 'admin') {
      const adminProducts = await Product.find({ createdBy: req.user.userId }).select('_id');
      const productIds = adminProducts.map(p => p._id);

      const orders = await Order.find({ 'items.product': { $in: productIds } }).select('user');
      const userIds = orders.map(order => order.user);

      userFilter = { _id: { $in: userIds }, role: 'user' };
    } else if (req.user.role === 'superadmin') {
      userFilter = { role: 'user' };
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      userFilter.$or = [
        { name: { $regex: searchRegex } },
        { email: { $regex: searchRegex } }
      ];
    }

    const users = await User.find(userFilter)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .limit(limit * 1)
      .skip(skip);

    const total = await User.countDocuments(userFilter);

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    let userFilter = { _id: id };

    if (req.user.role === 'admin') {
      const adminProducts = await Product.find({ createdBy: req.user.userId }).select('_id');
      const productIds = adminProducts.map(p => p._id);

      const orders = await Order.find({ 'items.product': { $in: productIds } }).select('user');
      const userIds = orders.map(order => order.user);

      if (!userIds.some(userId => userId.equals(id))) {
        return res.status(403).json({ message: 'Access denied to this user' });
      }
    } else if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(userFilter._id).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User with that email does not exist' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password.
Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message
      });

      res.status(200).json({
        success: true,
        message: 'Token sent to email!'
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.status(500).json({ message: 'There was an error sending the email. Try again later.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token is invalid or has expired' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting self or other superadmins accidentally
    if (req.user.id === req.params.id || user.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete this user' });
    }

    await user.deleteOne();

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.user.id === req.params.id || user.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot block this user' });
    }

    user.isBlocked = true;
    await user.save();

    res.status(200).json({ message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = false;
    await user.save();

    res.status(200).json({ message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.redeemLoyaltyPoints = async (req, res) => {
  try {
    const { pointsToRedeem } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userPoints = Number(user.loyaltyPoints) || 0;
    const redeemPoints = Number(pointsToRedeem) || 0;

    if (userPoints < redeemPoints) {
      return res.status(400).json({ 
        message: 'Insufficient loyalty points',
        availablePoints: userPoints,
        requestedPoints: redeemPoints
      });
    }

    const settings = await Settings.getSettings();
    const redemptionRate = settings.loyalty?.redemptionRate || 1;
    const minimumRedeemPoints = settings.loyalty?.minimumRedeemPoints || 100;

    if (redeemPoints < minimumRedeemPoints) {
      return res.status(400).json({ message: `Minimum ${minimumRedeemPoints} points required for redemption` });
    }

    const discountAmount = redeemPoints * redemptionRate;

    user.loyaltyPoints = userPoints - redeemPoints;
    await user.save();

    await sendLoyaltyPointsNotification(user, redeemPoints, 'redeemed');

    res.status(200).json({
      success: true,
      message: 'Loyalty points redeemed successfully',
      discountAmount,
      newLoyaltyPoints: user.loyaltyPoints,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const { logoutAll = false } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (logoutAll) {
      // Logout from all devices
      user.sessions = user.sessions.map(session => ({
        ...session,
        isActive: false
      }));
    } else {
      // Logout from current device only
      const sessionIndex = user.sessions.findIndex(session => 
        session._id.equals(req.user.sessionId)
      );
      if (sessionIndex !== -1) {
        user.sessions[sessionIndex].isActive = false;
      }
    }
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: logoutAll ? 'Logged out from all devices' : 'Logged out successfully' 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('sessions');
    
    const activeSessions = user.sessions
      .filter(session => session.isActive && session.expiresAt > new Date())
      .map(session => ({
        id: session._id,
        device: session.deviceInfo.device,
        browser: session.deviceInfo.browser,
        os: session.deviceInfo.os,
        ip: session.deviceInfo.ip,
        lastActivity: session.lastActivity,
        isCurrent: session._id.equals(req.user.sessionId)
      }));
    
    res.json({ 
      success: true, 
      sessions: activeSessions 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.user.userId);
    
    const sessionIndex = user.sessions.findIndex(session => 
      session._id.toString() === sessionId
    );
    
    if (sessionIndex === -1) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    user.sessions[sessionIndex].isActive = false;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Session terminated successfully' 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's orders, custom requests, etc.
    await Order.deleteMany({ user: req.user.userId });
    await CustomOrderRequest.deleteMany({ user: req.user.userId });
    
    // Delete the user account
    await User.findByIdAndDelete(req.user.userId);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitCustomOrderRequest = async (req, res) => {
  try {
    const { requestDetails, images } = req.body;

    if (!requestDetails) {
      return res.status(400).json({ message: 'Request details are required' });
    }

    const customOrderRequest = new CustomOrderRequest({
      user: req.user.userId,
      requestDetails,
      images: images || [],
      status: 'pending'
    });

    await customOrderRequest.save();

    res.status(201).json({
      success: true,
      message: 'Custom order request submitted successfully',
      request: customOrderRequest
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCustomOrderRequests = async (req, res) => {
  try {
    const requests = await CustomOrderRequest.find({ user: req.user.userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
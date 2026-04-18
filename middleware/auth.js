const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If not in header, check query parameter (for direct downloads/window.open)
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    // Check if session is valid
    if (decoded.sessionId) {
      const session = user.sessions.find(s => 
        s._id.equals(decoded.sessionId) && 
        s.isActive && 
        s.expiresAt > new Date()
      );
      
      if (!session) {
        return res.status(401).json({ message: 'Session expired or invalid' });
      }
      
      // Update last activity
      session.lastActivity = new Date();
      await user.save();
      
      req.user = { 
        userId: decoded.userId, 
        sessionId: decoded.sessionId,
        role: user.role, 
        id: decoded.userId 
      };
    } else {
      // Legacy token without session
      req.user = { userId: decoded.userId, role: user.role, id: decoded.userId };
    }
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');

    // If not in header, check query parameter
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.user = { userId: decoded.userId, role: user.role, id: decoded.userId };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const superAdminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    if (user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Superadmin access required' });
    }
    
    req.user = { userId: decoded.userId, role: user.role, id: decoded.userId };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = {
  protect: auth,
  admin: adminAuth,
  auth: auth,
  adminAuth: adminAuth,
  superAdmin: superAdminAuth
};
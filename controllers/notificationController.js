const Notification = require('../models/Notification');

// Get user notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { user: req.user.userId };
    
    if (status) filter.status = status;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      user: req.user.userId, 
      status: 'unread' 
    });

    res.json({
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total
      },
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { status: 'read' },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, status: 'unread' },
      { status: 'read' }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create notification (internal use)
exports.createNotification = async (userId, notificationData) => {
  try {
    const notification = new Notification({
      user: userId,
      ...notificationData
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Get unread count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user.userId,
      status: 'unread'
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
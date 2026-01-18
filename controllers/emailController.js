const { sendEmail } = require('../services/emailService');
const User = require('../models/User');

exports.sendCustomEmail = async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ message: 'Please provide recipient, subject, and message' });
    }

    await sendEmail({ email: to, subject, message });
    res.status(200).json({ message: 'Custom email sent successfully' });
  } catch (error) {
    console.error('Error sending custom email:', error);
    res.status(500).json({ message: 'Failed to send custom email' });
  }
};

exports.sendBulkEmail = async (req, res) => {
  try {
    const { recipientType, subject, message } = req.body;

    if (!recipientType || !subject || !message) {
      return res.status(400).json({ message: 'Please provide recipient type, subject, and message' });
    }

    let users;
    if (recipientType === 'all_users') {
      users = await User.find({ role: 'user' });
    } else if (recipientType === 'all_admins') {
      users = await User.find({ role: 'admin' });
    } else if (recipientType === 'all') {
      users = await User.find({});
    } else {
      return res.status(400).json({ message: 'Invalid recipient type' });
    }

    const emailPromises = users.map(user =>
      sendEmail({ email: user.email, subject, message })
    );

    await Promise.all(emailPromises);

    res.status(200).json({ message: `Bulk email sent to ${users.length} users successfully` });
  } catch (error) {
    console.error('Error sending bulk email:', error);
    res.status(500).json({ message: 'Failed to send bulk email' });
  }
};

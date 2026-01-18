const express = require('express');
const { register, login, logout, getProfile, updateProfile, getAllUsers, getUserById, forgotPassword, resetPassword, redeemLoyaltyPoints, addAddress, updateAddress, deleteAddress, deleteAccount, getSessions, terminateSession, submitCustomOrderRequest, getCustomOrderRequests } = require('../controllers/authController');
const { auth, admin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Register
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], handleValidation, register);

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required')
], handleValidation, login);

// Get profile
router.get('/profile', auth, getProfile);

// Update profile
router.put('/profile', auth, updateProfile);

// Get all users (for admin dashboard)
router.get('/users', auth, admin, getAllUsers);

// Get user by ID (for admin dashboard)
router.get('/users/:id', auth, admin, getUserById);

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please provide a valid email'),
], handleValidation, forgotPassword);

// Reset password
router.post('/reset-password/:token', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  })
], handleValidation, resetPassword);

// Loyalty points redemption
router.post('/redeem-points', auth, redeemLoyaltyPoints);

// Address management
router.post('/address', auth, addAddress);
router.put('/address/:id', auth, updateAddress);
router.delete('/address/:id', auth, deleteAddress);

// Custom Order Requests (User side)
router.post('/custom-order-requests', auth, submitCustomOrderRequest);
router.get('/custom-order-requests', auth, getCustomOrderRequests);

// Delete account
router.delete('/delete-account', auth, deleteAccount);

// Session management
router.post('/logout', auth, logout);
router.get('/sessions', auth, getSessions);
router.delete('/sessions/:sessionId', auth, terminateSession);

module.exports = router;
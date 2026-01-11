const express = require('express');
const { register, login, getProfile, updateProfile, getAllUsers } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
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
router.get('/users', getAllUsers);

module.exports = router;
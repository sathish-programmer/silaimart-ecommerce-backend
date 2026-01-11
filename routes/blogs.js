const express = require('express');
const { 
  getBlogs, 
  getBlog, 
  createBlog, 
  updateBlog, 
  deleteBlog 
} = require('../controllers/blogController');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getBlogs);
router.get('/:slug', getBlog);

// Admin routes
router.post('/', adminAuth, createBlog);
router.put('/:id', adminAuth, updateBlog);
router.delete('/:id', adminAuth, deleteBlog);

module.exports = router;
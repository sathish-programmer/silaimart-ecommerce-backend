const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');

// Import controllers
const { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} = require('../controllers/productController');

const { 
  getAllOrders, 
  updateOrderStatus, 
  getOrderById 
} = require('../controllers/orderController');

const { 
  createCategory, 
  updateCategory, 
  deleteCategory 
} = require('../controllers/categoryController');

const { 
  getAllBlogs, 
  createBlog, 
  updateBlog, 
  deleteBlog 
} = require('../controllers/blogController');

const { 
  getAllCoupons, 
  createCoupon, 
  updateCoupon, 
  deleteCoupon 
} = require('../controllers/couponController');

const { getAllReviews } = require('../controllers/reviewController');
const { sendOfferToAllUsers, sendOfferToSpecificUsers } = require('../controllers/offerController');

// Dashboard stats
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const Product = require('../models/Product');
    const Order = require('../models/Order');
    const User = require('../models/User');
    
    console.log('Dashboard stats request - User role:', req.user.role, 'User ID:', req.user.userId);
    
    let productFilter = {};
    let orderFilter = {};
    
    // Role-based filtering
    if (req.user.role === 'admin') {
      console.log('Applying admin filters');
      productFilter.createdBy = req.user.userId;
      // Get orders for admin's products only
      const adminProducts = await Product.find({ createdBy: req.user.userId }).select('_id');
      console.log('Admin products found:', adminProducts.length);
      const productIds = adminProducts.map(p => p._id);
      if (productIds.length > 0) {
        orderFilter['items.product'] = { $in: productIds };
      } else {
        orderFilter._id = { $exists: false }; // No orders if no products
      }
    } else {
      console.log('Superadmin - no filters applied');
    }
    
    const [totalProducts, totalOrders, totalUsers, totalRevenue] = await Promise.all([
      Product.countDocuments(productFilter),
      Order.countDocuments(orderFilter),
      req.user.role === 'superadmin' ? User.countDocuments({ role: 'user' }) : 0,
      Order.aggregate([
        { $match: { ...orderFilter, orderStatus: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);
    
    console.log('Stats:', { totalProducts, totalOrders, totalUsers });
    
    const recentOrders = await Order.find(orderFilter)
      .populate('user', 'name email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log('Recent orders found:', recentOrders.length);
    
    res.json({
      success: true,
      stats: {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Product routes
router.get('/products', protect, admin, getAllProducts);
router.post('/products', protect, admin, createProduct);
router.put('/products/:id', protect, admin, updateProduct);
router.delete('/products/:id', protect, admin, deleteProduct);

// Order routes
router.get('/orders', protect, admin, getAllOrders);
router.get('/orders/:id', protect, admin, getOrderById);
router.put('/orders/:id/status', protect, admin, updateOrderStatus);

// Category routes
router.post('/categories', protect, admin, createCategory);
router.put('/categories/:id', protect, admin, updateCategory);
router.delete('/categories/:id', protect, admin, deleteCategory);

// Blog routes
router.get('/blogs', protect, admin, getAllBlogs);
router.post('/blogs', protect, admin, createBlog);
router.put('/blogs/:id', protect, admin, updateBlog);
router.delete('/blogs/:id', protect, admin, deleteBlog);

// Coupon routes
router.get('/coupons', protect, admin, getAllCoupons);
router.post('/coupons', protect, admin, createCoupon);
router.put('/coupons/:id', protect, admin, updateCoupon);
router.delete('/coupons/:id', protect, admin, deleteCoupon);

// Review routes
router.get('/reviews', protect, admin, getAllReviews);

// Offer email routes
router.post('/offers/send-all', protect, admin, sendOfferToAllUsers);
router.post('/offers/send-specific', protect, admin, sendOfferToSpecificUsers);

module.exports = router;
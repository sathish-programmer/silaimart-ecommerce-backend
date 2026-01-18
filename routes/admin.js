const express = require('express');
const router = express.Router();
const { protect, admin, superAdmin } = require('../middleware/auth');

// Import controllers
const { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} = require('../controllers/productController');

const {
  getAllOrders,
  getAdminOrders,
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
  getMyBlogs,
  createBlog, 
  updateBlog, 
  deleteBlog 
} = require('../controllers/blogController');

const { 
  getAllCoupons, 
  getMyCoupons,
  createCoupon, 
  updateCoupon, 
  deleteCoupon 
} = require('../controllers/couponController');

const { 
  getAllReviews 
} = require('../controllers/reviewController');

const {
  deleteUser,
  blockUser,
  unblockUser
} = require('../controllers/authController');
const { sendOfferToAllUsers, sendOfferToSpecificUsers } = require('../controllers/offerController');
const { sendCustomEmail, sendBulkEmail } = require('../controllers/emailController');
const { getSettings, updateSettings, updateSettingSection, resetSettings, getPublicSettings } = require('../controllers/settingsController');
const { getPolicies, getPolicyByType, getAllPolicies, upsertPolicy, deletePolicy } = require('../controllers/policyController');
const { getAllCustomOrderRequests, getCustomOrderRequestById, updateCustomOrderRequest } = require('../controllers/customOrderController');

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
router.delete('/products/:id', protect, superAdmin, deleteProduct);

// Order routes
router.get('/orders', protect, admin, getAllOrders);
router.get('/orders/my-products', protect, admin, getAdminOrders);
router.get('/orders/:id', protect, admin, getOrderById);
router.put('/orders/:id/status', protect, admin, updateOrderStatus);

// Category routes
router.post('/categories', protect, admin, createCategory);
router.put('/categories/:id', protect, admin, updateCategory);
router.delete('/categories/:id', protect, superAdmin, deleteCategory);

// Blog routes
router.get('/blogs', protect, admin, getAllBlogs);
router.get('/blogs/my-blogs', protect, admin, getMyBlogs);
router.post('/blogs', protect, admin, createBlog);
router.put('/blogs/:id', protect, admin, updateBlog);
router.delete('/blogs/:id', protect, superAdmin, deleteBlog);

// Coupon routes
router.get('/coupons', protect, admin, getAllCoupons);
router.get('/coupons/my-coupons', protect, admin, getMyCoupons);
router.post('/coupons', protect, admin, createCoupon);
router.put('/coupons/:id', protect, admin, updateCoupon);
router.delete('/coupons/:id', protect, superAdmin, deleteCoupon);

// Review routes
router.get('/reviews', protect, admin, getAllReviews);

// Offer email routes
router.post('/offers/send-all', protect, superAdmin, sendOfferToAllUsers);
router.post('/offers/send-specific', protect, admin, sendOfferToSpecificUsers);

// Email Management routes
router.post('/emails/send-custom', protect, superAdmin, sendCustomEmail);
router.post('/emails/send-bulk', protect, superAdmin, sendBulkEmail);

// User Management routes (Superadmin only)
router.delete('/users/:id', protect, superAdmin, deleteUser);
router.put('/users/:id/block', protect, superAdmin, blockUser);
router.put('/users/:id/unblock', protect, superAdmin, unblockUser);

// Settings routes (Superadmin only for update/reset)
router.get('/settings', protect, admin, getSettings);
router.put('/settings', protect, superAdmin, updateSettings);
router.put('/settings/:section', protect, superAdmin, updateSettingSection);
router.post('/settings/reset', protect, superAdmin, resetSettings);

// Policy routes (Superadmin only for upsert/delete)
router.get('/policies', protect, admin, getAllPolicies); // Admin can view all policies
router.post('/policies', protect, superAdmin, upsertPolicy);
router.put('/policies/:type', protect, superAdmin, upsertPolicy);
router.delete('/policies/:type', protect, superAdmin, deletePolicy);

// Custom Order Request routes (Admin side)
router.get('/custom-order-requests', protect, admin, getAllCustomOrderRequests);
router.get('/custom-order-requests/:id', protect, admin, getCustomOrderRequestById);
router.put('/custom-order-requests/:id', protect, admin, updateCustomOrderRequest);

module.exports = router;
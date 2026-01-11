const express = require('express');
const {
  getPolicies,
  getPolicyByType,
  getAllPolicies,
  upsertPolicy,
  deletePolicy
} = require('../controllers/policyController');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getPolicies);
router.get('/:type', getPolicyByType);

// Admin routes
router.get('/admin/all', adminAuth, getAllPolicies);
router.put('/admin/:type', adminAuth, upsertPolicy);
router.delete('/admin/:type', adminAuth, deletePolicy);

module.exports = router;
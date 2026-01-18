const express = require('express');
const { getMasterValues, updateMasterValues, addMasterValue, deleteMasterValue } = require('../controllers/masterValuesController');
const { auth, superAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getMasterValues);
router.get('/:category', getMasterValues);

// Admin routes
router.put('/:category', auth, superAdmin, updateMasterValues);
router.post('/:category', auth, superAdmin, addMasterValue);
router.delete('/:category/:valueId', auth, superAdmin, deleteMasterValue);

module.exports = router;
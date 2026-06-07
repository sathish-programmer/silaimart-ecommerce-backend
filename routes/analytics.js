const express = require('express');
const router = express.Router();
const { logBatch } = require('../controllers/analyticsController');

// Batch logging endpoint (Rate limited in production)
router.post('/batch', logBatch);

module.exports = router;

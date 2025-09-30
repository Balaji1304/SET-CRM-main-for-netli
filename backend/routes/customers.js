const express = require('express');
const router = express.Router();
const { exportCustomers } = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/export', protect, authorize('admin'), exportCustomers);

module.exports = router;

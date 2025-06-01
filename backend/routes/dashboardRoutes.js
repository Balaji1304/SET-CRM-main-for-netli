const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth'); // Assuming you have auth middleware
const { checkRolePermission } = require('../middleware/roleAuth'); // Assuming roleAuth for fine-grained access if needed beyond basic auth

// @route   GET /api/dashboard/summary
// @desc    Get dashboard summary data for the logged-in user
// @access  Private (all authenticated roles can access their specific summary)
router.get('/summary', protect, getDashboardSummary);

module.exports = router; 
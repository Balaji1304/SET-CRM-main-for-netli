const express = require('express');
const {
  getServiceDashboard,
  generateInstallationPerformanceReport,
  generateTaskEfficiencyReport,
  getMyServiceReports,
  getServiceReport,
  deleteServiceReport
} = require('../controllers/serviceReportsController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/reports/service/dashboard
// @desc    Get service dashboard summary
// @access  Private (Service Engineer, Product Head)
router.get('/dashboard', getServiceDashboard);

// @route   POST /api/reports/service/installation-performance
// @desc    Generate installation performance report
// @access  Private (Service Engineer, Product Head)
router.post('/installation-performance', generateInstallationPerformanceReport);

// @route   POST /api/reports/service/task-efficiency
// @desc    Generate task efficiency report
// @access  Private (Service Engineer, Product Head)
router.post('/task-efficiency', generateTaskEfficiencyReport);

// @route   GET /api/reports/service/my-reports
// @desc    Get service engineer's reports
// @access  Private (Service Engineer, Product Head)
router.get('/my-reports', getMyServiceReports);

// @route   GET /api/reports/service/:reportId
// @desc    Get specific service report
// @access  Private (Service Engineer, Product Head)
router.get('/:reportId', getServiceReport);

// @route   DELETE /api/reports/service/:reportId
// @desc    Delete service report
// @access  Private (Service Engineer, Product Head)
router.delete('/:reportId', deleteServiceReport);

module.exports = router;


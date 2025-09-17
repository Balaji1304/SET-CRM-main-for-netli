const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { checkRolePermission } = require('../middleware/roleAuth');

// Import controller methods
const {
  generateSalesPerformanceReport,
  getMyReports,
  getReportDetails,
  exportReportToPDF,
  exportReportToExcel,
  generateLeadAnalysisReport,
  deleteReport,
  getSalesDashboard
} = require('../controllers/salesReportsController');

/**
 * Sales Reports Routes
 * All routes require authentication and appropriate role permissions
 */

// @route   GET /api/reports/sales/dashboard
// @desc    Get sales dashboard summary with quick metrics
// @access  Private (sales_person, sales_head, marketing_coordinator)
router.get('/dashboard', 
  protect, 
  authorize('sales_person', 'sales_head', 'marketing_coordinator', 'admin'),
  checkRolePermission,
  getSalesDashboard
);

// @route   POST /api/reports/sales/performance
// @desc    Generate comprehensive sales performance report
// @access  Private (sales_person, sales_head, marketing_coordinator)
router.post('/performance', 
  protect, 
  authorize('sales_person', 'sales_head', 'marketing_coordinator', 'admin'),
  checkRolePermission,
  generateSalesPerformanceReport
);

// @route   POST /api/reports/sales/leads
// @desc    Generate lead analysis report
// @access  Private (sales_person, sales_head, marketing_coordinator)
router.post('/leads', 
  protect, 
  authorize('sales_person', 'sales_head', 'marketing_coordinator', 'admin'),
  checkRolePermission,
  generateLeadAnalysisReport
);

// @route   GET /api/reports/sales/my-reports
// @desc    Get list of user's reports with pagination and filters
// @access  Private (sales_person, sales_head, marketing_coordinator)
router.get('/my-reports', 
  protect, 
  authorize('sales_person', 'sales_head', 'marketing_coordinator', 'admin'),
  checkRolePermission,
  getMyReports
);

// @route   GET /api/reports/sales/:reportId
// @desc    Get specific report details
// @access  Private (sales_person, sales_head, marketing_coordinator)
router.get('/:reportId', 
  protect, 
  authorize('sales_person', 'sales_head', 'marketing_coordinator', 'admin'),
  checkRolePermission,
  getReportDetails
);

// @route   GET /api/reports/sales/:reportId/export/pdf
// @desc    Export report to PDF format
// @access  Private (sales_person, sales_head, marketing_coordinator)
router.get('/:reportId/export/pdf', 
  protect, 
  authorize('sales_person', 'sales_head', 'marketing_coordinator', 'admin'),
  checkRolePermission,
  exportReportToPDF
);

// @route   GET /api/reports/sales/:reportId/export/excel
// @desc    Export report to Excel format
// @access  Private (sales_person, sales_head, marketing_coordinator)
router.get('/:reportId/export/excel', 
  protect, 
  authorize('sales_person', 'sales_head', 'marketing_coordinator', 'admin'),
  checkRolePermission,
  exportReportToExcel
);

// @route   DELETE /api/reports/sales/:reportId
// @desc    Delete a report (only by creator)
// @access  Private (sales_person, sales_head, marketing_coordinator)
router.delete('/:reportId', 
  protect, 
  authorize('sales_person', 'sales_head', 'marketing_coordinator', 'admin'),
  checkRolePermission,
  deleteReport
);

module.exports = router;


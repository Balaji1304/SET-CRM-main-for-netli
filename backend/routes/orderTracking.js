const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createTrackingRecord,
  getCustomerTracking,
  getInternalTracking,
  updateTrackingStatus,
  updateShippingDetails,
  updateInstallationDetails,
  addCustomerNote,
  getMyOrderTracking,
  updateEstimatedDates
} = require('../controllers/orderTrackingController');

// Customer routes
router.get('/my-orders', protect, authorize(['customer']), getMyOrderTracking);
router.get('/customer/:purchaseId', protect, authorize(['customer']), getCustomerTracking);
router.post('/:purchaseId/notes', protect, authorize(['customer', 'product_head', 'service_engineer', 'sales_head', 'marketing_coordinator']), addCustomerNote);

// Staff routes
router.post('/create', protect, authorize(['product_head', 'sales_head', 'marketing_coordinator']), createTrackingRecord);
router.get('/internal/:purchaseId', protect, authorize(['product_head', 'service_engineer', 'sales_head', 'marketing_coordinator', 'inventory_manager']), getInternalTracking);
router.get('/summary', protect, authorize(['product_head', 'sales_head', 'marketing_coordinator']), getTrackingSummary);

// Status update routes
router.put('/:purchaseId/status', protect, authorize(['product_head', 'service_engineer', 'sales_head', 'marketing_coordinator', 'inventory_manager']), updateTrackingStatus);
router.put('/:purchaseId/shipping', protect, authorize(['product_head', 'marketing_coordinator', 'inventory_manager']), updateShippingDetails);
router.put('/:purchaseId/installation', protect, authorize(['product_head', 'service_engineer']), updateInstallationDetails);
router.put('/:purchaseId/estimates', protect, authorize(['product_head', 'marketing_coordinator']), updateEstimatedDates);

module.exports = router;

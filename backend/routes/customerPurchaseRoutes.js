const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  convertLeadToCustomer,
  getCustomerPurchases,
  recordPayment,
  getPaymentHistory,
  getPurchaseDetails,
  createQuotationFromLead,
  getCustomerPurchasesByUser,
  getAllPaymentHistory,
  getServiceEngineers,
  getAssignablePurchases,
  assignTaskToEngineer,
  getProductHeadTasks,
  getApprovedPurchases,
} = require('../controllers/customerPurchaseController');

// Create quotation from lead
router.post('/lead/:leadId/quotation', protect, createQuotationFromLead);

// Convert lead to customer when quotation is approved
router.post('/quotation/:quotationId/approve', protect, convertLeadToCustomer);

// Get all purchases for a customer
router.get('/customer/:customerId', protect, getCustomerPurchases);

// Get all purchases for logged-in customer
router.get('/my-purchases', protect, getCustomerPurchasesByUser);

// Get all purchases for logged-in customer
router.route('/my-purchases').get(protect, getCustomerPurchasesByUser);

// Get all purchases for logged-in customer
router.route('/approved').get(protect, authorize('sales_head'), getApprovedPurchases);

router
  .route('/')
  .get(protect, authorize('admin', 'sales'), getCustomerPurchases);

// Record payment for a purchase
router.post('/:purchaseId/payment', protect, recordPayment);

// Get payment history for all purchases of the current customer
router.get('/payments/history', protect, getAllPaymentHistory);

// Get payment history for a purchase
router.get('/:purchaseId/payments', protect, getPaymentHistory);

// Get purchase details with quotation items
router.get('/:purchaseId', protect, getPurchaseDetails);

// Routes for Product Head - Service Task Assignment
router.get(
  '/tasks/service-engineers',
  protect,
  getServiceEngineers
);

router.get(
  '/tasks/assignable',
  protect,
  getAssignablePurchases
);

router.put(
  '/tasks/:purchaseId/assign',
  protect,
  assignTaskToEngineer
);

// New route for getting all tasks for Product Head
router.get(
  '/tasks/all-product-head',
  protect,
  getProductHeadTasks
);

module.exports = router; 
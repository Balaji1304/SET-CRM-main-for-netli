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
  getPurchaseOrdersForManagement,
  acceptOrder,
  updateStatusToReadyToDispatch,
  allocateInstallationDate,
  recordManualPayment,
  verifyManualPayment,
  rejectManualPayment,
  getAllCustomers,
  generateOrderFormPDF,
  getOrderFormData,
  getAllPendingApprovals,
  getAllApprovedPayments
} = require('../controllers/customerPurchaseController');

// Create quotation from lead
router.post('/lead/:leadId/quotation', protect, createQuotationFromLead);

// Convert lead to customer when quotation is approved
router.post('/quotation/:quotationId/approve', protect, convertLeadToCustomer);

// Get all customers for management
router.get('/customers', protect, authorize('sales_head', 'sales_person', 'marketing_coordinator', 'admin'), getAllCustomers);

// Get all pending approvals for accounts department (both quotation and remaining payment approvals)
router.get('/pending-approvals', protect, authorize('accounts_department', 'admin'), getAllPendingApprovals);

// Get all approved payments for accounts department (both quotation and remaining payment approvals)
router.get('/approved-payments', protect, authorize('accounts_department', 'admin'), getAllApprovedPayments);

// This is the new primary route for the PO Management page
router
  .route('/')
  .get(protect, authorize('product_head', 'marketing_coordinator', 'admin'), getPurchaseOrdersForManagement);

// Get all purchases for a customer
router.get('/customer/:customerId', protect, getCustomerPurchases);

// Get all purchases for logged-in customer (or all purchases for admin)
router.get('/my-purchases', protect, authorize('customer', 'admin'), getCustomerPurchasesByUser);

// Get all purchases for logged-in customer (duplicate route - keeping for compatibility)
router.route('/my-purchases').get(protect, authorize('customer', 'admin'), getCustomerPurchasesByUser);

// Get all purchases for logged-in customer
router.route('/approved').get(protect, authorize('sales_head', 'admin'), getApprovedPurchases);

// Record payment for a purchase (legacy)
router.post('/:purchaseId/payment', protect, recordPayment);

// Customer: record manual payment
router.post('/:purchaseId/payments/manual', protect, recordManualPayment);

// Accounts: verify/reject manual payment
router.put('/:purchaseId/payments/:paymentId/verify', protect, verifyManualPayment);
router.put('/:purchaseId/payments/:paymentId/reject', protect, rejectManualPayment);

// Get payment history for all purchases of the current customer (or all payments for admin)
router.get('/payments/history', protect, authorize('customer', 'admin'), getAllPaymentHistory);

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

router.put(
  '/:purchaseId/accept-order',
  protect,
  authorize('product_head', 'admin'),
  acceptOrder
);

router.put(
  '/:purchaseId/ready-to-dispatch',
  protect,
  authorize('product_head', 'admin'),
  updateStatusToReadyToDispatch
);

router.put(
  '/:purchaseId/allocate-installation-date',
  protect,
  authorize('marketing_coordinator', 'admin'),
  allocateInstallationDate
);

// Order Form routes
router.get(
  '/:id/order-form/pdf',
  protect,
  generateOrderFormPDF
);

router.get(
  '/:id/order-form/data',
  protect,
  getOrderFormData
);

module.exports = router;
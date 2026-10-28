const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/accessControl');
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
  getAllApprovedPayments,
  exportPurchaseOrders,
  exportApprovedPayments
} = require('../controllers/customerPurchaseController');

// Create quotation from lead
router.post('/lead/:leadId/quotation', protect, authorize(ROLES.SALES), createQuotationFromLead);

// Convert lead to customer when quotation is approved
router.post('/quotation/:quotationId/approve', protect, authorize(ROLES.ACCOUNTS), convertLeadToCustomer);

// Get all customers for management
router.get('/customers', protect, authorize('sales_head', 'sales_person', 'marketing_coordinator', 'admin'), getAllCustomers);

// Get all pending approvals for accounts department (both quotation and remaining payment approvals)
router.get('/pending-approvals', protect, authorize('accounts_department', 'admin'), getAllPendingApprovals);

// Get all approved payments for accounts department (both quotation and remaining payment approvals)
router.get('/approved-payments', protect, authorize('accounts_department', 'admin'), getAllApprovedPayments);

router.get('/export', protect, authorize('admin'), exportPurchaseOrders);
router.get('/export-approved-payments', protect, authorize('admin'), exportApprovedPayments);

// This is the new primary route for the PO Management page
router
  .route('/')
  .get(protect, authorize('product_head', 'marketing_coordinator', 'admin'), getPurchaseOrdersForManagement);

// Get all purchases for a customer
router.get('/customer/:customerId', protect, authorize([...ROLES.SALES, 'accounts_department']), getCustomerPurchases);

// Get all purchases for logged-in customer (or all purchases for admin)
router.get('/my-purchases', protect, authorize('customer', 'admin'), getCustomerPurchasesByUser);

// Get all purchases for logged-in customer (duplicate route - keeping for compatibility)
router.route('/my-purchases').get(protect, authorize('customer', 'admin'), getCustomerPurchasesByUser);

// Get all purchases for logged-in customer
router.route('/approved').get(protect, authorize('sales_head', 'admin'), getApprovedPurchases);

// Record payment for a purchase (legacy)
// Staff-only: records an offline payment without gateway verification
router.post('/:purchaseId/payment', protect, authorize(ROLES.ACCOUNTS), recordPayment);

// Customer: record manual payment
router.post('/:purchaseId/payments/manual', protect, authorize('customer', 'admin'), recordManualPayment);

// Accounts: verify/reject manual payment
router.put('/:purchaseId/payments/:paymentId/verify', protect, authorize(ROLES.ACCOUNTS), verifyManualPayment);
router.put('/:purchaseId/payments/:paymentId/reject', protect, authorize(ROLES.ACCOUNTS), rejectManualPayment);

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
  authorize('product_head', 'marketing_coordinator', 'admin'),
  getServiceEngineers
);

router.get(
  '/tasks/assignable',
  protect,
  authorize('product_head', 'marketing_coordinator', 'admin'),
  getAssignablePurchases
);

router.put(
  '/tasks/:purchaseId/assign',
  protect,
  authorize('product_head', 'marketing_coordinator', 'admin'),
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
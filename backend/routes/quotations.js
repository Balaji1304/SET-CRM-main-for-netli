const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRolePermission } = require('../middleware/roleAuth');
const {
  createQuotation,
  getQuotations,
  getQuotation,
  updateQuotation,
  deleteQuotation,
  sendQuotation,
  resendQuotation,
  handleApproveQuotation,
  closeQuotation,
  confirmOfflinePayment,
  checkPublicPaymentStatus,
  manualConfirmPayment,
  exportQuotations,
  getCustomerProducts,
  getPendingPayments,
  checkPaymentStatus
} = require('../controllers/quotation');

// Public routes (no auth needed)
router.get('/public/payment-status', checkPublicPaymentStatus);
router.post('/manual-confirm', manualConfirmPayment);
router.get('/public-payment-status', checkPublicPaymentStatus);
router.get('/payment-status', checkPublicPaymentStatus);

// --- All routes below are protected + role-checked ---

// Customer specific routes
router.get('/customer/products', protect, checkRolePermission, getCustomerProducts);
router.get('/customer/pending-payments', protect, checkRolePermission, getPendingPayments);

// Export (must be before /:id)
router.get('/export', protect, checkRolePermission, exportQuotations);

// Base routes
router.route('/')
  .get(protect, checkRolePermission, getQuotations)
  .post(protect, checkRolePermission, createQuotation);

// Quotation specific routes (dynamic IDs last)
router.route('/:id')
  .get(protect, checkRolePermission, getQuotation)
  .put(protect, checkRolePermission, updateQuotation)
  .delete(protect, checkRolePermission, deleteQuotation);

router.post('/:id/send', protect, checkRolePermission, sendQuotation);
router.post('/:id/resend', protect, checkRolePermission, resendQuotation);
router.put('/:id/approve', protect, checkRolePermission, handleApproveQuotation);
router.put('/:id/close', protect, checkRolePermission, closeQuotation);
router.post('/:id/offline-payment', protect, checkRolePermission, confirmOfflinePayment);
router.get('/:id/payment-status', protect, checkRolePermission, checkPaymentStatus);

module.exports = router;

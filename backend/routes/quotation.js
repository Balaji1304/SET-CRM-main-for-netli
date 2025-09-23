const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  sendQuotation,
  handleApproveQuotation,
  handleRazorpayWebhook,
  confirmOfflinePayment,
  getCustomerProducts,
  getPendingPayments,
  checkPaymentStatus,
  checkPublicPaymentStatus,
  manualConfirmPayment,
  closeQuotation,
  exportQuotations
} = require('../controllers/quotation');

// Webhook route (unprotected)
router.post('/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

// Public routes (no authentication required)
router.get('/public/payment-status', checkPublicPaymentStatus);
router.post('/manual-confirm', manualConfirmPayment);

// Alternative paths for backward compatibility
router.get('/public-payment-status', checkPublicPaymentStatus);
router.get('/payment-status', checkPublicPaymentStatus);

// Protected routes
router.use(protect);

// Customer specific routes
router.get('/customer/products', getCustomerProducts);
router.get('/customer/pending-payments', getPendingPayments);

// Base routes
router.route('/')
  .get(getQuotations)
  .post(createQuotation);

// Export route (must be before /:id routes)
router.get('/export', exportQuotations);

// Quotation specific routes
router.route('/:id')
  .get(getQuotation)
  .put(updateQuotation)
  .delete(deleteQuotation);

router.post('/:id/send', sendQuotation);
router.put('/:id/approve', handleApproveQuotation);
router.put('/:id/close', closeQuotation);
router.post('/:id/offline-payment', confirmOfflinePayment);
router.get('/:id/payment-status', checkPaymentStatus);

// Simple 404 handler
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

module.exports = router; 
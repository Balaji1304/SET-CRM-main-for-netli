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
  approveQuotation,
  handleRazorpayWebhook,
  confirmOfflinePayment,
  getCustomerProducts,
  getPendingPayments,
  checkPaymentStatus,
  checkPublicPaymentStatus,
  manualConfirmPayment
} = require('../controllers/quotation');

// Webhook route (unprotected)
router.post('/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

// Public routes (no authentication required)
router.get('/public/payment-status', checkPublicPaymentStatus);
router.post('/manual-confirm', manualConfirmPayment);

// Protected routes
router.use(protect);

// Customer specific routes
router.get('/customer/products', getCustomerProducts);
router.get('/customer/pending-payments', getPendingPayments);

// Base routes
router.route('/')
  .get(getQuotations)
  .post(createQuotation);

// Quotation specific routes
router.route('/:id')
  .get(getQuotation)
  .put(updateQuotation)
  .delete(deleteQuotation);

router.post('/:id/send', sendQuotation);
router.put('/:id/approve', approveQuotation);
router.post('/:id/offline-payment', confirmOfflinePayment);
router.get('/:id/payment-status', checkPaymentStatus);

module.exports = router; 
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
  getPendingPayments
} = require('../controllers/quotation');

// Webhook route (unprotected)
router.post('/webhook', handleRazorpayWebhook);

// Protected routes
router.use(protect);

// Customer specific routes
router.get('/customer-products', getCustomerProducts);
router.get('/pending-payments', getPendingPayments);

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

module.exports = router; 
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
  initiatePayment,
  getPendingPayments,
  getPaymentsByPurchase,
  approvePayment,
  rejectPayment
} = require('../controllers/paymentController');

// Salesperson route to initiate a payment
router.post(
  '/',
  protect,
  authorize('sales_person', 'sales_head'),
  initiatePayment
);

// Accounts Department route to get pending payments
router.get(
  '/pending',
  protect,
  authorize('accounts_department'),
  getPendingPayments
);

// Accounts Department route to approve a payment
router.put(
  '/:id/approve',
  protect,
  authorize('accounts_department'),
  approvePayment
);

// Accounts Department route to reject a payment
router.put(
  '/:id/reject',
  protect,
  authorize('accounts_department'),
  rejectPayment
);

// Route to get all payments for a specific purchase
router.get(
  '/purchase/:purchaseId',
  protect,
  authorize('sales_person', 'sales_head', 'accounts_department'),
  getPaymentsByPurchase
);

module.exports = router; 
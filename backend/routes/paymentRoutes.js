const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/accessControl');
const { 
  getCustomerProducts, 
  getPendingPayments, 
  recordPayment,
  createRemainingPaymentLink,
  verifyRazorpayPayment
} = require('../controllers/paymentController');

// Get customer's products and purchases
router.get('/customer/products', protect, getCustomerProducts);

// Get customer's pending payments (or all pending payments for admin)
router.get('/customer/pending-payments', protect, authorize('customer', 'admin'), getPendingPayments);

// Record an offline payment (staff only: there is no gateway verification here)
router.post('/record', protect, authorize(ROLES.ACCOUNTS), recordPayment);

// Create Razorpay payment link for remaining payment
router.post('/remaining/:purchaseId/razorpay-link', protect, authorize('customer', 'admin'), createRemainingPaymentLink);

// Verify Razorpay payment status
router.get('/verify/:purchaseId/:paymentLinkId', protect, authorize('customer', 'admin'), verifyRazorpayPayment);

module.exports = router; 
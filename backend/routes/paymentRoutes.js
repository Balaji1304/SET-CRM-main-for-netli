const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
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

// Record a new payment
router.post('/record', protect, recordPayment);

// Create Razorpay payment link for remaining payment
router.post('/remaining/:purchaseId/razorpay-link', protect, createRemainingPaymentLink);

// Verify Razorpay payment status
router.get('/verify/:purchaseId/:paymentLinkId', protect, verifyRazorpayPayment);

module.exports = router; 
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
  getAllPaymentHistory
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
router.get('/', protect, getCustomerPurchasesByUser);

// Record payment for a purchase
router.post('/:purchaseId/payment', protect, recordPayment);

// Get payment history for all purchases of the current customer
router.get('/payments/history', protect, getAllPaymentHistory);

// Get payment history for a purchase
router.get('/:purchaseId/payments', protect, getPaymentHistory);

// Get purchase details with quotation items
router.get('/:purchaseId', protect, getPurchaseDetails);

module.exports = router; 
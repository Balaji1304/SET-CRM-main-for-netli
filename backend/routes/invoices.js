const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
  createInvoice,
  updatePaymentStatus,
  getInvoiceByPurchaseId,
  sendExistingInvoiceEmail
} = require('../controllers/invoice');

router.post(
  '/',
  protect,
  authorize('admin', 'sales_person'),
  createInvoice
);

router.patch(
  '/:id/payment-status',
  protect,
  authorize('admin', 'sales_person'),
  updatePaymentStatus
);

router.get(
  '/purchase/:customerPurchaseId',
  protect,
  getInvoiceByPurchaseId
);

router.post(
  '/:invoiceId/send-email',
  protect,
  authorize('admin', 'sales_person'),
  sendExistingInvoiceEmail
);

module.exports = router; 
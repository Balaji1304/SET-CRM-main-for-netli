const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRolePermission } = require('../middleware/roleAuth');

const {
  createInvoice,
  updatePaymentStatus,
  getInvoiceByPurchaseId,
  sendExistingInvoiceEmail
} = require('../controllers/invoice');

// Protect all routes and check role permissions
router.use(protect);
router.use(checkRolePermission);

router.post(
  '/',
  createInvoice
);

router.patch(
  '/:id/payment-status',
  updatePaymentStatus
);

router.get(
  '/purchase/:customerPurchaseId',
  getInvoiceByPurchaseId
);

router.post(
  '/:invoiceId/send-email',
  sendExistingInvoiceEmail
);

module.exports = router; 
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
  approveQuotation,
  sendQuotation,
  confirmOfflinePayment,
  closeQuotation,
  handleApproveQuotation,
  checkPublicPaymentStatus,
  manualConfirmPayment
} = require('../controllers/quotation');

// Public routes (no auth needed)
router.get('/public/payment-status', checkPublicPaymentStatus);
router.post('/manual-confirm', manualConfirmPayment);

// Protect all subsequent routes
router.use(protect);
router.use(checkRolePermission);

router.route('/')
  .get(getQuotations)
  .post(createQuotation);

router.route('/:id')
  .get(getQuotation)
  .put(updateQuotation)
  .delete(deleteQuotation);

router.post('/:id/send', sendQuotation);
router.put('/:id/approve', handleApproveQuotation);
router.put('/:id/close', closeQuotation);
router.post('/:id/offline-payment', confirmOfflinePayment);

module.exports = router; 
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
  sendQuotation,
  handleApproveQuotation,
  closeQuotation,
  confirmOfflinePayment,
  checkPublicPaymentStatus,
  manualConfirmPayment,
  exportQuotations
} = require('../controllers/quotation');

// Public routes (no auth needed)
router.get('/public/payment-status', checkPublicPaymentStatus);
router.post('/manual-confirm', manualConfirmPayment);

// --- All routes below are protected ---

// Specific routes first
router.get('/export', protect, checkRolePermission, exportQuotations);

// General routes
router.route('/')
  .get(protect, checkRolePermission, getQuotations)
  .post(protect, checkRolePermission, createQuotation);

// Routes with dynamic IDs must come last
router.route('/:id')
  .get(protect, checkRolePermission, getQuotation)
  .put(protect, checkRolePermission, updateQuotation)
  .delete(protect, checkRolePermission, deleteQuotation);

router.post('/:id/send', protect, checkRolePermission, sendQuotation);
router.put('/:id/approve', protect, checkRolePermission, handleApproveQuotation);
router.put('/:id/close', protect, checkRolePermission, closeQuotation);
router.post('/:id/offline-payment', protect, checkRolePermission, confirmOfflinePayment);

module.exports = router; 
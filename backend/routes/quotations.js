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
  closeQuotation
} = require('../controllers/quotation');

// Protect all routes
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
router.put('/:id/approve', approveQuotation);
router.put('/:id/close', closeQuotation);
router.post('/:id/offline-payment', confirmOfflinePayment);

module.exports = router; 
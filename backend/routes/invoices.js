const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRolePermission } = require('../middleware/roleAuth');
const {
  createInvoice,
  updatePaymentStatus
} = require('../controllers/invoice');

router.route('/')
  .post(protect, checkRolePermission, createInvoice);

router.route('/:id/payment')
  .put(protect, checkRolePermission, updatePaymentStatus);

module.exports = router; 
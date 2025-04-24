const express = require('express');
const router = express.Router();
const { createLead, getLeads, getLead, updateLead, deleteLead } = require('../controllers/leads');
const { protect } = require('../middleware/auth');
const { checkRolePermission } = require('../middleware/roleAuth');

router.route('/')
  .get(protect, checkRolePermission, getLeads)
  .post(protect, checkRolePermission, createLead);

router.route('/:id')
  .get(protect, checkRolePermission, getLead)
  .put(protect, checkRolePermission, updateLead)
  .delete(protect, checkRolePermission, deleteLead);

module.exports = router; 
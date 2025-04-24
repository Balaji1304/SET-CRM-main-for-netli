const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { checkRolePermission } = require('../middleware/roleAuth');
const { getTickets, createTicket, updateTicket, deleteTicket } = require('../controllers/tickets');

router.route('/')
  .get(protect, checkRolePermission, getTickets)
  .post(protect, checkRolePermission, createTicket);

router.route('/:id')
  .put(protect, checkRolePermission, updateTicket)
  .delete(protect, checkRolePermission, deleteTicket);

module.exports = router; 
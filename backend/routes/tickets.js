const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { checkRolePermission } = require('../middleware/roleAuth');
const {
  getTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  getAllTickets,
  assignTicket,
  updateTicketMeta,
  getAssignedTickets,
  updateTicketStatus,
  addComment,
  uploadAttachment
} = require('../controllers/tickets');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Customer: list & create own tickets
router.route('/')
  .get(protect, checkRolePermission, getTickets)
  .post(protect, checkRolePermission, upload.array('attachments', 3), createTicket);

// Customer: update/delete own ticket (rare)
router.route('/:id')
  .put(protect, checkRolePermission, updateTicket)
  .delete(protect, checkRolePermission, deleteTicket);

// Front Office Executive: list all tickets
router.get('/admin/all', protect, authorize('front_office_executive', 'admin'), getAllTickets);

// Front Office Executive: assign/unassign and update meta
router.put('/admin/:id/assign', protect, authorize('front_office_executive', 'admin'), assignTicket);
router.put('/admin/:id/meta', protect, authorize('front_office_executive', 'admin'), updateTicketMeta);

// Service Engineer: my assigned, update status, add comment
router.get('/engineer/my', protect, authorize('service_engineer', 'admin'), getAssignedTickets);
router.put('/engineer/:id/status', protect, authorize('service_engineer', 'admin'), updateTicketStatus);
router.post('/engineer/:id/comments', protect, authorize('service_engineer', 'admin'), addComment);
router.post('/engineer/:id/attachments', protect, authorize('service_engineer', 'admin'), upload.single('file'), uploadAttachment);

module.exports = router;
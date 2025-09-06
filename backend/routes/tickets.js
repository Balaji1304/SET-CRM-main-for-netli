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
router.get('/admin/all', protect, authorize('front_office_executive'), getAllTickets);

// Front Office Executive: assign/unassign and update meta
router.put('/admin/:id/assign', protect, authorize('front_office_executive'), assignTicket);
router.put('/admin/:id/meta', protect, authorize('front_office_executive'), updateTicketMeta);

// Service Engineer: my assigned, update status, add comment
router.get('/engineer/my', protect, authorize('service_engineer'), getAssignedTickets);
router.put('/engineer/:id/status', protect, authorize('service_engineer'), updateTicketStatus);
router.post('/engineer/:id/comments', protect, authorize('service_engineer'), addComment);
router.post('/engineer/:id/attachments', protect, authorize('service_engineer'), upload.single('file'), uploadAttachment);

module.exports = router;
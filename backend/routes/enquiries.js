const express = require('express');
const router = express.Router();
const {
  createEnquiry,
  getEnquiries,
  getEnquiry,
  updateEnquiry,
  deleteEnquiry,
  getSalespersons,
  assignEnquiryToSalesperson,
  getPendingAssignmentEnquiries,
  getMyEnquiries,
  exportEnquiries
} = require('../controllers/enquiry');

const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/accessControl');

// All routes require authentication
router.use(protect);

// General enquiry routes


// Assignment related routes (must come before /:id routes)
// Salesperson list is used by several staff pages; everything else is front office only
router.get('/salespersons', authorize(ROLES.STAFF), getSalespersons);

router.use(authorize(ROLES.FRONT_OFFICE));

router.route('/')
  .get(getEnquiries)
  .post(createEnquiry);
router.get('/pending-assignment', getPendingAssignmentEnquiries);
router.get('/my-enquiries', getMyEnquiries);
router.post('/:id/assign', assignEnquiryToSalesperson);
router.get('/export', exportEnquiries);

// Specific enquiry routes (must come after named routes)
router.route('/:id')
  .get(getEnquiry)
  .put(updateEnquiry)
  .delete(deleteEnquiry);

module.exports = router; 
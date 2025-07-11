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
  getMyEnquiries
} = require('../controllers/enquiry');

const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// General enquiry routes
router.route('/')
  .get(getEnquiries)
  .post(createEnquiry);

// Assignment related routes (must come before /:id routes)
router.get('/salespersons', getSalespersons);
router.get('/pending-assignment', getPendingAssignmentEnquiries);
router.get('/my-enquiries', getMyEnquiries);
router.post('/:id/assign', assignEnquiryToSalesperson);

// Specific enquiry routes (must come after named routes)
router.route('/:id')
  .get(getEnquiry)
  .put(updateEnquiry)
  .delete(deleteEnquiry);

module.exports = router; 
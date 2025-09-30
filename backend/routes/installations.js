const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getMyAssignments,
  acceptAssignment,
  startWork,
  completeInstallation,
  uploadCompletionPhotos,
  getInstallationForSignoff,
  customerSignoff,
  reportIssue
} = require('../controllers/installationController');

// Service Engineer Routes
router.get('/my-assignments', protect, authorize('service_engineer', 'admin'), getMyAssignments);
router.put('/:purchaseId/accept', protect, authorize('service_engineer', 'admin'), acceptAssignment);
router.put('/:purchaseId/start-work', protect, authorize('service_engineer', 'admin'), startWork);
router.post('/:purchaseId/complete', 
  protect, 
  authorize('service_engineer', 'admin'), 
  uploadCompletionPhotos,
  completeInstallation
);
router.post('/:purchaseId/report-issue', protect, authorize('service_engineer', 'admin'), reportIssue);

// Customer Routes
router.get('/:purchaseId/signoff', protect, authorize('service_engineer', 'admin'), getInstallationForSignoff);
router.post('/:purchaseId/signoff', protect, authorize('service_engineer', 'admin'), customerSignoff);

module.exports = router;


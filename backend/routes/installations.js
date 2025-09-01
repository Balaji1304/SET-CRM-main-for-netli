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
router.get('/my-assignments', protect, authorize('service_engineer'), getMyAssignments);
router.put('/:purchaseId/accept', protect, authorize('service_engineer'), acceptAssignment);
router.put('/:purchaseId/start-work', protect, authorize('service_engineer'), startWork);
router.post('/:purchaseId/complete', 
  protect, 
  authorize('service_engineer'), 
  uploadCompletionPhotos,
  completeInstallation
);
router.post('/:purchaseId/report-issue', protect, authorize('service_engineer'), reportIssue);

// Customer Routes
router.get('/:purchaseId/signoff', protect, authorize('service_engineer'), getInstallationForSignoff);
router.post('/:purchaseId/signoff', protect, authorize('service_engineer'), customerSignoff);

module.exports = router;


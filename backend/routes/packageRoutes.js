const express = require('express');
const router = express.Router();
const {
  getPackages,
  createPackage,
  updatePackageStatus,
  deletePackage,
} = require('../controllers/packageController');
const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(protect, authorize('sales_head', 'admin'), getPackages)
  .post(protect, authorize('sales_head', 'admin'), createPackage);

router
  .route('/:id/status')
  .put(protect, authorize('sales_head', 'admin'), updatePackageStatus);

router.route('/:id').delete(protect, authorize('sales_head', 'admin'), deletePackage);

module.exports = router; 
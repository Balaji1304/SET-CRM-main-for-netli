const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getBundles,
  getBundle,
  createBundle,
  updateBundle,
  deleteBundle,
  getPowerPlantConfigurations,
  getCompatibleProducts,
  getDefaultBundleTerms,
  getAllBundleTerms,
  getBundleWithComponents,
  exportBundles
} = require('../controllers/productBundle');

// Public routes (for displaying bundles to customers)
router.get('/power-plants/configurations', protect, getPowerPlantConfigurations);

// Protected routes - all authenticated users can view
router.get('/', protect, getBundles);
router.get('/compatible-products', protect, getCompatibleProducts);
router.get('/terms/default', protect, getDefaultBundleTerms);
router.get('/terms/all', protect, getAllBundleTerms);
router.get('/export', protect, authorize('admin'), exportBundles);
router.get('/:id', protect, getBundle);
router.get('/:id/components', protect, getBundleWithComponents); // New route for component details

// Admin/Product Head/Inventory Manager only routes
router.post('/', protect, authorize('admin', 'product_head'), createBundle);
router.put('/:id', protect, authorize('admin', 'product_head'), updateBundle);
router.delete('/:id', protect, authorize('admin', 'product_head'), deleteBundle);

module.exports = router; 
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getSolarBundleItems,
  getSolarBundleItem,
  createSolarBundleItem,
  updateSolarBundleItem,
  deleteSolarBundleItem
} = require('../controllers/solarBundleItem');

// Public routes for viewing items (protected but accessible to all authenticated users)
router.get('/', protect, getSolarBundleItems);
router.get('/:id', protect, getSolarBundleItem);

// Admin/Product Head only routes
router.post('/', protect, authorize('product_head', 'admin'), createSolarBundleItem);
router.put('/:id', protect, authorize('product_head', 'admin'), updateSolarBundleItem);
router.delete('/:id', protect, authorize('product_head', 'admin'), deleteSolarBundleItem);

module.exports = router; 
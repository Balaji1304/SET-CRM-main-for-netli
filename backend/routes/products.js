const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const {
  getProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  uploadBrochure,
  getDefaultTerms,
  getAllTerms,
  exportProducts
} = require('../controllers/products');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/brochures/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = 'uploads/brochures';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Public routes that don't require auth
router.get('/', getProducts);

// Terms and conditions routes (must come before /:id route)
router.get('/terms/default', getDefaultTerms);
router.get('/terms/all', getAllTerms);

router.get('/export', protect, authorize('admin'), exportProducts);

router.get('/:id', getProduct);

// Protected routes
router.post('/', protect, authorize('admin', 'product_head'), upload.single('brochure'), createProduct);
router.put('/:id', protect, authorize('admin', 'product_head'), upload.single('brochure'), updateProduct);
router.delete('/:id', protect, authorize('admin', 'product_head'), deleteProduct);

module.exports = router;
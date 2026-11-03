const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
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
    // Never trust the client-supplied name (path traversal / odd characters)
    const ext = path.extname(file.originalname || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});

// Brochures: PDFs and common images only, max 10 MB
const ALLOWED_BROCHURE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_BROCHURE_TYPES.includes(file.mimetype)) {
      return cb(null, true);
    }
    const err = new Error('Only PDF, JPEG, PNG or WebP brochures are allowed');
    err.statusCode = 400;
    cb(err);
  }
});

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
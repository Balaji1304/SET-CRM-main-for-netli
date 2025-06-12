const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
  getProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  uploadBrochure
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
router.get('/:id', getProduct);

// Protected routes
router.post('/', protect, upload.single('brochure'), createProduct);
router.put('/:id', protect, upload.single('brochure'), updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;
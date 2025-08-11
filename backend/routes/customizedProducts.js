const express = require('express');
const multer = require('multer');
const router = express.Router();

const {
  createCustomizedProduct,
  getAllCustomizedProducts,
  getCustomizedProductsByLead,
  getCustomizedProduct,
  updateCustomizedProduct,
  uploadCustomizedProductImages,
  deleteCustomizedProduct
} = require('../controllers/customizedProduct');

const { protect } = require('../middleware/auth');

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/temp/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// All routes require authentication
router.use(protect);

// Routes
router.route('/')
  .get(getAllCustomizedProducts)
  .post(createCustomizedProduct);

router.route('/lead/:leadId')
  .get(getCustomizedProductsByLead);

router.route('/:id')
  .get(getCustomizedProduct)
  .put(updateCustomizedProduct)
  .delete(deleteCustomizedProduct);

router.route('/:id/images')
  .post(upload.array('images', 5), uploadCustomizedProductImages);

module.exports = router;

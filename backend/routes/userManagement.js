const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  checkEmailExists,
  checkPhoneExists,
  checkWhatsappExists,
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  toggleUserStatus,
  getUserStats,
  exportUsers
} = require('../controllers/userManagement');

const router = express.Router();

// All routes in this file are admin-only
router.use(protect, authorize('admin'));

// Validation routes
router.post('/check-email', checkEmailExists);
router.post('/check-phone', checkPhoneExists);
router.post('/check-whatsapp', checkWhatsappExists);

// Stats route
router.get('/stats', getUserStats);

// Export route
router.get('/export', exportUsers);

// CRUD routes
router.route('/')
  .get(getAllUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

// Special action routes
router.put('/:id/reset-password', resetUserPassword);
router.put('/:id/toggle-status', toggleUserStatus);

module.exports = router;
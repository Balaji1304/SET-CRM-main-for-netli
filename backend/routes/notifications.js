const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { checkRolePermission } = require('../middleware/roleAuth');
const {
  getNotifications,
  getNotificationCounts,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createSystemNotification
} = require('../controllers/notification');

// Get user notifications
router.get('/', protect, checkRolePermission, getNotifications);

// Get notification counts
router.get('/counts', protect, checkRolePermission, getNotificationCounts);

// Mark notifications as read
router.put('/mark-read', protect, checkRolePermission, markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', protect, checkRolePermission, markAllAsRead);

// Delete notification
router.delete('/:id', protect, checkRolePermission, deleteNotification);

// Create system notification (Admin only)
router.post('/system', protect, authorize('admin'), createSystemNotification);

module.exports = router;

const Notification = require('../models/Notification');
const User = require('../models/User');
const { AppError, errorHandler } = require('../utils/errorHandler');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly, type } = req.query;
    
    const result = await Notification.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      type
    });
    
    res.json({
      success: true,
      data: result.notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get notification counts
// @route   GET /api/notifications/counts
// @access  Private
exports.getNotificationCounts = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [
      totalCount,
      unreadCount,
      ticketCount,
      purchaseOrderCount,
      quotationCount
    ] = await Promise.all([
      Notification.countDocuments({ recipient: userId }),
      Notification.countDocuments({ recipient: userId, read: false }),
      Notification.countDocuments({ recipient: userId, type: { $regex: '^ticket_' }, read: false }),
      Notification.countDocuments({ recipient: userId, type: { $regex: '^purchase_order_' }, read: false }),
      Notification.countDocuments({ recipient: userId, type: { $regex: '^quotation_' }, read: false })
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalCount,
        unread: unreadCount,
        byType: {
          tickets: ticketCount,
          purchaseOrders: purchaseOrderCount,
          quotations: quotationCount
        }
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/mark-read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;
    
    if (!notificationIds || !Array.isArray(notificationIds)) {
      throw new AppError('Notification IDs array is required', 400);
    }
    
    await Notification.markAsRead(notificationIds, req.user.id);
    
    res.json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Create system notification (Admin only)
// @route   POST /api/notifications/system
// @access  Private (Admin)
exports.createSystemNotification = async (req, res) => {
  try {
    const { recipients, title, message, priority = 'medium', data = {} } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new AppError('Recipients array is required', 400);
    }
    
    if (!title || !message) {
      throw new AppError('Title and message are required', 400);
    }
    
    // Create notifications for all recipients
    const notifications = await Promise.all(
      recipients.map(recipientId => 
        Notification.createNotification({
          recipient: recipientId,
          sender: req.user.id,
          type: 'system_announcement',
          title,
          message,
          priority,
          data
        })
      )
    );
    
    res.status(201).json({
      success: true,
      message: `System notification sent to ${recipients.length} users`,
      data: notifications
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

module.exports = {
  getNotifications: exports.getNotifications,
  getNotificationCounts: exports.getNotificationCounts,
  markAsRead: exports.markAsRead,
  markAllAsRead: exports.markAllAsRead,
  deleteNotification: exports.deleteNotification,
  createSystemNotification: exports.createSystemNotification
};

const Notification = require('../models/Notification');
const User = require('../models/User');
const { AppError, errorHandler } = require('../utils/errorHandler');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly, type } = req.query;
    
    // Debug logging for FOE
    console.log('🔍 Notification Request Debug:', {
      userId: req.user.id,
      userRole: req.user.role,
      userEmail: req.user.email,
      queryParams: { page, limit, unreadOnly, type }
    });
    
    const result = await Notification.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
      type
    });
    
    console.log('📊 Notification Query Result:', {
      userId: req.user.id,
      userRole: req.user.role,
      notificationCount: result.notifications.length,
      totalNotifications: result.total,
      notificationTypes: result.notifications.map(n => n.type)
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
const getNotificationCounts = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Debug logging for FOE
    console.log('🔢 Notification Counts Request:', {
      userId: userId,
      userRole: req.user.role,
      userEmail: req.user.email
    });
    
    const [
      totalCount,
      unreadCount,
      ticketCount,
      purchaseOrderCount,
      quotationCount,
      leadCount,
      enquiryCount,
      installationCount,
      paymentCount
    ] = await Promise.all([
      Notification.countDocuments({ recipient: userId }),
      Notification.countDocuments({ recipient: userId, read: false }),
      Notification.countDocuments({ 
        recipient: userId, 
        type: { $in: ['ticket_created', 'ticket_assigned', 'ticket_status_changed', 'ticket_commented'] }, 
        read: false 
      }),
      Notification.countDocuments({ 
        recipient: userId, 
        type: { $in: ['purchase_order_created', 'purchase_order_updated', 'order_update'] }, 
        read: false 
      }),
      Notification.countDocuments({ 
        recipient: userId, 
        type: { $in: ['quotation_created', 'quotation_updated', 'quotation_approved', 'quotation_rejected', 'quotation_expired', 'quotation_pending_approval'] }, 
        read: false 
      }),
      Notification.countDocuments({ 
        recipient: userId, 
        type: { $in: ['lead_created', 'lead_assigned', 'lead_updated', 'lead_follow_up'] }, 
        read: false 
      }),
      Notification.countDocuments({ 
        recipient: userId, 
        type: { $in: ['enquiry_created', 'enquiry_assigned', 'enquiry_converted'] }, 
        read: false 
      }),
      Notification.countDocuments({ 
        recipient: userId, 
        type: { $in: ['engineer_assigned', 'assignment_accepted', 'installation_completed', 'installation_scheduled', 'installation_rescheduled', 'installation_started', 'customer_approved', 'customer_rejected', 'issue_reported'] }, 
        read: false 
      }),
      Notification.countDocuments({
        recipient: userId,
        type: { $in: ['payment_received', 'payment_failed', 'payment_pending', 'payment_overdue', 'invoice_due_soon'] },
        read: false
      })
    ]);
    
    res.json({
      success: true,
      data: {
        total: totalCount,
        totalUnread: unreadCount,
        unread: unreadCount,
        byType: {
          tickets: ticketCount,
          purchaseOrders: purchaseOrderCount,
          quotations: quotationCount,
          leads: leadCount,
          enquiries: enquiryCount,
          installations: installationCount,
          payments: paymentCount
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
const markAsRead = async (req, res) => {
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
const markAllAsRead = async (req, res) => {
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
const deleteNotification = async (req, res) => {
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
const createSystemNotification = async (req, res) => {
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

// Export functions directly without circular reference
module.exports = {
  getNotifications,
  getNotificationCounts,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createSystemNotification
};

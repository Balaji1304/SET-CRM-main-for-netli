const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  type: {
    type: String,
        enum: [
      'ticket_created',
      'ticket_assigned',
      'ticket_status_changed',
      'ticket_commented',
      'purchase_order_created',
      'purchase_order_updated',
      'quotation_approved',
      'quotation_rejected',
      'payment_received',
      'lead_assigned',
      'system_announcement',
      'engineer_assigned',
      'assignment_accepted',
      'installation_completed',
      'customer_approved',
      'customer_rejected',
      'issue_reported'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // Auto-delete after 30 days

// Virtual for time ago
NotificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

// Static method to create notification
NotificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to mark as read
NotificationSchema.statics.markAsRead = async function(notificationIds, userId) {
  return this.updateMany(
    { _id: { $in: notificationIds }, recipient: userId },
    { $set: { read: true } }
  );
};

// Static method to get user notifications
NotificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    unreadOnly = false,
    type = null
  } = options;
  
  const query = { recipient: userId };
  if (unreadOnly) query.read = false;
  if (type) query.type = type;
  
  const notifications = await this.find(query)
    .populate('sender', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
  const total = await this.countDocuments(query);
  
  return {
    notifications,
    total,
    hasMore: total > page * limit
  };
};

module.exports = mongoose.model('Notification', NotificationSchema);

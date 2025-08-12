const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  // Create a new ticket notification
  static async createTicketNotification(type, ticket, sender = null, additionalData = {}) {
    try {
      let recipients = [];
      let title = '';
      let message = '';
      let priority = 'medium';

      switch (type) {
        case 'ticket_created':
          // Notify product heads about new tickets
          const productHeads = await User.find({ role: 'product_head' });
          recipients = productHeads.map(user => user._id);
          title = 'New Support Ticket Created';
          message = `A new ticket "${ticket.title}" has been created by ${ticket.user?.name || 'Customer'}`;
          priority = ticket.priority === 'high' ? 'high' : 'medium';
          break;

        case 'ticket_assigned':
          // Notify the assigned engineer
          if (ticket.assignedEngineerId) {
            recipients = [ticket.assignedEngineerId];
            title = 'Ticket Assigned to You';
            message = `You have been assigned ticket "${ticket.title}"`;
            priority = ticket.priority === 'high' ? 'high' : 'medium';
          }
          break;

        case 'ticket_status_changed':
          // Notify customer and relevant stakeholders
          recipients = [ticket.user];
          if (ticket.assignedEngineerId) {
            recipients.push(ticket.assignedEngineerId);
          }
          title = 'Ticket Status Updated';
          message = `Ticket "${ticket.title}" status changed to ${ticket.status.replace('_', ' ')}`;
          break;

        case 'ticket_commented':
          // Notify ticket owner and assigned engineer (excluding the commenter)
          recipients = [ticket.user];
          if (ticket.assignedEngineerId && ticket.assignedEngineerId.toString() !== sender?.toString()) {
            recipients.push(ticket.assignedEngineerId);
          }
          // Remove sender from recipients
          if (sender) {
            recipients = recipients.filter(id => id.toString() !== sender.toString());
          }
          title = 'New Comment on Ticket';
          message = `${sender?.name || 'Someone'} commented on ticket "${ticket.title}"`;
          break;
      }

      // Create notifications for all recipients
      const notifications = await Promise.all(
        recipients.map(recipientId => 
          Notification.createNotification({
            recipient: recipientId,
            sender: sender?._id || null,
            type,
            title,
            message,
            priority,
            data: {
              ticketId: ticket._id,
              ticketTitle: ticket.title,
              ticketStatus: ticket.status,
              ticketPriority: ticket.priority,
              ...additionalData
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating ticket notification:', error);
      throw error;
    }
  }

  // Create purchase order notification
  static async createPurchaseOrderNotification(type, purchaseOrder, sender = null) {
    try {
      let recipients = [];
      let title = '';
      let message = '';
      let priority = 'medium';

      switch (type) {
        case 'purchase_order_created':
          // Notify inventory managers and sales heads
          const relevantUsers = await User.find({ 
            role: { $in: ['inventory_manager', 'sales_head', 'accounts_department'] }
          });
          recipients = relevantUsers.map(user => user._id);
          title = 'New Purchase Order Created';
          message = `Purchase order #${purchaseOrder.orderNumber || purchaseOrder._id} has been created`;
          priority = 'high';
          break;

        case 'purchase_order_updated':
          // Notify relevant stakeholders
          const stakeholders = await User.find({ 
            role: { $in: ['inventory_manager', 'sales_head'] }
          });
          recipients = stakeholders.map(user => user._id);
          title = 'Purchase Order Updated';
          message = `Purchase order #${purchaseOrder.orderNumber || purchaseOrder._id} has been updated`;
          break;
      }

      const notifications = await Promise.all(
        recipients.map(recipientId => 
          Notification.createNotification({
            recipient: recipientId,
            sender: sender?._id || null,
            type,
            title,
            message,
            priority,
            data: {
              purchaseOrderId: purchaseOrder._id,
              orderNumber: purchaseOrder.orderNumber,
              status: purchaseOrder.status,
              totalAmount: purchaseOrder.totalAmount
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating purchase order notification:', error);
      throw error;
    }
  }

  // Create quotation notification
  static async createQuotationNotification(type, quotation, sender = null) {
    try {
      let recipients = [];
      let title = '';
      let message = '';
      let priority = 'medium';

      switch (type) {
        case 'quotation_approved':
          // Notify customer and sales team
          recipients = [quotation.customer];
          const salesTeam = await User.find({ role: { $in: ['sales_person', 'sales_head'] } });
          recipients.push(...salesTeam.map(user => user._id));
          title = 'Quotation Approved';
          message = `Quotation #${quotation.quotationNumber} has been approved`;
          priority = 'high';
          break;

        case 'quotation_rejected':
          recipients = [quotation.customer];
          title = 'Quotation Requires Attention';
          message = `Quotation #${quotation.quotationNumber} needs review`;
          break;
      }

      const notifications = await Promise.all(
        recipients.map(recipientId => 
          Notification.createNotification({
            recipient: recipientId,
            sender: sender?._id || null,
            type,
            title,
            message,
            priority,
            data: {
              quotationId: quotation._id,
              quotationNumber: quotation.quotationNumber,
              status: quotation.status,
              totalAmount: quotation.totalAmount
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating quotation notification:', error);
      throw error;
    }
  }

  // Create payment notification
  static async createPaymentNotification(payment, sender = null) {
    try {
      // Notify accounts department and sales team
      const relevantUsers = await User.find({ 
        role: { $in: ['accounts_department', 'sales_head'] }
      });
      const recipients = relevantUsers.map(user => user._id);

      const notifications = await Promise.all(
        recipients.map(recipientId => 
          Notification.createNotification({
            recipient: recipientId,
            sender: sender?._id || null,
            type: 'payment_received',
            title: 'Payment Received',
            message: `Payment of ₹${payment.amount} has been received`,
            priority: 'medium',
            data: {
              paymentId: payment._id,
              amount: payment.amount,
              method: payment.method,
              status: payment.status
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating payment notification:', error);
      throw error;
    }
  }

  // Create lead assignment notification
  static async createLeadNotification(lead, assignedTo, sender = null) {
    try {
      const notification = await Notification.createNotification({
        recipient: assignedTo,
        sender: sender?._id || null,
        type: 'lead_assigned',
        title: 'New Lead Assigned',
        message: `A new lead "${lead.company || lead.name}" has been assigned to you`,
        priority: 'medium',
        data: {
          leadId: lead._id,
          leadName: lead.name,
          company: lead.company,
          phone: lead.phone,
          email: lead.email
        }
      });

      return [notification];
    } catch (error) {
      console.error('Error creating lead notification:', error);
      throw error;
    }
  }

  // Get notification statistics for dashboard
  static async getNotificationStats(userId) {
    try {
      const [
        totalUnread,
        ticketNotifications,
        purchaseOrderNotifications,
        quotationNotifications,
        recentNotifications
      ] = await Promise.all([
        Notification.countDocuments({ recipient: userId, read: false }),
        Notification.countDocuments({ 
          recipient: userId, 
          type: { $regex: '^ticket_' }, 
          read: false 
        }),
        Notification.countDocuments({ 
          recipient: userId, 
          type: { $regex: '^purchase_order_' }, 
          read: false 
        }),
        Notification.countDocuments({ 
          recipient: userId, 
          type: { $regex: '^quotation_' }, 
          read: false 
        }),
        Notification.find({ recipient: userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('sender', 'name')
      ]);

      return {
        totalUnread,
        byType: {
          tickets: ticketNotifications,
          purchaseOrders: purchaseOrderNotifications,
          quotations: quotationNotifications
        },
        recent: recentNotifications
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;

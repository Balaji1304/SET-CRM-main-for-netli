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

  // Create installation notifications
  static async createInstallationNotification(type, purchase, sender = null) {
    try {
      let recipients = [];
      let title = '';
      let message = '';
      let priority = 'medium';

      switch (type) {
        case 'engineer_assigned':
          // Notify the assigned engineer
          recipients = [purchase.assignedEngineerId];
          title = 'New Installation Assignment';
          message = `You have been assigned to install products for order ${purchase.purchaseID}. Installation date: ${new Date(purchase.installationDate).toLocaleDateString()}`;
          priority = 'high';
          break;

        case 'assignment_accepted':
          // Notify customer and management
          recipients = [purchase.customerId._id || purchase.customerId];
          const management = await User.find({ role: { $in: ['product_head', 'marketing_coordinator'] } });
          recipients.push(...management.map(user => user._id));
          title = 'Installation Assignment Accepted';
          message = `Service engineer ${sender?.name || 'Engineer'} has accepted the installation assignment for order ${purchase.purchaseID}`;
          priority = 'medium';
          break;

        case 'installation_completed':
          // Notify customer for sign-off
          recipients = [purchase.customerId._id || purchase.customerId];
          title = 'Installation Completed - Action Required';
          message = `Your installation for order ${purchase.purchaseID} has been completed. Please review and provide feedback.`;
          priority = 'high';
          break;

        case 'customer_approved':
          // Notify engineer and management
          recipients = [purchase.assignedEngineerId];
          const approvalManagement = await User.find({ 
            role: { $in: ['product_head', 'accounts_department'] } 
          });
          recipients.push(...approvalManagement.map(user => user._id));
          title = 'Installation Approved by Customer';
          message = `Customer has approved the installation for order ${purchase.purchaseID}. Order is now complete.`;
          priority = 'medium';
          break;

        case 'customer_rejected':
          // Notify engineer and management
          recipients = [purchase.assignedEngineerId];
          const rejectionManagement = await User.find({ 
            role: { $in: ['product_head', 'service_engineer'] } 
          });
          recipients.push(...rejectionManagement.map(user => user._id));
          title = 'Installation Issues Reported';
          message = `Customer has reported issues with installation for order ${purchase.purchaseID}. Immediate attention required.`;
          priority = 'high';
          break;

        case 'issue_reported':
          // Notify management about issues
          const issueManagement = await User.find({ 
            role: { $in: ['product_head', 'service_engineer'] } 
          });
          recipients = issueManagement.map(user => user._id);
          title = 'Installation Issue Reported';
          message = `Service engineer has reported an issue during installation for order ${purchase.purchaseID}`;
          priority = 'high';
          break;
      }

      // Remove duplicates and sender from recipients
      recipients = [...new Set(recipients.map(id => id.toString()))];
      if (sender) {
        recipients = recipients.filter(id => id !== sender._id.toString());
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
              purchaseId: purchase._id,
              purchaseID: purchase.purchaseID,
              installationStatus: purchase.installationStatus,
              engineerName: sender?.name || purchase.assignedEngineerId?.name,
              customerId: purchase.customerId._id || purchase.customerId
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating installation notification:', error);
      throw error;
    }
  }

  // Create enquiry notification (Front Office Executive workflows)
  static async createEnquiryNotification(type, enquiry, sender = null, additionalData = {}) {
    try {
      let recipients = [];
      let title = '';
      let message = '';
      let priority = 'medium';

      switch (type) {
        case 'enquiry_created':
          // Notify sales heads and managers about new enquiries
          const salesManagement = await User.find({ 
            role: { $in: ['sales_head', 'front_office_executive'] }
          });
          recipients = salesManagement
            .filter(user => user._id.toString() !== sender?._id?.toString())
            .map(user => user._id);
          title = 'New Enquiry Created';
          message = `New enquiry from ${enquiry.firstName} ${enquiry.lastName || ''} (${enquiry.phone}) created by ${sender?.name || 'Front Office'}`;
          priority = 'medium';
          break;

        case 'enquiry_assigned':
          // Notify the assigned salesperson
          if (enquiry.assignedTo) {
            recipients = [enquiry.assignedTo];
            title = 'New Lead Assigned to You';
            message = `You have been assigned a new lead: ${enquiry.firstName} ${enquiry.lastName || ''} from enquiry. Please complete the lead information.`;
            priority = 'high';
          }
          break;

        case 'enquiry_converted':
          // Notify front office executives about successful conversions
          const frontOfficeTeam = await User.find({ role: 'front_office_executive' });
          recipients = frontOfficeTeam.map(user => user._id);
          title = 'Enquiry Successfully Converted';
          message = `Enquiry for ${enquiry.firstName} ${enquiry.lastName || ''} has been converted to a lead and assigned to ${additionalData.assigneeName || 'sales team'}`;
          priority = 'low';
          break;
      }

      // Remove duplicates and sender from recipients
      recipients = [...new Set(recipients.map(id => id.toString()))];
      if (sender) {
        recipients = recipients.filter(id => id !== sender._id.toString());
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
              enquiryId: enquiry._id,
              firstName: enquiry.firstName,
              lastName: enquiry.lastName,
              phone: enquiry.phone,
              leadSource: enquiry.leadSource,
              assignmentStatus: enquiry.assignmentStatus,
              ...additionalData
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating enquiry notification:', error);
      throw error;
    }
  }

  // Create lead notification (Sales workflows)
  static async createLeadWorkflowNotification(type, lead, sender = null, additionalData = {}) {
    try {
      let recipients = [];
      let title = '';
      let message = '';
      let priority = 'medium';

      switch (type) {
        case 'lead_created':
          // Notify sales heads about new leads
          const salesHeads = await User.find({ role: 'sales_head' });
          recipients = salesHeads.map(user => user._id);
          title = 'New Lead Created';
          message = `New lead "${lead.firstName} ${lead.lastName || ''}" created by ${sender?.name || 'System'}`;
          priority = 'medium';
          break;

        case 'lead_updated':
          // Notify sales heads about lead updates
          const salesManagement = await User.find({ role: 'sales_head' });
          recipients = salesManagement
            .filter(user => user._id.toString() !== sender?._id?.toString())
            .map(user => user._id);
          title = 'Lead Updated';
          message = `Lead "${lead.firstName} ${lead.lastName || ''}" has been updated by ${sender?.name || 'Sales Person'}`;
          priority = 'low';
          break;

        case 'lead_follow_up':
          // Notify assigned salesperson about follow-up reminders
          if (lead.createdBy) {
            recipients = [lead.createdBy];
            title = 'Lead Follow-up Reminder';
            message = `Follow-up required for lead: ${lead.firstName} ${lead.lastName || ''} (${lead.phone})`;
            priority = 'high';
          }
          break;
      }

      // Remove duplicates and sender from recipients
      recipients = [...new Set(recipients.map(id => id.toString()))];
      if (sender) {
        recipients = recipients.filter(id => id !== sender._id.toString());
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
              leadId: lead._id,
              firstName: lead.firstName,
              lastName: lead.lastName,
              phone: lead.phone,
              email: lead.email,
              status: lead.status,
              leadSource: lead.leadSource, // Lead source (how they found us)
              leadType: lead.leadType, // Lead type (customer type)
              ...additionalData
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating lead workflow notification:', error);
      throw error;
    }
  }

  // Enhanced quotation notifications for sales workflows
  static async createQuotationWorkflowNotification(type, quotation, sender = null, additionalData = {}) {
    try {
      let recipients = [];
      let title = '';
      let message = '';
      let priority = 'medium';

      switch (type) {
        case 'quotation_created':
          // Notify sales heads and accounts department
          const relevantUsers = await User.find({ 
            role: { $in: ['sales_head', 'accounts_department'] }
          });
          recipients = relevantUsers.map(user => user._id);
          title = 'New Quotation Created';
          message = `Quotation #${quotation.quotationNumber} created by ${sender?.name || 'Sales Team'}`;
          priority = 'medium';
          break;

        case 'quotation_updated':
          // Notify sales heads about quotation updates
          const salesHeads = await User.find({ role: 'sales_head' });
          recipients = salesHeads
            .filter(user => user._id.toString() !== sender?._id?.toString())
            .map(user => user._id);
          title = 'Quotation Updated';
          message = `Quotation #${quotation.quotationNumber} has been updated`;
          priority = 'low';
          break;

        case 'quotation_expired':
          // Notify salesperson and sales heads about expired quotations
          recipients = [quotation.createdBy];
          const salesManagement = await User.find({ role: 'sales_head' });
          recipients.push(...salesManagement.map(user => user._id));
          title = 'Quotation Expired';
          message = `Quotation #${quotation.quotationNumber} has expired. Follow-up required.`;
          priority = 'high';
          break;
      }

      // Remove duplicates and sender from recipients
      recipients = [...new Set(recipients.map(id => id.toString()))];
      if (sender) {
        recipients = recipients.filter(id => id !== sender._id.toString());
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
              totalAmount: quotation.total || quotation.totalAmount,
              validUntil: quotation.validUntil,
              ...additionalData
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating quotation workflow notification:', error);
      throw error;
    }
  }

  // Create task reminders and performance alerts
  static async createTaskNotification(type, data, recipients, sender = null) {
    try {
      let title = '';
      let message = '';
      let priority = 'medium';

      switch (type) {
        case 'task_reminder':
          title = data.title || 'Task Reminder';
          message = data.message || 'You have pending tasks that require attention';
          priority = data.priority || 'medium';
          break;

        case 'performance_alert':
          title = 'Performance Alert';
          message = data.message || 'Performance metrics require your attention';
          priority = 'high';
          break;

        case 'sla_breach':
          title = 'SLA Breach Alert';
          message = data.message || 'Service Level Agreement breach detected';
          priority = 'urgent';
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
            data: data.additionalData || {}
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating task notification:', error);
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
        leadNotifications,
        enquiryNotifications,
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
        Notification.countDocuments({ 
          recipient: userId, 
          type: { $regex: '^lead_' }, 
          read: false 
        }),
        Notification.countDocuments({ 
          recipient: userId, 
          type: { $regex: '^enquiry_' }, 
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
          quotations: quotationNotifications,
          leads: leadNotifications,
          enquiries: enquiryNotifications
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

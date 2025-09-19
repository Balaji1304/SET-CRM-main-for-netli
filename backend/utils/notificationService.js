const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendServiceEngineerWhatsApp, sendSalesTeamWhatsApp, sendAccountsTeamWhatsApp } = require('./sendNotification');

// Helper function to generate redirect URLs based on notification type and data
const getRedirectUrl = (type, data = {}) => {
  switch (type) {
    // Ticket notifications
    case 'ticket_created':
    case 'ticket_assigned':
    case 'ticket_status_changed':
    case 'ticket_commented':
      return `/dashboard/ticket-queue`;
    
    // Purchase order notifications
    case 'purchase_order_created':
    case 'purchase_order_updated':
    case 'order_update':
      return `/dashboard/orders`;
    
    // Quotation notifications
    case 'quotation_created':
    case 'quotation_updated':
    case 'quotation_approved':
    case 'quotation_rejected':
    case 'quotation_expired':
      return data.quotationId ? `/dashboard/quotations/${data.quotationId}` : `/dashboard/quotations`;
    
    // Payment notifications
    case 'payment_received':
    case 'payment_failed':
    case 'payment_pending':
      return `/dashboard/payments`;
    
    // Lead notifications - route depends on user role
    case 'lead_created':
    case 'lead_assigned':
    case 'lead_updated':
    case 'lead_follow_up':
    case 'follow_up_reminder':
    case 'hot_lead_alert':
      return `/dashboard/leads`; // Changed to leads page which is accessible to sales_person, sales_head, front_office_executive
    
    // Sales notifications
    case 'quotation_pending_approval':
      return `/dashboard/quotations`;
    
    // Enquiry notifications
    case 'enquiry_created':
    case 'enquiry_assigned':
    case 'enquiry_converted':
      return `/dashboard/enquiry`;
    
    // Accounts notifications
    case 'payment_overdue':
    case 'invoice_due_soon':
      return `/dashboard/payments`;
    
    // Installation notifications
    case 'engineer_assigned':
    case 'assignment_accepted':
    case 'installation_completed':
    case 'installation_scheduled':
    case 'installation_rescheduled':
    case 'customer_approved':
    case 'customer_rejected':
    case 'issue_reported':
      return `/dashboard/installations`;
    
    // Task and performance notifications
    case 'task_reminder':
      return `/dashboard/performance`;
    case 'performance_alert':
    case 'sla_breach':
      return `/dashboard/reports`;
    
    // System notifications
    case 'system_announcement':
      return `/dashboard/notifications`;
    
    default:
      return `/dashboard/notifications`;
  }
};

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
          // Notify front office executives about new tickets
          const frontOfficeExecutives = await User.find({ role: 'front_office_executive' });
          recipients = frontOfficeExecutives.filter(user => user._id).map(user => user._id);
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
          recipients = [];
          if (ticket.user) {
            recipients.push(ticket.user);
          }
          if (ticket.assignedEngineerId) {
            recipients.push(ticket.assignedEngineerId);
          }
          title = 'Ticket Status Updated';
          message = `Ticket "${ticket.title}" status changed to ${ticket.status.replace('_', ' ')}`;
          break;

        case 'ticket_commented':
          // Notify ticket owner and assigned engineer (excluding the commenter)
          recipients = [];
          if (ticket.user) {
            recipients.push(ticket.user);
          }
          if (ticket.assignedEngineerId && ticket.assignedEngineerId.toString() !== sender?._id?.toString()) {
            recipients.push(ticket.assignedEngineerId);
          }
          // Remove sender from recipients
          if (sender) {
            recipients = recipients.filter(id => id.toString() !== sender._id.toString());
          }
          title = 'New Comment on Ticket';
          message = `${sender?.name || 'Someone'} commented on ticket "${ticket.title}"`;
          break;
      }

      // Filter out null/undefined recipients
      recipients = recipients.filter(id => id !== null && id !== undefined);

      // Create notifications for all recipients
      if (recipients.length === 0) {
        console.warn(`No valid recipients found for ${type} notification`);
        return [];
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
              ticketId: ticket._id,
              ticketTitle: ticket.title,
              ticketStatus: ticket.status,
              ticketPriority: ticket.priority,
              redirectUrl: getRedirectUrl(type, { ticketId: ticket._id }),
              entityId: ticket._id,
              entityType: 'ticket',
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
          // Notify inventory managers, sales heads, marketing coordinators, and accounts department
          const relevantUsers = await User.find({ 
            role: { $in: ['sales_head', 'marketing_coordinator', 'accounts_department'] }
          });
          recipients = relevantUsers.filter(user => user._id).map(user => user._id);
          title = 'New Purchase Order Created';
          message = `Purchase order #${purchaseOrder.orderNumber || purchaseOrder._id} has been created`;
          priority = 'high';
          break;

        case 'purchase_order_updated':
          // Notify relevant stakeholders
          const stakeholders = await User.find({ 
            role: { $in: ['sales_head', 'marketing_coordinator'] }
          });
          recipients = stakeholders.filter(user => user._id).map(user => user._id);
          title = 'Purchase Order Updated';
          message = `Purchase order #${purchaseOrder.orderNumber || purchaseOrder._id} has been updated`;
          break;

        case 'order_accepted':
          // Notify marketing coordinators, relevant stakeholders, and customer
          const acceptanceStakeholders = await User.find({ 
            role: { $in: ['marketing_coordinator', 'sales_head'] }
          });
          recipients = acceptanceStakeholders.filter(user => user._id).map(user => user._id);
          
          // Also notify the customer if they have a user account
          if (purchaseOrder.customerId && purchaseOrder.customerId.user) {
            recipients.push(purchaseOrder.customerId.user);
          }
          
          title = 'Order Accepted by Production';
          message = `Order #${purchaseOrder.purchaseID} has been accepted by production and is scheduled for dispatch`;
          priority = 'high';
          break;
      }

      // Filter out null/undefined recipients
      recipients = recipients.filter(id => id !== null && id !== undefined);

      if (recipients.length === 0) {
        console.warn(`No valid recipients found for ${type} notification`);
        return [];
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
              totalAmount: purchaseOrder.totalAmount,
              redirectUrl: getRedirectUrl(type, { purchaseOrderId: purchaseOrder._id }),
              entityId: purchaseOrder._id,
              entityType: 'purchase_order'
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
          recipients = [];
          if (quotation.customer) {
            recipients.push(quotation.customer);
          }
          const salesTeam = await User.find({ role: { $in: ['sales_person', 'sales_head', 'marketing_coordinator'] } });
          recipients.push(...salesTeam.filter(user => user._id).map(user => user._id));
          title = 'Quotation Approved';
          message = `Quotation #${quotation.quotationNumber} has been approved`;
          priority = 'high';
          break;

        case 'quotation_rejected':
          recipients = [];
          if (quotation.customer) {
            recipients.push(quotation.customer);
          }
          title = 'Quotation Requires Attention';
          message = `Quotation #${quotation.quotationNumber} needs review`;
          break;
      }

      // Filter out null/undefined recipients
      recipients = recipients.filter(id => id !== null && id !== undefined);

      if (recipients.length === 0) {
        console.warn(`No valid recipients found for ${type} notification`);
        return [];
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
              totalAmount: quotation.totalAmount,
              redirectUrl: getRedirectUrl(type, { quotationId: quotation._id }),
              entityId: quotation._id,
              entityType: 'quotation'
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
      let recipients = relevantUsers.filter(user => user._id).map(user => user._id);

      // Filter out null/undefined recipients
      recipients = recipients.filter(id => id !== null && id !== undefined);

      if (recipients.length === 0) {
        console.warn('No valid recipients found for payment notification');
        return [];
      }

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
              status: payment.status,
              redirectUrl: getRedirectUrl('payment_received'),
              entityId: payment._id,
              entityType: 'payment'
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
      if (!assignedTo) {
        console.warn('No assignedTo user provided for lead notification');
        return [];
      }

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
          email: lead.email,
          redirectUrl: getRedirectUrl('lead_assigned', { leadId: lead._id }),
          entityId: lead._id,
          entityType: 'lead'
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
          recipients = [];
          if (purchase.assignedEngineerId) {
            recipients.push(purchase.assignedEngineerId);
          }
          title = 'New Installation Assignment';
          message = `You have been assigned to install products for order ${purchase.purchaseID}. Installation date: ${new Date(purchase.installationDate).toLocaleDateString()}`;
          priority = 'high';
          break;

        case 'assignment_accepted':
          // Notify customer and management
          recipients = [];
          // Notify customer using their User ID
          if (purchase.customerId && purchase.customerId.user) {
            recipients.push(purchase.customerId.user);
          }
          const management = await User.find({ role: { $in: ['product_head', 'marketing_coordinator'] } });
          recipients.push(...management.filter(user => user._id).map(user => user._id));
          title = 'Installation Assignment Accepted';
          message = `Service engineer ${sender?.name || 'Engineer'} has accepted the installation assignment for order ${purchase.purchaseID}`;
          priority = 'medium';
          break;

        case 'installation_completed':
          // Notify customer for sign-off
          recipients = [];
          // Notify customer using their User ID
          if (purchase.customerId && purchase.customerId.user) {
            recipients.push(purchase.customerId.user);
          }
          title = 'Installation Completed - Action Required';
          message = `Your installation for order ${purchase.purchaseID} has been completed. Please review and provide feedback.`;
          priority = 'high';
          break;

        case 'installation_scheduled':
          // Notify assigned engineer and customer about scheduled installation
          recipients = [];
          if (purchase.assignedEngineerId) {
            recipients.push(purchase.assignedEngineerId);
          }
          // Also notify customer using their User ID
          if (purchase.customerId && purchase.customerId.user) {
            recipients.push(purchase.customerId.user);
          }
          title = 'Installation Scheduled';
          message = `Installation for order ${purchase.purchaseID} has been scheduled for ${new Date(purchase.installationDate).toLocaleDateString()}`;
          priority = 'medium';
          break;

        case 'customer_approved':
          // Notify engineer and management
          recipients = [];
          if (purchase.assignedEngineerId) {
            recipients.push(purchase.assignedEngineerId);
          }
          const approvalManagement = await User.find({ 
            role: { $in: ['product_head', 'accounts_department'] } 
          });
          recipients.push(...approvalManagement.filter(user => user._id).map(user => user._id));
          title = 'Installation Approved by Customer';
          message = `Customer has approved the installation for order ${purchase.purchaseID}. Order is now complete.`;
          priority = 'medium';
          break;

        case 'customer_rejected':
          // Notify engineer and management
          recipients = [];
          if (purchase.assignedEngineerId) {
            recipients.push(purchase.assignedEngineerId);
          }
          const rejectionManagement = await User.find({ 
            role: { $in: ['product_head', 'service_engineer'] } 
          });
          recipients.push(...rejectionManagement.filter(user => user._id).map(user => user._id));
          title = 'Installation Issues Reported';
          message = `Customer has reported issues with installation for order ${purchase.purchaseID}. Immediate attention required.`;
          priority = 'high';
          break;

        case 'issue_reported':
          // Notify management about issues
          const issueManagement = await User.find({ 
            role: { $in: ['product_head', 'service_engineer'] } 
          });
          recipients = issueManagement.filter(user => user._id).map(user => user._id);
          title = 'Installation Issue Reported';
          message = `Service engineer has reported an issue during installation for order ${purchase.purchaseID}`;
          priority = 'high';
          break;
      }

      // Filter out null/undefined recipients and remove duplicates
      recipients = recipients.filter(id => id !== null && id !== undefined);
      recipients = [...new Set(recipients.map(id => id.toString()))];
      
      if (sender) {
        recipients = recipients.filter(id => id !== sender._id.toString());
      }

      if (recipients.length === 0) {
        console.warn(`No valid recipients found for ${type} notification`);
        return [];
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
              customerId: purchase.customerId?._id || purchase.customerId,
              redirectUrl: getRedirectUrl(type, { purchaseId: purchase._id }),
              entityId: purchase._id,
              entityType: 'installation'
            }
          })
        )
      );

      // Send WhatsApp notifications to service engineers for critical events
      await this.sendWhatsAppToServiceEngineers(type, purchase, sender);

      return notifications;
    } catch (error) {
      console.error('Error creating installation notification:', error);
      throw error;
    }
  }

  // Send WhatsApp notifications to service engineers for critical installation events
  static async sendWhatsAppToServiceEngineers(type, purchase, sender = null) {
    try {
      // Only send WhatsApp for specific high-priority events
      const whatsappEnabledEvents = [
        'engineer_assigned',
        'installation_scheduled', 
        'installation_rescheduled',
        'customer_rejected',
        'issue_reported'
      ];

      if (!whatsappEnabledEvents.includes(type)) {
        return; // Skip WhatsApp for this event type
      }

      let targetEngineers = [];
      let whatsappType = '';
      let whatsappData = {};

      // Populate customer and purchase data
      const customerData = purchase.customerId;
      const customerName = customerData.firstName 
        ? `${customerData.firstName} ${customerData.lastName || ''}` 
        : customerData.name || 'Customer';
      const customerPhone = customerData.phone || customerData.whatsapp || 'Not provided';
      const customerAddress = customerData.address || 'Address not provided';
      const installationDate = purchase.installationDate 
        ? new Date(purchase.installationDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : 'Not scheduled';

      switch (type) {
        case 'engineer_assigned':
          // Send WhatsApp to newly assigned engineer
          if (purchase.assignedEngineerId) {
            const engineer = await User.findById(purchase.assignedEngineerId);
            if (engineer) {
              targetEngineers = [engineer];
              whatsappType = 'installation_assignment';
              whatsappData = {
                customerName,
                customerPhone,
                customerAddress,
                installationDate,
                orderNumber: purchase.purchaseID
              };
            }
          }
          break;

        case 'installation_scheduled':
        case 'installation_rescheduled':
          // Send WhatsApp to assigned engineer about schedule changes
          if (purchase.assignedEngineerId) {
            const engineer = await User.findById(purchase.assignedEngineerId);
            if (engineer) {
              targetEngineers = [engineer];
              whatsappType = 'installation_scheduled';
              whatsappData = {
                customerName,
                installationDate,
                orderNumber: purchase.purchaseID
              };
            }
          }
          break;

        case 'customer_rejected':
          // Send urgent WhatsApp to assigned engineer about customer issues
          if (purchase.assignedEngineerId) {
            const engineer = await User.findById(purchase.assignedEngineerId);
            if (engineer) {
              targetEngineers = [engineer];
              whatsappType = 'urgent_customer_contact';
              whatsappData = {
                customerName,
                customerPhone,
                message: 'Customer has reported issues with the installation. Please contact immediately.',
                orderNumber: purchase.purchaseID
              };
            }
          }
          break;

        case 'issue_reported':
          // Notify all service engineers about reported issues (for awareness)
          const allEngineers = await User.find({ role: 'service_engineer' });
          targetEngineers = allEngineers;
          whatsappType = 'custom_message';
          whatsappData = {
            message: `⚠️ ISSUE ALERT\n\nInstallation issue reported for Order #${purchase.purchaseID}\nCustomer: ${customerName}\n\nPlease check dashboard for details.`
          };
          break;
      }

      // Send WhatsApp to target engineers
      const whatsappPromises = targetEngineers.map(async (engineer) => {
        try {
          const result = await sendServiceEngineerWhatsApp(whatsappType, engineer, whatsappData);
          console.log(`WhatsApp sent to ${engineer.name} for ${type}:`, result.success);
          return result;
        } catch (error) {
          console.error(`Failed to send WhatsApp to ${engineer.name}:`, error);
          return { success: false, error: error.message };
        }
      });

      await Promise.all(whatsappPromises);

    } catch (error) {
      console.error('Error sending WhatsApp to service engineers:', error);
      // Don't throw - WhatsApp failure shouldn't break notification creation
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

      // Filter out null/undefined recipients and remove duplicates
      recipients = recipients.filter(id => id !== null && id !== undefined);
      recipients = [...new Set(recipients.map(id => id.toString()))];
      
      if (sender) {
        recipients = recipients.filter(id => id !== sender._id.toString());
      }

      if (recipients.length === 0) {
        console.warn(`No valid recipients found for ${type} enquiry notification`);
        return [];
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
              redirectUrl: getRedirectUrl(type, { enquiryId: enquiry._id }),
              entityId: enquiry._id,
              entityType: 'enquiry',
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
          // Notify sales heads and marketing coordinators about new leads
          const salesManagement1 = await User.find({ role: { $in: ['sales_head', 'marketing_coordinator'] } });
          recipients = salesManagement1.map(user => user._id);
          title = 'New Lead Created';
          message = `New lead "${lead.firstName} ${lead.lastName || ''}" created by ${sender?.name || 'System'}`;
          priority = 'medium';
          break;

        case 'lead_updated':
          // Notify sales heads and marketing coordinators about lead updates
          const salesManagement2 = await User.find({ role: { $in: ['sales_head', 'marketing_coordinator'] } });
          recipients = salesManagement2
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

      // Filter out null/undefined recipients and remove duplicates
      recipients = recipients.filter(id => id !== null && id !== undefined);
      recipients = [...new Set(recipients.map(id => id.toString()))];
      
      if (sender) {
        recipients = recipients.filter(id => id !== sender._id.toString());
      }

      if (recipients.length === 0) {
        console.warn(`No valid recipients found for ${type} lead notification`);
        return [];
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
              leadType: lead.leadType,
              redirectUrl: getRedirectUrl(type, { leadId: lead._id }),
              entityId: lead._id,
              entityType: 'lead',
              leadSource: lead.leadSource,
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
            role: { $in: ['sales_head', 'marketing_coordinator', 'accounts_department'] }
          });
          recipients = relevantUsers.map(user => user._id);
          title = 'New Quotation Created';
          message = `Quotation #${quotation.quotationNumber} created by ${sender?.name || 'Sales Team'}`;
          priority = 'medium';
          break;

        case 'quotation_updated':
          // Notify sales heads and marketing coordinators about quotation updates
          const salesManagement = await User.find({ role: { $in: ['sales_head', 'marketing_coordinator'] } });
          recipients = salesManagement
            .filter(user => user._id.toString() !== sender?._id?.toString())
            .map(user => user._id);
          title = 'Quotation Updated';
          message = `Quotation #${quotation.quotationNumber} has been updated`;
          priority = 'low';
          break;

        case 'quotation_expired':
          // Notify salesperson and sales management about expired quotations
          recipients = [quotation.createdBy];
          const salesManagement2 = await User.find({ role: { $in: ['sales_head', 'marketing_coordinator'] } });
          recipients.push(...salesManagement2.map(user => user._id));
          title = 'Quotation Expired';
          message = `Quotation #${quotation.quotationNumber} has expired. Follow-up required.`;
          priority = 'high';
          break;
      }

      // Filter out null/undefined recipients and remove duplicates
      recipients = recipients.filter(id => id !== null && id !== undefined);
      recipients = [...new Set(recipients.map(id => id.toString()))];
      
      if (sender) {
        recipients = recipients.filter(id => id !== sender._id.toString());
      }

      if (recipients.length === 0) {
        console.warn(`No valid recipients found for ${type} quotation notification`);
        return [];
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
              redirectUrl: getRedirectUrl(type, { quotationId: quotation._id }),
              entityId: quotation._id,
              entityType: 'quotation',
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

      // Filter out null/undefined recipients
      recipients = recipients.filter(id => id !== null && id !== undefined);

      if (recipients.length === 0) {
        console.warn(`No valid recipients found for ${type} task notification`);
        return [];
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
              redirectUrl: getRedirectUrl(type),
              entityType: 'task',
              ...(data.additionalData || {})
            }
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

  // Create order tracking notification (for customer order updates)
  static async createNotification(notificationData) {
    try {
      if (!notificationData.recipient) {
        console.warn('No recipient provided for notification');
        return null;
      }

      const notification = await Notification.createNotification({
        recipient: notificationData.recipient,
        sender: notificationData.sender || null,
        type: notificationData.type || 'order_update',
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority || 'medium',
        data: {
          redirectUrl: getRedirectUrl(notificationData.type),
          entityType: notificationData.entityType || 'order',
          ...(notificationData.data || {})
        }
      });

      return notification;
    } catch (error) {
      console.error('Error creating direct notification:', error);
      throw error;
    }
  }

  // SALES TEAM NOTIFICATIONS WITH WHATSAPP

  // Create sales team notification with WhatsApp support
  static async createSalesNotification(type, data, sender = null) {
    try {
      let recipients = [];
      let title = '';
      let message = '';
      let priority = 'medium';
      let whatsappData = null;

      switch (type) {
        case 'lead_assigned':
          // Find the assigned sales person
          if (data.assignedTo) {
            recipients = [data.assignedTo];
            const salesPerson = await User.findById(data.assignedTo);
            title = 'New Lead Assigned';
            message = `You have been assigned a new ${data.priority || 'medium'} priority lead: ${data.leadName}`;
            priority = data.priority === 'high' ? 'high' : 'medium';
            
            // Prepare WhatsApp data
            whatsappData = {
              leadName: data.leadName,
              leadPhone: data.leadPhone,
              leadEmail: data.leadEmail,
              leadSource: data.leadSource,
              priority: data.priority || 'medium'
            };

            // Send WhatsApp notification
            if (salesPerson) {
              await sendSalesTeamWhatsApp('lead_assignment', salesPerson, whatsappData);
            }
          }
          break;

        case 'follow_up_reminder':
          // Find the assigned sales person
          if (data.assignedTo) {
            recipients = [data.assignedTo];
            const salesPerson = await User.findById(data.assignedTo);
            title = 'Follow-up Reminder';
            message = `Reminder: Follow up with lead ${data.leadName} (last contact: ${data.daysSinceLastContact} days ago)`;
            priority = 'medium';
            
            // Prepare WhatsApp data
            whatsappData = {
              leadName: data.leadName,
              leadPhone: data.leadPhone,
              daysSinceLastContact: data.daysSinceLastContact
            };

            // Send WhatsApp notification
            if (salesPerson) {
              await sendSalesTeamWhatsApp('follow_up_reminder', salesPerson, whatsappData);
            }
          }
          break;

        case 'quotation_pending_approval':
          // Notify all sales heads and the creator
          const salesHeads = await User.find({ role: 'sales_head' });
          recipients = salesHeads.map(user => user._id);
          if (data.createdBy) {
            recipients.push(data.createdBy);
          }
          title = 'Quotation Pending Approval';
          message = `Quotation ${data.quotationNumber} for ${data.customerName} (₹${data.amount}) is waiting for approval`;
          priority = 'high';
          
          // Prepare WhatsApp data
          whatsappData = {
            quotationNumber: data.quotationNumber,
            customerName: data.customerName,
            amount: data.amount,
            daysWaiting: data.daysWaiting || 0
          };

          // Send WhatsApp to sales heads
          for (const salesHead of salesHeads) {
            await sendSalesTeamWhatsApp('quotation_pending', salesHead, whatsappData);
          }
          break;

        case 'hot_lead_alert':
          // Notify assigned sales person or all sales team if not assigned
          if (data.assignedTo) {
            recipients = [data.assignedTo];
            const salesPerson = await User.findById(data.assignedTo);
            if (salesPerson) {
              await sendSalesTeamWhatsApp('hot_lead_alert', salesPerson, {
                leadName: data.leadName,
                leadPhone: data.leadPhone,
                reason: data.reason
              });
            }
          } else {
            const salesTeam = await User.find({ role: { $in: ['sales_person', 'sales_head'] } });
            recipients = salesTeam.map(user => user._id);
            
            // Send WhatsApp to all sales team
            for (const salesPerson of salesTeam) {
              await sendSalesTeamWhatsApp('hot_lead_alert', salesPerson, {
                leadName: data.leadName,
                leadPhone: data.leadPhone,
                reason: data.reason
              });
            }
          }
          title = 'Hot Lead Alert!';
          message = `URGENT: High-priority lead ${data.leadName} requires immediate attention - ${data.reason}`;
          priority = 'urgent';
          break;
      }

      // Create in-app notifications
      const notifications = await Promise.all(
        recipients.map(recipientId => 
          Notification.createNotification({
            recipient: recipientId,
            sender: sender,
            type: type,
            title: title,
            message: message,
            priority: priority,
            data: {
              redirectUrl: getRedirectUrl(type, data),
              entityType: 'lead',
              ...data
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating sales notification:', error);
      throw error;
    }
  }

  // ACCOUNTS DEPARTMENT NOTIFICATIONS WITH WHATSAPP

  // Create accounts team notification with WhatsApp support
  static async createAccountsNotification(type, data, sender = null) {
    try {
      let recipients = [];
      let title = '';
      let message = '';
      let priority = 'medium';

      // Find accounts department users
      const accountsTeam = await User.find({ role: 'accounts_department' });
      recipients = accountsTeam.map(user => user._id);

      switch (type) {
        case 'payment_received':
          title = 'Payment Received';
          message = `Payment of ₹${data.amount} received from ${data.customerName} for invoice ${data.invoiceNumber}`;
          priority = 'medium';

          // Send WhatsApp notifications
          for (const accountsPerson of accountsTeam) {
            await sendAccountsTeamWhatsApp('payment_received', accountsPerson, {
              customerName: data.customerName,
              amount: data.amount,
              paymentMethod: data.paymentMethod,
              invoiceNumber: data.invoiceNumber
            });
          }
          break;

        case 'payment_overdue':
          title = 'Payment Overdue';
          message = `Payment overdue: ${data.customerName} - ₹${data.amount} (${data.daysOverdue} days overdue)`;
          priority = data.daysOverdue > 30 ? 'urgent' : 'high';

          // Send WhatsApp notifications
          for (const accountsPerson of accountsTeam) {
            await sendAccountsTeamWhatsApp('payment_pending', accountsPerson, {
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              amount: data.amount,
              invoiceNumber: data.invoiceNumber,
              daysOverdue: data.daysOverdue
            });
          }
          break;

        case 'invoice_due_soon':
          title = 'Invoice Due Soon';
          message = `Invoice ${data.invoiceNumber} for ${data.customerName} (₹${data.amount}) due in ${data.daysUntilDue} days`;
          priority = 'medium';

          // Send WhatsApp notifications
          for (const accountsPerson of accountsTeam) {
            await sendAccountsTeamWhatsApp('invoice_due', accountsPerson, {
              customerName: data.customerName,
              amount: data.amount,
              invoiceNumber: data.invoiceNumber,
              dueDate: data.dueDate,
              daysUntilDue: data.daysUntilDue
            });
          }
          break;
      }

      // Create in-app notifications
      const notifications = await Promise.all(
        recipients.map(recipientId => 
          Notification.createNotification({
            recipient: recipientId,
            sender: sender,
            type: type,
            title: title,
            message: message,
            priority: priority,
            data: {
              redirectUrl: getRedirectUrl(type, data),
              entityType: 'payment',
              ...data
            }
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error creating accounts notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;

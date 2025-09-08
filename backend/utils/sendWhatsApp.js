const axios = require('axios');
const NodeCache = require('node-cache');
const tokenManager = require('./whatsappTokenManager');

/**
 * WhatsApp Business API Integration
 * 
 * ACTIVE TEMPLATES (Business verification not required):
 * 1. quotation_ready (UTILITY) - 2 parameters: customerName, quotationNumber
 * 2. invoice_generated (UTILITY) - 4 parameters: customerName, invoiceNumber, amount, dueDate
 * 3. account_created (UTILITY) - 3 parameters: customerName, username, portalUrl
 * 
 * REMOVED TEMPLATES (Requires business verification):
 * - user_verification (AUTHENTICATION) - Removed until business verification complete
 * 
 * TODO: After business verification, re-implement authentication templates for OTP/password delivery
 */

// Cache for API responses and rate limiting (5 mins expiry)
const whatsappCache = new NodeCache({ stdTTL: 300 });

// WhatsApp Cloud API configuration
const WHATSAPP_API_VERSION = 'v19.0';
const WHATSAPP_BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

// Development mode check
const isDevelopmentMode = process.env.NODE_ENV === 'development';
const skipActualSending = process.env.WHATSAPP_DEV_MODE === 'true';

// Utility function to format phone number for WhatsApp
const formatPhoneNumber = (phone, countryCode = '+91') => {
  // Remove all non-numeric characters
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Handle country code
  if (countryCode) {
    const countryCodeClean = countryCode.replace(/\D/g, '');
    // If phone doesn't start with country code, add it
    if (!cleanPhone.startsWith(countryCodeClean)) {
      cleanPhone = countryCodeClean + cleanPhone;
    }
  }
  
  return cleanPhone;
};

// Mock response for development
const createMockResponse = (to, type, templateName = null) => {
  return {
    success: true,
    messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    phone: to,
    response: {
      messaging_product: "whatsapp",
      messages: [{
        id: `wamid.mock_${Date.now()}`
      }]
    },
    isDevelopmentMode: true,
    note: `Message would be sent in production (type: ${type}, template: ${templateName || 'N/A'})`
  };
};

// Send WhatsApp template message
const sendWhatsAppTemplate = async (options) => {
  try {
    const {
      to,
      templateName,
      languageCode = 'en',
      components = [],
      countryCode = '+91'
    } = options;

    // Format phone number
    const formattedPhone = formatPhoneNumber(to, countryCode);

    // Development mode - just log and return mock response
    if (skipActualSending) {
      console.log(`📱 [WHATSAPP DEV] Template message would be sent:`);
      console.log(`   To: ${formattedPhone}`);
      console.log(`   Template: ${templateName}`);
      console.log(`   Components:`, JSON.stringify(components, null, 2));
      return createMockResponse(formattedPhone, 'template', templateName);
    }

    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID not configured');
    }

    // Get a valid access token
    const validAccessToken = await tokenManager.getValidAccessToken();

    // Prepare the message payload
    const messageData = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    };

    // Make API call to WhatsApp
    const response = await axios.post(
      `${WHATSAPP_BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`WhatsApp template message sent successfully to ${formattedPhone}:`, response.data);
    return {
      success: true,
      messageId: response.data.messages[0]?.id,
      phone: formattedPhone,
      response: response.data
    };

  } catch (error) {
    console.error('WhatsApp template message failed:', error.response?.data || error.message);
    throw new Error(`WhatsApp message could not be sent: ${error.response?.data?.error?.message || error.message}`);
  }
};

// Send WhatsApp document message
const sendWhatsAppDocument = async (options) => {
  try {
    const {
      to,
      documentUrl,
      filename,
      caption,
      countryCode = '+91'
    } = options;

    // Format phone number
    const formattedPhone = formatPhoneNumber(to, countryCode);

    // Development mode - just log and return mock response
    if (skipActualSending) {
      console.log(`📄 [WHATSAPP DEV] Document would be sent:`);
      console.log(`   To: ${formattedPhone}`);
      console.log(`   Document: ${filename}`);
      console.log(`   URL: ${documentUrl}`);
      console.log(`   Caption: ${caption}`);
      return createMockResponse(formattedPhone, 'document');
    }

    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
      throw new Error('WHATSAPP_ACCESS_TOKEN not configured');
    }

    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID not configured');
    }

    // Prepare the message payload
    const messageData = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "document",
      document: {
        link: documentUrl,
        filename: filename,
        caption: caption
      }
    };

    // Make API call to WhatsApp
    const response = await axios.post(
      `${WHATSAPP_BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`WhatsApp document sent successfully to ${formattedPhone}:`, response.data);
    return {
      success: true,
      messageId: response.data.messages[0]?.id,
      phone: formattedPhone,
      response: response.data
    };

  } catch (error) {
    console.error('WhatsApp document message failed:', error.response?.data || error.message);
    throw new Error(`WhatsApp document could not be sent: ${error.response?.data?.error?.message || error.message}`);
  }
};

// Send WhatsApp text message (for fallback)
const sendWhatsAppText = async (options) => {
  try {
    const {
      to,
      text,
      countryCode = '+91'
    } = options;

    // Format phone number
    const formattedPhone = formatPhoneNumber(to, countryCode);

    // Development mode - just log and return mock response
    if (skipActualSending) {
      console.log(`💬 [WHATSAPP DEV] Text message would be sent:`);
      console.log(`   To: ${formattedPhone}`);
      console.log(`   Text: ${text}`);
      return createMockResponse(formattedPhone, 'text');
    }

    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
      throw new Error('WHATSAPP_ACCESS_TOKEN not configured');
    }

    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID not configured');
    }

    // Prepare the message payload
    const messageData = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "text",
      text: {
        body: text
      }
    };

    // Make API call to WhatsApp
    const response = await axios.post(
      `${WHATSAPP_BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`WhatsApp text message sent successfully to ${formattedPhone}:`, response.data);
    return {
      success: true,
      messageId: response.data.messages[0]?.id,
      phone: formattedPhone,
      response: response.data
    };

  } catch (error) {
    console.error('WhatsApp text message failed:', error.response?.data || error.message);
    throw new Error(`WhatsApp text message could not be sent: ${error.response?.data?.error?.message || error.message}`);
  }
};

// Helper function to send quotation via WhatsApp
const sendQuotationWhatsApp = async (options) => {
  const { 
    to, 
    customerName, 
    quotationNumber, 
    quotationUrl,
    countryCode 
  } = options;

  // Use pre-approved template for quotation (simplified for testing)
  const components = [
    {
      type: "body",
      parameters: [
        {
          type: "text",
          text: customerName
        },
        {
          type: "text", 
          text: quotationNumber
        }
      ]
    }
  ];

  return await sendWhatsAppTemplate({
    to,
    templateName: 'quotation_ready', // This template needs to be approved by Meta
    components,
    countryCode
  });
};

// Helper function to send invoice via WhatsApp
const sendInvoiceWhatsApp = async (options) => {
  const { 
    to, 
    customerName, 
    invoiceNumber, 
    invoiceUrl,
    amount,
    countryCode 
  } = options;

  // Use pre-approved template for invoice (3 parameters)
  const components = [
    {
      type: "body",
      parameters: [
        {
          type: "text",
          text: customerName
        },
        {
          type: "text",
          text: invoiceNumber
        },
        {
          type: "text",
          text: amount
        }
      ]
    }
  ];

  return await sendWhatsAppTemplate({
    to,
    templateName: 'invoice_generated', // This template needs to be approved by Meta
    components,
    countryCode
  });
};

// Helper function to send account creation notification (Utility template)
const sendAccountCreatedWhatsApp = async (options) => {
  const { 
    to, 
    customerName, 
    loginUsername, // Account identifier/username
    loginUrl, // Portal URL
    countryCode 
  } = options;

  // Use Utility template for account creation notification with username as account identifier
  const components = [
    {
      type: "body",
      parameters: [
        {
          type: "text",
          text: customerName
        },
        {
          type: "text",
          text: loginUsername // Username as account identifier
        },
        {
          type: "text",
          text: loginUrl || process.env.FRONTEND_URL || "your portal"
        }
      ]
    }
  ];

  return await sendWhatsAppTemplate({
    to,
    templateName: 'account_created', // Utility template name
    components,
    countryCode
  });
};

// Helper function to send installation assignment notification via WhatsApp
const sendInstallationAssignmentWhatsApp = async (options) => {
  const { 
    to, 
    engineerName, 
    customerName,
    customerPhone,
    customerAddress,
    installationDate,
    orderNumber,
    countryCode 
  } = options;

  // Use text message for immediate notification (no template approval needed)
  const message = `🔧 *NEW INSTALLATION ASSIGNMENT*\n\n` +
    `Hello ${engineerName},\n\n` +
    `You have been assigned a new installation:\n\n` +
    `📋 Order: #${orderNumber}\n` +
    `👤 Customer: ${customerName}\n` +
    `📞 Phone: ${customerPhone}\n` +
    `📍 Address: ${customerAddress}\n` +
    `📅 Date: ${installationDate}\n\n` +
    `Please log into your dashboard to accept this assignment.\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// Helper function to send installation date scheduled notification
const sendInstallationScheduledWhatsApp = async (options) => {
  const { 
    to, 
    engineerName, 
    customerName,
    installationDate,
    orderNumber,
    countryCode 
  } = options;

  const message = `📅 *INSTALLATION SCHEDULED*\n\n` +
    `Hello ${engineerName},\n\n` +
    `Installation date confirmed:\n\n` +
    `📋 Order: #${orderNumber}\n` +
    `👤 Customer: ${customerName}\n` +
    `📅 Date: ${installationDate}\n\n` +
    `Please be prepared for this installation.\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// Helper function to send installation reminder
const sendInstallationReminderWhatsApp = async (options) => {
  const { 
    to, 
    engineerName, 
    customerName,
    customerPhone,
    installationDate,
    orderNumber,
    countryCode 
  } = options;

  const message = `⏰ *INSTALLATION REMINDER*\n\n` +
    `Hello ${engineerName},\n\n` +
    `Reminder: You have an installation tomorrow:\n\n` +
    `📋 Order: #${orderNumber}\n` +
    `👤 Customer: ${customerName}\n` +
    `📞 Phone: ${customerPhone}\n` +
    `📅 Date: ${installationDate}\n\n` +
    `Please confirm your availability in the dashboard.\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// Helper function to send urgent customer contact notification
const sendUrgentCustomerContactWhatsApp = async (options) => {
  const { 
    to, 
    engineerName, 
    customerName,
    customerPhone,
    message: customerMessage,
    orderNumber,
    countryCode 
  } = options;

  const message = `🚨 *URGENT: CUSTOMER CONTACT*\n\n` +
    `Hello ${engineerName},\n\n` +
    `Customer is trying to reach you:\n\n` +
    `📋 Order: #${orderNumber}\n` +
    `👤 Customer: ${customerName}\n` +
    `📞 Phone: ${customerPhone}\n` +
    `💬 Message: ${customerMessage}\n\n` +
    `Please contact the customer immediately.\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// SALES TEAM WHATSAPP NOTIFICATIONS

// Helper function to send lead assignment notification to sales team
const sendLeadAssignmentWhatsApp = async (options) => {
  const { 
    to, 
    salesPersonName, 
    leadName,
    leadPhone,
    leadEmail,
    leadSource,
    priority,
    countryCode 
  } = options;

  const priorityEmoji = priority === 'high' ? '🔥' : priority === 'medium' ? '⚡' : '📋';
  
  const message = `${priorityEmoji} *NEW LEAD ASSIGNED*\n\n` +
    `Hello ${salesPersonName},\n\n` +
    `You have been assigned a new lead:\n\n` +
    `👤 Name: ${leadName}\n` +
    `📞 Phone: ${leadPhone}\n` +
    `📧 Email: ${leadEmail}\n` +
    `📍 Source: ${leadSource}\n` +
    `⚡ Priority: ${priority.toUpperCase()}\n\n` +
    `Please follow up with this lead as soon as possible.\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// Helper function to send follow-up reminder to sales team
const sendFollowUpReminderWhatsApp = async (options) => {
  const { 
    to, 
    salesPersonName, 
    leadName,
    leadPhone,
    daysSinceLastContact,
    countryCode 
  } = options;

  const message = `⏰ *FOLLOW-UP REMINDER*\n\n` +
    `Hello ${salesPersonName},\n\n` +
    `Reminder: Follow up required for:\n\n` +
    `👤 Lead: ${leadName}\n` +
    `📞 Phone: ${leadPhone}\n` +
    `📅 Last Contact: ${daysSinceLastContact} days ago\n\n` +
    `Please contact this lead today to maintain engagement.\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// Helper function to send quotation pending approval notification
const sendQuotationPendingWhatsApp = async (options) => {
  const { 
    to, 
    salesPersonName, 
    quotationNumber,
    customerName,
    amount,
    daysWaiting,
    countryCode 
  } = options;

  const message = `📋 *QUOTATION PENDING APPROVAL*\n\n` +
    `Hello ${salesPersonName},\n\n` +
    `Quotation waiting for approval:\n\n` +
    `📄 Quotation: #${quotationNumber}\n` +
    `👤 Customer: ${customerName}\n` +
    `💰 Amount: ₹${amount}\n` +
    `⏳ Waiting: ${daysWaiting} days\n\n` +
    `Please follow up with management for approval.\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// Helper function to send hot lead alert to sales team
const sendHotLeadAlertWhatsApp = async (options) => {
  const { 
    to, 
    salesPersonName, 
    leadName,
    leadPhone,
    reason,
    countryCode 
  } = options;

  const message = `🔥 *HOT LEAD ALERT*\n\n` +
    `Hello ${salesPersonName},\n\n` +
    `URGENT: High-priority lead requires immediate attention!\n\n` +
    `👤 Lead: ${leadName}\n` +
    `📞 Phone: ${leadPhone}\n` +
    `🚨 Reason: ${reason}\n\n` +
    `Contact this lead immediately - they are highly interested!\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// ACCOUNTS DEPARTMENT WHATSAPP NOTIFICATIONS

// Helper function to send payment received notification to accounts
const sendPaymentReceivedWhatsApp = async (options) => {
  const { 
    to, 
    accountsPersonName, 
    customerName,
    amount,
    paymentMethod,
    invoiceNumber,
    countryCode 
  } = options;

  const message = `💰 *PAYMENT RECEIVED*\n\n` +
    `Hello ${accountsPersonName},\n\n` +
    `Payment confirmation:\n\n` +
    `👤 Customer: ${customerName}\n` +
    `💵 Amount: ₹${amount}\n` +
    `💳 Method: ${paymentMethod}\n` +
    `📄 Invoice: #${invoiceNumber}\n\n` +
    `Payment has been successfully processed and recorded.\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// Helper function to send payment pending notification to accounts
const sendPaymentPendingWhatsApp = async (options) => {
  const { 
    to, 
    accountsPersonName, 
    customerName,
    customerPhone,
    amount,
    invoiceNumber,
    daysOverdue,
    countryCode 
  } = options;

  const urgencyEmoji = daysOverdue > 30 ? '🚨' : daysOverdue > 15 ? '⚠️' : '📅';
  
  const message = `${urgencyEmoji} *PAYMENT PENDING*\n\n` +
    `Hello ${accountsPersonName},\n\n` +
    `Payment follow-up required:\n\n` +
    `👤 Customer: ${customerName}\n` +
    `📞 Phone: ${customerPhone}\n` +
    `💰 Amount: ₹${amount}\n` +
    `📄 Invoice: #${invoiceNumber}\n` +
    `⏰ Overdue: ${daysOverdue} days\n\n` +
    `Please follow up with customer for payment collection.\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// Helper function to send invoice due notification to accounts
const sendInvoiceDueWhatsApp = async (options) => {
  const { 
    to, 
    accountsPersonName, 
    customerName,
    amount,
    invoiceNumber,
    dueDate,
    daysUntilDue,
    countryCode 
  } = options;

  const message = `📅 *INVOICE DUE REMINDER*\n\n` +
    `Hello ${accountsPersonName},\n\n` +
    `Invoice due soon:\n\n` +
    `👤 Customer: ${customerName}\n` +
    `💰 Amount: ₹${amount}\n` +
    `📄 Invoice: #${invoiceNumber}\n` +
    `📅 Due Date: ${dueDate}\n` +
    `⏳ Days Until Due: ${daysUntilDue}\n\n` +
    `Please send reminder to customer before due date.\n\n` +
    `*Sunlit CRM Team*`;

  return await sendWhatsAppText({
    to,
    text: message,
    countryCode
  });
};

// Test WhatsApp configuration
const testWhatsAppConfig = async () => {
  try {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp configuration missing');
    }

    // In development mode, just return success
    if (skipActualSending) {
      return {
        success: true,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
        status: {
          mode: 'development',
          message: 'WhatsApp API configured but in development mode (not sending actual messages)'
        }
      };
    }

    // Test API endpoint
    const response = await axios.get(
      `${WHATSAPP_BASE_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );

    return {
      success: true,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      status: response.data
    };
  } catch (error) {
    console.error('WhatsApp configuration test failed:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

module.exports = {
  sendWhatsAppTemplate,
  sendWhatsAppDocument,
  sendWhatsAppText,
  sendQuotationWhatsApp,
  sendInvoiceWhatsApp,
  sendAccountCreatedWhatsApp,
  sendInstallationAssignmentWhatsApp,
  sendInstallationScheduledWhatsApp,
  sendInstallationReminderWhatsApp,
  sendUrgentCustomerContactWhatsApp,
  // Sales Team WhatsApp Functions
  sendLeadAssignmentWhatsApp,
  sendFollowUpReminderWhatsApp,
  sendQuotationPendingWhatsApp,
  sendHotLeadAlertWhatsApp,
  // Accounts Department WhatsApp Functions
  sendPaymentReceivedWhatsApp,
  sendPaymentPendingWhatsApp,
  sendInvoiceDueWhatsApp,
  testWhatsAppConfig,
  formatPhoneNumber
}; 
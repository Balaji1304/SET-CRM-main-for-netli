const axios = require('axios');
const NodeCache = require('node-cache');

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

  // Use pre-approved template for quotation
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
        },
        {
          type: "text",
          text: quotationUrl
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

  // Use pre-approved template for invoice
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
        },
        {
          type: "text",
          text: invoiceUrl
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

// Helper function to send welcome credentials via WhatsApp
const sendWelcomeWhatsApp = async (options) => {
  const { 
    to, 
    customerName, 
    email,
    password,
    loginUrl,
    countryCode 
  } = options;

  // Use pre-approved template for welcome message
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
          text: email
        },
        {
          type: "text",
          text: password
        },
        {
          type: "text",
          text: loginUrl
        }
      ]
    }
  ];

  return await sendWhatsAppTemplate({
    to,
    templateName: 'welcome_credentials1', // This template needs to be approved by Meta
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
  sendWelcomeWhatsApp,
  sendInstallationAssignmentWhatsApp,
  sendInstallationScheduledWhatsApp,
  sendInstallationReminderWhatsApp,
  sendUrgentCustomerContactWhatsApp,
  testWhatsAppConfig,
  formatPhoneNumber
}; 
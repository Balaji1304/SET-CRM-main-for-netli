const axios = require('axios');
const FormData = require('form-data');
const NodeCache = require('node-cache');
const tokenManager = require('./whatsappTokenManager');
const waConfig = require('../config/whatsapp');
const WhatsAppMessage = require('../models/WhatsAppMessage');

const logOutbound = (phone, type, templateName, result, error) => {
  const doc = {
    direction: 'outbound',
    to: phone,
    from: waConfig.phoneNumberId,
    type,
    templateName: templateName || undefined,
    wamid: result?.messageId || result?.response?.messages?.[0]?.id,
    status: error ? 'failed' : 'sent',
    context: result?.context
  };
  if (error) {
    doc.error = { message: error.message || String(error) };
  }
  if (result?.isDevelopmentMode) {
    doc.status = 'sent';
    doc.meta = { devMode: true };
  }
  WhatsAppMessage.create(doc).catch(e => console.error('WA log write failed:', e.message));
};

// Cache for API responses and rate limiting (5 mins expiry)
const whatsappCache = new NodeCache({ stdTTL: 300 });

const { baseUrl: WHATSAPP_BASE_URL } = waConfig;
const skipActualSending = waConfig.devMode;

const formatPhoneNumber = (phone, countryCode = '+91') => {
  let digits = phone.replace(/\D/g, '');
  const cc = countryCode.replace(/\D/g, '');
  // Strip leading 0 (trunk prefix)
  if (digits.startsWith('0')) digits = digits.slice(1);
  const localLen = 10; // India default; works for most countries with 10-digit locals
  if (digits.length === localLen) return cc + digits;
  if (digits.length === cc.length + localLen && digits.startsWith(cc)) return digits;
  return digits;
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

// Fetch message templates directly from the WhatsApp Business API template library
const getWhatsAppTemplates = async () => {
  if (skipActualSending || !waConfig.wabaId) {
    if (skipActualSending) {
      console.log('📚 [WHATSAPP DEV] Skipping template library fetch (dev mode)');
    }
    return [];
  }

  const accessToken = tokenManager.getAccessToken();

  const response = await axios.get(
    `${WHATSAPP_BASE_URL}/${waConfig.wabaId}/message_templates`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params: { limit: 1000 },
      timeout: 30000
    }
  );

  const templates = response.data?.data || [];
  whatsappCache.del('waba_templates');
  whatsappCache.set('waba_templates', templates, 300);
  return templates;
};

// Load the approved template library (cached 5 min)
const getCachedWhatsAppTemplates = async () => {
  const cached = whatsappCache.get('waba_templates');
  if (cached) return cached;
  return await getWhatsAppTemplates();
};

// Find an approved template by name from the library
const findWabaTemplate = async (templateName) => {
  const templates = await getCachedWhatsAppTemplates();
  return templates.find(
    (t) => t.name === templateName && (t.status === 'APPROVED' || t.status === 'ACTIVE' || !t.status)
  );
};

// Build a body components payload that matches the template's declared body variables
const buildWhatsAppComponents = (template, values) => {
  if (!template) return [];

  const components = [];
  const body = (template.components || []).find((c) => c.type === 'BODY');
  if (!body) return components;

  const placeholderCount = ((body.text || '').match(/\{\{\d+\}\}/g) || []).length;
  const templateValues = Array.isArray(values) ? values : [];

  if (templateValues.length !== placeholderCount) {
    const err = new Error(
      `Template "${template.name}" expects ${placeholderCount} parameter(s) but received ${templateValues.length}`
    );
    err.code = 'TEMPLATE_PARAM_MISMATCH';
    throw err;
  }

  const parameters = templateValues.map((v) => ({
    type: 'text',
    text: String(v == null || v === '' ? '-' : v)
  }));

  if (parameters.length > 0) {
    components.push({ type: 'body', parameters });
  }

  const header = (template.components || []).find((c) => c.type === 'HEADER');
  if (header && header.format === 'TEXT' && values && values.headerText) {
    components.push({
      type: 'header',
      parameters: [{ type: 'text', text: String(values.headerText) }]
    });
  }

  return components;
};

// Send a template message resolved from the WhatsApp template library.
// Returns { success, source: 'library' } or throws (caller can fall back to text).
const sendLibraryTemplate = async (options) => {
  const { to, templateName, values = [], countryCode = '+91' } = options;

  if (typeof templateName !== 'string' || !templateName) {
    throw new Error('Template name is required to send from the library');
  }

  // In dev mode, skip template lookup (it returns [] in dev) and go straight to the mock
  if (skipActualSending) {
    const result = await sendWhatsAppTemplate({ to, templateName, components: [], countryCode });
    return { ...result, source: 'library', templateName };
  }

  const template = await findWabaTemplate(templateName);
  if (!template) {
    throw new Error(`Template "${templateName}" not found in the WhatsApp template library`);
  }

  const components = buildWhatsAppComponents(template, values);

  const result = await sendWhatsAppTemplate({
    to,
    templateName,
    components,
    languageCode: template.language || 'en_US',
    countryCode
  });

  return { ...result, source: 'library', templateName };
};

// Create (or re-submit) a message template in the WhatsApp template library via the Cloud API.
// Example payload:
//   createWhatsAppTemplate({
//     name: 'lead_assignment',
//     language: 'en',
//     category: 'MARKETING',          // MARKETING | UTILITY | AUTHENTICATION
//     components: [{
//       type: 'BODY',
//       text: 'Hello {{1}},\nYou have a new lead: {{2}}',
//       example: { body_text: [['Sales Rep', 'Acme Corp']] }
//     }],
//     allowCategoryChange: true
//   })
const createWhatsAppTemplate = async ({
  name,
  language = 'en_US',
  category = 'UTILITY',
  components = [],
  allowCategoryChange = true
}) => {
  if (skipActualSending) {
    console.log(`📚 [WHATSAPP DEV] Skipping template creation (dev mode): ${name}`);
    return { success: true, isDevelopmentMode: true, name };
  }

  if (!waConfig.wabaId) {
    throw new Error('WABA_ID not configured; cannot create WhatsApp templates');
  }

  const accessToken = tokenManager.getAccessToken();

  const response = await axios.post(
    `${WHATSAPP_BASE_URL}/${waConfig.wabaId}/message_templates`,
    {
      name,
      language,
      category,
      components
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params: allowCategoryChange ? { 'allow_category_change': 'true' } : {},
      timeout: 30000
    }
  );

  // Invalidate the local template cache so new templates are picked up
  whatsappCache.del('waba_templates');

  console.log(`✅ WhatsApp template "${name}" submitted:`, response.data.id);
  return { success: true, id: response.data?.id, name, status: 'SUBMITTED' };
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
      const mockResult = createMockResponse(formattedPhone, 'template', templateName);
      logOutbound(formattedPhone, 'template', templateName, mockResult);
      return mockResult;
    }

    if (!waConfig.phoneNumberId) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID not configured');
    }

    const accessToken = tokenManager.getAccessToken();

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

    const response = await axios.post(
      `${WHATSAPP_BASE_URL}/${waConfig.phoneNumberId}/messages`,
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`WhatsApp template message sent successfully to ${formattedPhone}:`, response.data);
    const result = {
      success: true,
      messageId: response.data.messages[0]?.id,
      phone: formattedPhone,
      response: response.data
    };
    logOutbound(formattedPhone, 'template', templateName, result);
    return result;

  } catch (error) {
    logOutbound(formatPhoneNumber(options.to, options.countryCode), 'template', options.templateName, null, error);
    console.error('WhatsApp template message failed:', error.response?.data || error.message);
    throw new Error(`WhatsApp message could not be sent: ${error.response?.data?.error?.message || error.message}`);
  }
};

const uploadWhatsAppMedia = async (buffer, filename, mimeType = 'application/pdf') => {
  if (skipActualSending) {
    console.log(`📤 [WHATSAPP DEV] Media upload skipped (dev mode): ${filename}`);
    return { mediaId: 'dev-media-id', filename };
  }

  const accessToken = tokenManager.getAccessToken();
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('file', buffer, { filename, contentType: mimeType });
  form.append('type', mimeType);

  const response = await axios.post(
    `${WHATSAPP_BASE_URL}/${waConfig.phoneNumberId}/media`,
    form,
    {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${accessToken}` },
      timeout: 60000
    }
  );

  return { mediaId: response.data.id, filename };
};

// Send WhatsApp document message (accepts documentUrl OR mediaId)
const sendWhatsAppDocument = async (options) => {
  try {
    const {
      to,
      documentUrl,
      mediaId,
      filename,
      caption,
      countryCode = '+91'
    } = options;

    const formattedPhone = formatPhoneNumber(to, countryCode);

    if (skipActualSending) {
      console.log(`📄 [WHATSAPP DEV] Document would be sent:`);
      console.log(`   To: ${formattedPhone}`);
      console.log(`   Document: ${filename}`);
      console.log(`   Source: ${mediaId ? 'uploaded media' : documentUrl}`);
      return createMockResponse(formattedPhone, 'document');
    }

    const accessToken = tokenManager.getAccessToken();

    if (!waConfig.phoneNumberId) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID not configured');
    }

    const doc = mediaId ? { id: mediaId } : { link: documentUrl };
    doc.filename = filename;
    if (caption) doc.caption = caption;

    const response = await axios.post(
      `${WHATSAPP_BASE_URL}/${waConfig.phoneNumberId}/messages`,
      { messaging_product: 'whatsapp', to: formattedPhone, type: 'document', document: doc },
      {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    console.log(`WhatsApp document sent successfully to ${formattedPhone}:`, response.data);
    const result = {
      success: true,
      messageId: response.data.messages[0]?.id,
      phone: formattedPhone,
      response: response.data
    };
    logOutbound(formattedPhone, 'document', null, result);
    return result;

  } catch (error) {
    logOutbound(formatPhoneNumber(options.to, options.countryCode), 'document', null, null, error);
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

    const accessToken = tokenManager.getAccessToken();

    if (!waConfig.phoneNumberId) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID not configured');
    }

    const messageData = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "text",
      text: {
        body: text
      }
    };

    const response = await axios.post(
      `${WHATSAPP_BASE_URL}/${waConfig.phoneNumberId}/messages`,
      messageData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`WhatsApp text message sent successfully to ${formattedPhone}:`, response.data);
    const result = {
      success: true,
      messageId: response.data.messages[0]?.id,
      phone: formattedPhone,
      response: response.data
    };
    logOutbound(formattedPhone, 'text', null, result);
    return result;

  } catch (error) {
    logOutbound(formatPhoneNumber(options.to, options.countryCode), 'text', null, null, error);
    console.error('WhatsApp text message failed:', error.response?.data || error.message);
    throw new Error(`WhatsApp text message could not be sent: ${error.response?.data?.error?.message || error.message}`);
  }
};

const sendQuotationWhatsApp = async (options) => {
  const { to, customerName, quotationNumber, countryCode } = options;
  return sendLibraryTemplate({
    to,
    templateName: 'quotation_ready_v2',
    values: [customerName, quotationNumber],
    countryCode
  });
};

const sendInvoiceWhatsApp = async (options) => {
  const { to, customerName, invoiceNumber, amount, dueDate, countryCode } = options;
  return sendLibraryTemplate({
    to,
    templateName: 'invoice_generated_v2',
    values: [customerName, invoiceNumber, amount, dueDate],
    countryCode
  });
};

const sendAccountCreatedWhatsApp = async (options) => {
  const { to, customerName, loginUsername, loginUrl, countryCode } = options;
  return sendLibraryTemplate({
    to,
    templateName: 'account_created',
    values: [customerName, loginUsername, loginUrl || process.env.FRONTEND_URL || 'your portal'],
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
    if (!waConfig.accessToken || !waConfig.phoneNumberId) {
      throw new Error('WhatsApp configuration missing');
    }

    if (skipActualSending) {
      return {
        success: true,
        phoneNumberId: waConfig.phoneNumberId,
        status: {
          mode: 'development',
          message: 'WhatsApp API configured but in development mode (not sending actual messages)'
        }
      };
    }

    const accessToken = tokenManager.getAccessToken();
    const response = await axios.get(
      `${WHATSAPP_BASE_URL}/${waConfig.phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return {
      success: true,
      phoneNumberId: waConfig.phoneNumberId,
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

// Customer lifecycle templates
const sendTicketCreatedWhatsApp = async ({ to, customerName, ticketNumber, countryCode = '+91' }) => {
  return sendLibraryTemplate({ to, templateName: 'ticket_created', values: [customerName, ticketNumber], countryCode });
};

const sendTicketUpdatedWhatsApp = async ({ to, customerName, ticketNumber, status, details = '', countryCode = '+91' }) => {
  return sendLibraryTemplate({ to, templateName: 'ticket_updated', values: [customerName, ticketNumber, status, details], countryCode });
};

const sendTicketResolvedWhatsApp = async ({ to, customerName, ticketNumber, countryCode = '+91' }) => {
  return sendLibraryTemplate({ to, templateName: 'ticket_resolved', values: [customerName, ticketNumber], countryCode });
};

const sendOrderTrackingWhatsApp = async ({ to, customerName, orderNumber, status, expectedDelivery = '-', countryCode = '+91' }) => {
  return sendLibraryTemplate({ to, templateName: 'order_tracking_update', values: [customerName, orderNumber, status, expectedDelivery], countryCode });
};

const sendPaymentReceiptWhatsApp = async ({ to, customerName, amount, reference, transactionRef = '-', countryCode = '+91' }) => {
  return sendLibraryTemplate({ to, templateName: 'payment_receipt', values: [customerName, amount, reference, transactionRef], countryCode });
};

const sendPaymentReminderWhatsApp = async ({ to, customerName, amount, reference, dueDate, countryCode = '+91' }) => {
  return sendLibraryTemplate({ to, templateName: 'payment_reminder', values: [customerName, amount, reference, dueDate], countryCode });
};

const sendInstallationCompletedWhatsApp = async ({ to, customerName, orderNumber, countryCode = '+91' }) => {
  return sendLibraryTemplate({ to, templateName: 'installation_completed', values: [customerName, orderNumber], countryCode });
};

module.exports = {
  sendWhatsAppTemplate,
  uploadWhatsAppMedia,
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
  // Customer Lifecycle
  sendTicketCreatedWhatsApp,
  sendTicketUpdatedWhatsApp,
  sendTicketResolvedWhatsApp,
  sendOrderTrackingWhatsApp,
  sendPaymentReceiptWhatsApp,
  sendPaymentReminderWhatsApp,
  sendInstallationCompletedWhatsApp,
  // Template library support
  getWhatsAppTemplates,
  getCachedWhatsAppTemplates,
  findWabaTemplate,
  sendLibraryTemplate,
  createWhatsAppTemplate,
  testWhatsAppConfig,
  formatPhoneNumber,
  isWindowOpen
};

function isWindowOpen(lastInboundAt) {
  if (!lastInboundAt) return false;
  return (Date.now() - new Date(lastInboundAt).getTime()) < 24 * 60 * 60 * 1000;
} 
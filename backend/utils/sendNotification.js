/**
 * Multi-channel Notification Service
 * 
 * Supports email + WhatsApp notifications
 * 
 * CURRENT WHATSAPP TEMPLATES:
 * - quotation_ready (utility)
 * - invoice_generated (utility) 
 * - account_created (utility)
 * 
 * NOTE: Authentication templates removed until business verification complete
 * Welcome notifications now only send account creation (no password/OTP via WhatsApp)
 */

const sendEmail = require('./sendEmail');
const {
  sendQuotationWhatsApp,
  sendInvoiceWhatsApp,
  sendAccountCreatedWhatsApp,
  uploadWhatsAppMedia,
  sendWhatsAppDocument,
  sendWhatsAppText,
  sendLibraryTemplate,
  sendTicketCreatedWhatsApp,
  sendTicketUpdatedWhatsApp,
  sendTicketResolvedWhatsApp,
  sendOrderTrackingWhatsApp,
  sendPaymentReceiptWhatsApp,
  sendPaymentReminderWhatsApp,
  sendInstallationCompletedWhatsApp
} = require('./sendWhatsApp');

// Determine available contact methods for a customer using preferredContactMethod
const getAvailableContactMethods = (customer) => {
  // Use the preferredContactMethod field that's already calculated in the Lead model
  // The Lead model ensures this field is always set, so no fallback needed
  switch (customer.preferredContactMethod) {
    case 'both':
      return ['email', 'whatsapp'];
    case 'email':
      return ['email'];
    case 'whatsapp':
      return ['whatsapp'];
    default:
      throw new Error(`Invalid preferredContactMethod: ${customer.preferredContactMethod} for customer ${customer.firstName} ${customer.lastName}`);
  }
};

// Send notification via multiple channels
const sendNotification = async (options) => {
  const {
    customer, // Customer object with email, whatsapp, phone, etc.
    type, // 'quotation', 'invoice', 'welcome', 'custom'
    data, // Template data
    preferences = ['email', 'whatsapp'], // Preferred channels
    attachments = [], // For email attachments
    documentUrl = null, // For WhatsApp documents (public URL)
    pdfBuffer = null, // For WhatsApp documents (uploaded via media API)
    pdfFilename = null // Filename when using pdfBuffer
  } = options;

  const results = {
    email: { attempted: false, success: false, error: null },
    whatsapp: { attempted: false, success: false, error: null }
  };

  let availableMethods = getAvailableContactMethods(customer);
  let channels = preferences;
  // Opted-out contacts never get WhatsApp; email replaces it when they have an address
  if (customer.whatsappOptIn === false) {
    availableMethods = availableMethods.filter(m => m !== 'whatsapp');
    if (customer.email && preferences.includes('whatsapp')) {
      if (!availableMethods.includes('email')) availableMethods.push('email');
      channels = [...new Set([...preferences, 'email'])];
    }
    console.log(`WhatsApp opt-out: skipping WhatsApp ${type} for ${customer.firstName || 'customer'}`);
  }
  console.log(`Available contact methods for ${customer.firstName || 'customer'}: ${availableMethods.join(', ')}`);

  // Send via Email if available and preferred
  if (availableMethods.includes('email') && channels.includes('email')) {
    results.email.attempted = true;
    try {
      await sendEmailNotification(type, customer, data, attachments);
      results.email.success = true;
      console.log(`Email notification sent successfully to ${customer.email}`);
    } catch (error) {
      results.email.error = error.message;
      console.error(`Email notification failed for ${customer.email}:`, error.message);
    }
  }

  // Send via WhatsApp if available and preferred
  if (availableMethods.includes('whatsapp') && channels.includes('whatsapp')) {
    results.whatsapp.attempted = true;
    try {
      await sendWhatsAppNotification(type, customer, data, documentUrl, pdfBuffer, pdfFilename);
      results.whatsapp.success = true;
      console.log(`WhatsApp notification sent successfully to ${customer.whatsapp || customer.phone}`);
    } catch (error) {
      results.whatsapp.error = error.message;
      console.error(`WhatsApp notification failed for ${customer.whatsapp || customer.phone}:`, error.message);
    }
  }

  // Check if at least one notification was successful
  const anySuccess = results.email.success || results.whatsapp.success;
  
  if (!anySuccess && (results.email.attempted || results.whatsapp.attempted)) {
    throw new Error(`All notification attempts failed. Email: ${results.email.error || 'Not attempted'}, WhatsApp: ${results.whatsapp.error || 'Not attempted'}`);
  }

  return results;
};

// Send email notification based on type
const sendEmailNotification = async (type, customer, data, attachments = []) => {
  const emailOptions = {
    email: customer.email,
    attachments
  };

  switch (type) {
    case 'quotation':
      emailOptions.subject = `Quotation ${data.quotationNumber}`;
      emailOptions.template = 'quotation';
      emailOptions.data = data;
      break;

    case 'invoice':
      emailOptions.subject = `Invoice ${data.invoiceNumber} - Sunlit CRM`;
      emailOptions.template = 'invoice';
      emailOptions.data = data;
      break;

    case 'welcome':
      emailOptions.subject = 'Welcome to Sunlit CRM - Your Account Details';
      emailOptions.template = 'welcome';
      emailOptions.data = data;
      break;

    case 'orderform':
      emailOptions.subject = `Order Confirmation - Order Form ${data.orderNumber}`;
      emailOptions.template = 'orderform';
      emailOptions.data = data;
      break;

    case 'custom':
      emailOptions.subject = data.subject;
      emailOptions.template = data.template;
      emailOptions.data = data;
      break;

    default:
      throw new Error(`Unknown notification type: ${type}`);
  }

  return await sendEmail(emailOptions);
};

// Send WhatsApp notification based on type
const sendWhatsAppNotification = async (type, customer, data, documentUrl = null, pdfBuffer = null, pdfFilename = null) => {
  // Determine the correct WhatsApp number to use
  let whatsappNumber = null;
  
  if (customer.hasWhatsapp === false) {
    throw new Error('Customer has no WhatsApp number');
  }  
  if (customer.whatsappSameAsPhone && customer.phone) {
    whatsappNumber = customer.phone;
  } else if (customer.whatsapp) {
    whatsappNumber = customer.whatsapp;
  } else if (customer.phone) {
    // Fallback: legacy leads may have phone but no explicit whatsapp field
    whatsappNumber = customer.phone;
  } else {
    throw new Error('No valid WhatsApp number found');
  }

  const countryCode = customer.countryCode || '+91';

  switch (type) {
    case 'quotation':
      // Send template message for quotation
      const quotationResult = await sendQuotationWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        quotationNumber: data.quotationNumber,
        quotationUrl: data.paymentLink || data.quotationUrl || 'Portal login required',
        countryCode
      });

      if (pdfBuffer) {
        const uploaded = await uploadWhatsAppMedia(pdfBuffer, pdfFilename || `Quotation_${data.quotationNumber}.pdf`);
        await sendWhatsAppDocument({ to: whatsappNumber, mediaId: uploaded.mediaId, filename: uploaded.filename, caption: `Your quotation ${data.quotationNumber} is attached.`, countryCode });
      } else if (documentUrl) {
        await sendWhatsAppDocument({ to: whatsappNumber, documentUrl, filename: `Quotation_${data.quotationNumber}.pdf`, caption: `Your quotation ${data.quotationNumber} is attached.`, countryCode });
      }

      return quotationResult;

    case 'invoice':
      const invoiceResult = await sendInvoiceWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        invoiceNumber: data.invoiceNumber,
        amount: `₹${data.total}`,
        dueDate: data.dueDate || '-',
        countryCode
      });

      if (pdfBuffer) {
        const uploaded = await uploadWhatsAppMedia(pdfBuffer, pdfFilename || `Invoice_${data.invoiceNumber}.pdf`);
        await sendWhatsAppDocument({ to: whatsappNumber, mediaId: uploaded.mediaId, filename: uploaded.filename, caption: `Your invoice ${data.invoiceNumber} is attached.`, countryCode });
      } else if (documentUrl) {
        await sendWhatsAppDocument({ to: whatsappNumber, documentUrl, filename: `Invoice_${data.invoiceNumber}.pdf`, caption: `Your invoice ${data.invoiceNumber} is attached.`, countryCode });
      }

      return invoiceResult;

    case 'orderform':
      const { sendWhatsAppTemplate } = require('./sendWhatsApp');

      const orderFormResult = await sendWhatsAppTemplate({
        to: whatsappNumber,
        templateName: 'order_confirmation',
        languageCode: 'en_US',
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: `${customer.firstName} ${customer.lastName || ''}`.trim() },
              { type: "text", text: data.orderNumber },
              { type: "text", text: data.totalAmount.toLocaleString('en-IN') },
              { type: "text", text: data.advanceAmount.toLocaleString('en-IN') }
            ]
          }
        ],
        countryCode
      });

      if (pdfBuffer) {
        const uploaded = await uploadWhatsAppMedia(pdfBuffer, pdfFilename || `Order_Form_${data.orderNumber}.pdf`);
        await sendWhatsAppDocument({ to: whatsappNumber, mediaId: uploaded.mediaId, filename: uploaded.filename, caption: `Your order form ${data.orderNumber} is attached.`, countryCode });
      }

      return orderFormResult;

    case 'welcome':
      // Send account creation notification (Utility template only)
      // Authentication template removed - requires business verification
      return await sendAccountCreatedWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        loginUsername: data.loginUsername || data.email || data.phone,
        loginUrl: process.env.FRONTEND_URL || 'your-crm-portal.com',
        countryCode
      });

    case 'ticket_created':
      return await sendTicketCreatedWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        ticketNumber: data.ticketNumber,
        countryCode
      });

    case 'ticket_updated':
      return await sendTicketUpdatedWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        ticketNumber: data.ticketNumber,
        status: data.status,
        details: data.details || '',
        countryCode
      });

    case 'ticket_resolved':
      return await sendTicketResolvedWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        ticketNumber: data.ticketNumber,
        countryCode
      });

    case 'order_tracking':
      return await sendOrderTrackingWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        orderNumber: data.orderNumber,
        status: data.status,
        expectedDelivery: data.expectedDelivery || '-',
        countryCode
      });

    case 'payment_receipt':
      return await sendPaymentReceiptWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        amount: data.amount,
        reference: data.reference,
        transactionRef: data.transactionRef || '-',
        countryCode
      });

    case 'payment_reminder':
      return await sendPaymentReminderWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        amount: data.amount,
        reference: data.reference,
        dueDate: data.dueDate,
        countryCode
      });

    case 'installation_completed':
      return await sendInstallationCompletedWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        orderNumber: data.orderNumber,
        countryCode
      });

    case 'custom':
      // Send custom text message
      return await sendWhatsAppText({
        to: whatsappNumber,
        text: data.message,
        countryCode
      });

    default:
      throw new Error(`Unknown WhatsApp notification type: ${type}`);
  }
};

// Helper function for quotation notifications
const sendQuotationNotification = async (quotation, quotationItems, pdfBuffer = null) => {
  const customer = quotation.lead;
  
  // Prepare email data (existing format)
  const emailData = {
    quotationNumber: quotation.quotationNumber,
    createdDate: new Date(quotation.createdAt).toLocaleDateString(),
    validUntil: new Date(quotation.validUntil).toLocaleDateString(),
    status: quotation.status,
    lead: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      businessName: customer.businessName,
      billingAddress: customer.billingAddress,
      shippingAddress: customer.shippingAddress,
      address: customer.address, // Keep for backward compatibility
      email: customer.email,
      phone: customer.phone,
      countryCode: customer.countryCode
    },
    items: quotationItems.map(item => {
      let product = {};
      
      // Handle regular products
      if (item.productId) {
        product = {
          ...item.productId.toObject(),
          specifications: Object.entries(item.productId.specifications || {}).map(([key, value]) => ({
            name: key,
            value: value
          })),
          images: (item.productId.imageUrls || []).map(url => ({ url }))
        };
      }
      // Handle customized products
      else if (item.customizedProductId) {
        const customizedProduct = item.customizedProductId;
        
        // Build specifications from the customized product
        const specifications = [];
        if (customizedProduct.modelNumber) {
          specifications.push({ name: 'Model Number', value: customizedProduct.modelNumber });
        }
        
        // Add all specifications from the customized product
        Object.entries(customizedProduct.specifications || {}).forEach(([key, value]) => {
          if (value && value.trim()) {
            specifications.push({ 
              name: key.charAt(0).toUpperCase() + key.slice(1), 
              value: value 
            });
          }
        });
        
        product = {
          _id: customizedProduct._id,
          name: customizedProduct.name || 'Customized Product',
          description: customizedProduct.description || '',
          specifications: specifications,
          images: (customizedProduct.imageUrls || []).map(url => ({ url }))
        };
      }
      // Handle bundle products with enhanced data
      else if (item.bundleId) {
        const bundleProduct = item.bundleId;
        
        // Build specifications from the bundle product (only for non-solar bundles)
        const specifications = [];
        if (bundleProduct.specifications && bundleProduct.category !== 'power_plants_system') {
          Object.entries(bundleProduct.specifications).forEach(([key, value]) => {
            if (value && value.toString().trim()) {
              specifications.push({ 
                name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'), 
                value: value.toString() 
              });
            }
          });
        }
        
        product = {
          _id: bundleProduct._id,
          name: bundleProduct.name || 'Bundle Product',
          category: bundleProduct.category || 'Bundle',
          description: bundleProduct.description || '',
          specifications: specifications,
          images: (bundleProduct.imageUrls || []).map(url => ({ url: url.toString() })),
          bundleCode: bundleProduct.bundleCode,
          subcategory: bundleProduct.subcategory,
          
          // Add system configuration for solar power plant bundles
          systemConfiguration: bundleProduct.systemConfiguration ? JSON.parse(JSON.stringify(bundleProduct.systemConfiguration)) : {},
          
          // Add bundle components from the quotation item - properly serialize MongoDB documents
          bundleComponents: (item.bundleComponents || []).map(component => ({
            name: component.name || '',
            quantity: component.quantity || 0,
            make: component.make || '',
            componentType: component.componentType || '',
            warranty: component.warranty || '',
            sortOrder: component.sortOrder || 0
          }))
        };
        
        // Debug log for email data
        console.log('Email Bundle Product Debug Info:');
        console.log('Bundle Name:', product.name);
        console.log('Bundle Category:', product.category);
        console.log('Images Count:', product.images.length);
        console.log('Bundle Components Count:', product.bundleComponents.length);
        console.log('Has System Config:', !!product.systemConfiguration && Object.keys(product.systemConfiguration).length > 0);
      }
      
      return {
        product: product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: Number((item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)).toFixed(2))
      };
    }),
    total: quotation.total,
    terms: quotation.terms,
    notes: quotation.notes,
    advanceAmount: quotation.advancePaymentAmount,
    advancePercentage: quotation.advancePaymentPercentage || 20,
    paymentLink: quotation.razorpayPaymentLink
  };

  // Prepare attachments for email
  const attachments = pdfBuffer ? [{
    filename: `Quotation_${quotation.quotationNumber}.pdf`,
    content: pdfBuffer
  }] : [];

  // Send notification via available channels
  return await sendNotification({
    customer,
    type: 'quotation',
    data: emailData,
    attachments,
    pdfBuffer,
    pdfFilename: pdfBuffer ? `Quotation_${quotation.quotationNumber}.pdf` : null
  });
};

// Helper function for invoice notifications
const sendInvoiceNotification = async (invoice, pdfBuffer = null) => {
  const customer = {
    firstName: invoice.customer.name?.split(' ')[0] || 'Customer',
    lastName: invoice.customer.name?.split(' ').slice(1).join(' ') || '',
    email: invoice.customer.email,
    phone: invoice.customer.phone,
    whatsapp: invoice.customer.whatsapp || invoice.customer.phone
  };

  // Prepare email data
  const emailData = {
    name: invoice.customer.name,
    invoiceNumber: invoice.invoiceNumber,
    items: invoice.items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      total: item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)
    })),
    total: invoice.totalAmount,
    dueDate: invoice.dueDate?.toLocaleDateString(),
    businessDetails: {
      name: process.env.BUSINESS_NAME || 'Sunlit CRM',
      address: process.env.BUSINESS_ADDRESS || 'Your Business Address',
      phone: process.env.BUSINESS_PHONE || 'Your Business Phone',
      email: process.env.BUSINESS_EMAIL || 'your@business.email'
    },
    customerDetails: {
      name: invoice.customer.name,
      email: invoice.customer.email,
      address: invoice.customerDetails?.address || 'N/A'
    }
  };

  // Prepare attachments for email
  const attachments = pdfBuffer ? [{
    filename: `Invoice_${invoice.invoiceNumber}.pdf`,
    content: pdfBuffer
  }] : [];

  // Send notification via available channels
  return await sendNotification({
    customer,
    type: 'invoice',
    data: emailData,
    attachments,
    pdfBuffer,
    pdfFilename: pdfBuffer ? `Invoice_${invoice.invoiceNumber}.pdf` : null
  });
};

// Helper function for Order Form notifications
const sendOrderFormNotification = async (customerPurchase, pdfBuffer = null) => {
  try {
    // Get customer purchase with populated data
    const CustomerPurchase = require('../models/CustomerPurchase');
    const Customer = require('../models/Customer');
    const Quotation = require('../models/Quotation');
    
    // Fetch full purchase data if not already populated
    const purchase = await CustomerPurchase.findById(customerPurchase._id || customerPurchase)
      .populate('customerId')
      .populate({
        path: 'quotationId',
        populate: {
          path: 'lead',
          select: 'firstName lastName businessName email phone whatsapp hasWhatsapp whatsappSameAsPhone countryCode preferredContactMethod'
        }
      });

    if (!purchase) {
      throw new Error('Purchase not found for Order Form notification');
    }

    const customer = purchase.customerId;
    const lead = purchase.quotationId.lead;

    // Format customer data for notification system
    const customerForNotification = {
      firstName: customer.firstName || lead.firstName,
      lastName: customer.lastName || lead.lastName,
      email: customer.email || lead.email,
      phone: customer.phone || lead.phone,
      whatsapp: customer.whatsapp || lead.whatsapp,
      hasWhatsapp: lead.hasWhatsapp,
      whatsappSameAsPhone: lead.whatsappSameAsPhone,
      countryCode: lead.countryCode || '+91',
      preferredContactMethod: lead.preferredContactMethod
    };

    // Prepare email data for Order Form
    const emailData = {
      customerName: `${customerForNotification.firstName} ${customerForNotification.lastName || ''}`.trim(),
      orderNumber: purchase.purchaseID,
      orderDate: purchase.purchaseDate.toLocaleDateString('en-IN'),
      totalAmount: purchase.totalAmount.toLocaleString('en-IN'),
      advanceAmount: purchase.advancePaid.toLocaleString('en-IN'),
      remainingAmount: purchase.remainingAmount.toLocaleString('en-IN'),
      paymentMethod: purchase.paymentMethod === 'razorpay' ? 'Online Payment' : 
                    purchase.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                    purchase.paymentMethod === 'cash' ? 'Cash' :
                    purchase.paymentMethod === 'check' ? 'Cheque' : 'Other',
      portalUrl: process.env.FRONTEND_URL || 'https://yourapp.com',
      currentYear: new Date().getFullYear(),
      businessDetails: {
        name: 'Focusun Energy Systems',
        address: 'Old No: 27 / New No: 30, Jagannathan Nagar, (Opp) CMC, Coimbatore - 14',
        phone: '0422 2591069, 2572237',
        email: 'info@focusunsolar.com',
        website: 'www.focusunsolar.com'
      },
      customerDetails: {
        name: `${customerForNotification.firstName} ${customerForNotification.lastName || ''}`.trim(),
        businessName: customer.businessName || lead.businessName,
        email: customerForNotification.email,
        phone: customerForNotification.phone,
        address: customer.address || lead.billingAddress || lead.address
      }
    };

    // Prepare attachments for email
    const attachments = pdfBuffer ? [{
      filename: `Order_Form_${purchase.purchaseID}.pdf`,
      content: pdfBuffer
    }] : [];

    // Send notification via available channels
    return await sendNotification({
      customer: customerForNotification,
      type: 'orderform',
      data: emailData,
      attachments,
      pdfBuffer,
      pdfFilename: pdfBuffer ? `Order_Form_${purchase.purchaseID}.pdf` : null
    });

  } catch (error) {
    console.error('Error in sendOrderFormNotification:', error);
    throw error;
  }
};

// Helper function for welcome notifications
const sendWelcomeNotification = async (user, password, leadContactPreferences = null) => {
  const customer = {
    firstName: user.name.split(' ')[0] || 'Customer',
    lastName: user.name.split(' ').slice(1).join(' ') || '',
    email: user.email,
    phone: user.phone,
    whatsapp: user.whatsapp || user.phone
  };

  // If lead contact preferences are provided, use them. Otherwise fallback to email-only
  if (leadContactPreferences) {
    customer.preferredContactMethod = leadContactPreferences.preferredContactMethod;
    customer.hasWhatsapp = leadContactPreferences.hasWhatsapp;
    customer.whatsappSameAsPhone = leadContactPreferences.whatsappSameAsPhone;
    customer.whatsapp = leadContactPreferences.whatsapp;
    customer.countryCode = leadContactPreferences.countryCode;
  } else {
    // Fallback: assume email-only communication for legacy cases
    customer.preferredContactMethod = 'email';
    customer.hasWhatsapp = false;
  }

  const welcomeData = {
    name: user.name,
    email: user.email,
    phone: user.phone,
    password,
    // For customers, always use phone number as login username
    // For staff roles, use email as login username
    loginUsername: user.role === 'customer' ? user.phone : user.email
  };

  // Send notification via available channels
  return await sendNotification({
    customer,
    type: 'welcome',
    data: welcomeData
  });
};

// Send WhatsApp notification to service engineer
const sendServiceEngineerWhatsApp = async (type, engineer, data) => {
  try {
    if (!engineer.phone && !engineer.whatsapp) {
      throw new Error('Service engineer has no WhatsApp/phone number configured');
    }

    // Check if WhatsApp notifications are enabled for this engineer
    if (engineer.notificationPreferences && !engineer.notificationPreferences.whatsappEnabled) {
      console.log(`WhatsApp notifications disabled for engineer: ${engineer.name}`);
      return { success: false, reason: 'WhatsApp notifications disabled' };
    }

    const phone = engineer.whatsapp || engineer.phone;
    const countryCode = engineer.countryCode || '+91';

    const libraryTemplateMap = {
      installation_assignment: { name: 'installation_assignment_v2', values: [data.orderNumber, data.customerName, data.customerAddress, data.installationDate] },
      installation_scheduled: { name: 'installation_scheduled_v2', values: [engineer.name, data.customerName, data.installationDate, data.orderNumber] },
      installation_reminder: { name: 'installation_reminder_v2', values: [engineer.name, data.customerName, data.customerPhone, data.installationDate, data.orderNumber] },
      urgent_customer_contact: { name: 'urgent_customer_contact_v2', values: [engineer.name, data.customerName, data.customerPhone, data.message, data.orderNumber] }
    };

    const libraryEntry = libraryTemplateMap[type];
    if (!libraryEntry) {
      throw new Error(`Unknown service engineer notification type: ${type}`);
    }

    const libraryResult = await sendLibraryTemplate({
      to: phone,
      templateName: libraryEntry.name,
      values: libraryEntry.values,
      countryCode
    });
    console.log(`WhatsApp template sent to engineer ${engineer.name}: ${type}`);
    return { success: true, result: libraryResult };

  } catch (error) {
    console.error(`Failed to send WhatsApp to engineer ${engineer.name}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Smart communication workflow - uses preferredContactMethod from Lead model
const sendSmartNotification = async (customer, type, data, options = {}) => {
  const { attachments = [], documentUrl = null, forceMethod = null } = options;
  
  let preferredMethods = [];
  
  // Determine communication strategy based on requirements
  if (forceMethod) {
    // Use specific method if forced
    preferredMethods = [forceMethod];
  } else {
    // Use the preferredContactMethod that's already calculated in the Lead model
    preferredMethods = getAvailableContactMethods(customer);
  }
  
  console.log(`Smart notification for ${customer.firstName}: Using preferredContactMethod='${customer.preferredContactMethod}', methods=[${preferredMethods.join(', ')}]`);
  
  return await sendNotification({
    customer,
    type,
    data,
    preferences: preferredMethods,
    attachments,
    documentUrl
  });
};

// SALES TEAM WHATSAPP NOTIFICATIONS

// Send WhatsApp notification to sales team members
const sendSalesTeamWhatsApp = async (type, salesTeamUser, data) => {
  try {
    if (!salesTeamUser.phone && !salesTeamUser.whatsapp) {
      throw new Error('Sales team member has no WhatsApp/phone number configured');
    }

    // Check if WhatsApp notifications are enabled for this user
    if (salesTeamUser.notificationPreferences && !salesTeamUser.notificationPreferences.whatsappEnabled) {
      console.log(`WhatsApp notifications disabled for sales person: ${salesTeamUser.name}`);
      return { success: false, reason: 'WhatsApp notifications disabled' };
    }

    const phone = salesTeamUser.whatsapp || salesTeamUser.phone;
    const countryCode = salesTeamUser.countryCode || '+91';

    const libraryTemplateMap = {
      lead_assignment: { name: 'lead_assignment_v2', values: [salesTeamUser.name, data.leadName, data.leadPhone, data.leadEmail, data.leadSource, data.priority || 'medium'] },
      follow_up_reminder: { name: 'follow_up_reminder_v2', values: [salesTeamUser.name, data.leadName, data.leadPhone, data.daysSinceLastContact] },
      quotation_pending: { name: 'quotation_pending_v2', values: [salesTeamUser.name, data.quotationNumber, data.customerName, data.amount, data.daysWaiting || 0] },
      hot_lead_alert: { name: 'hot_lead_alert_v2', values: [salesTeamUser.name, data.leadName, data.leadPhone, data.reason] }
    };

    const libraryEntry = libraryTemplateMap[type];
    if (!libraryEntry) {
      throw new Error(`Unknown sales team notification type: ${type}`);
    }

    const libraryResult = await sendLibraryTemplate({
      to: phone,
      templateName: libraryEntry.name,
      values: libraryEntry.values,
      countryCode
    });
    console.log(`WhatsApp template sent to sales person ${salesTeamUser.name}: ${type}`);
    return { success: true, result: libraryResult };

  } catch (error) {
    console.error(`Failed to send WhatsApp to sales person ${salesTeamUser.name}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ACCOUNTS DEPARTMENT WHATSAPP NOTIFICATIONS

// Send WhatsApp notification to accounts department members
const sendAccountsTeamWhatsApp = async (type, accountsUser, data) => {
  try {
    if (!accountsUser.phone && !accountsUser.whatsapp) {
      throw new Error('Accounts team member has no WhatsApp/phone number configured');
    }

    // Check if WhatsApp notifications are enabled for this user
    if (accountsUser.notificationPreferences && !accountsUser.notificationPreferences.whatsappEnabled) {
      console.log(`WhatsApp notifications disabled for accounts person: ${accountsUser.name}`);
      return { success: false, reason: 'WhatsApp notifications disabled' };
    }

    const phone = accountsUser.whatsapp || accountsUser.phone;
    const countryCode = accountsUser.countryCode || '+91';

    const libraryTemplateMap = {
      payment_received: { name: 'payment_received_v2', values: [accountsUser.name, data.customerName, data.amount, data.paymentMethod, data.invoiceNumber] },
      payment_pending: { name: 'payment_pending_v2', values: [accountsUser.name, data.customerName, data.amount, data.invoiceNumber, data.daysOverdue] },
      invoice_due: { name: 'invoice_due_v2', values: [accountsUser.name, data.customerName, data.amount, data.invoiceNumber, data.dueDate, data.daysUntilDue] }
    };

    const libraryEntry = libraryTemplateMap[type];
    if (!libraryEntry) {
      throw new Error(`Unknown accounts team notification type: ${type}`);
    }

    const libraryResult = await sendLibraryTemplate({
      to: phone,
      templateName: libraryEntry.name,
      values: libraryEntry.values,
      countryCode
    });
    console.log(`WhatsApp template sent to accounts person ${accountsUser.name}: ${type}`);
    return { success: true, result: libraryResult };

  } catch (error) {
    console.error(`Failed to send WhatsApp to accounts person ${accountsUser.name}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
  sendQuotationNotification,
  sendInvoiceNotification,
  sendOrderFormNotification,
  sendWelcomeNotification,
  getAvailableContactMethods,
  sendServiceEngineerWhatsApp,
  sendSalesTeamWhatsApp,
  sendAccountsTeamWhatsApp,
  sendSmartNotification,
}; 
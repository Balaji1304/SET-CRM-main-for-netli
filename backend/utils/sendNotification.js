const sendEmail = require('./sendEmail');
const {
  sendQuotationWhatsApp,
  sendInvoiceWhatsApp,
  sendWelcomeWhatsApp,
  sendWhatsAppDocument,
  sendWhatsAppText,
  sendInstallationAssignmentWhatsApp,
  sendInstallationScheduledWhatsApp,
  sendInstallationReminderWhatsApp,
  sendUrgentCustomerContactWhatsApp
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
    documentUrl = null // For WhatsApp documents
  } = options;

  const results = {
    email: { attempted: false, success: false, error: null },
    whatsapp: { attempted: false, success: false, error: null }
  };

  const availableMethods = getAvailableContactMethods(customer);
  console.log(`Available contact methods for ${customer.firstName || 'customer'}: ${availableMethods.join(', ')}`);

  // Send via Email if available and preferred
  if (availableMethods.includes('email') && preferences.includes('email')) {
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
  if (availableMethods.includes('whatsapp') && preferences.includes('whatsapp')) {
    results.whatsapp.attempted = true;
    try {
      await sendWhatsAppNotification(type, customer, data, documentUrl);
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
const sendWhatsAppNotification = async (type, customer, data, documentUrl = null) => {
  // Determine the correct WhatsApp number to use
  let whatsappNumber = null;
  
  if (customer.hasWhatsapp === false) {
    throw new Error('Customer has no WhatsApp number');
  }
  
  if (customer.whatsappSameAsPhone && customer.phone) {
    whatsappNumber = customer.phone;
  } else if (customer.whatsapp) {
    whatsappNumber = customer.whatsapp;
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

      // If document URL is provided, send the PDF as well
      if (documentUrl) {
        await sendWhatsAppDocument({
          to: whatsappNumber,
          documentUrl,
          filename: `Quotation_${data.quotationNumber}.pdf`,
          caption: `Your quotation ${data.quotationNumber} is attached.`,
          countryCode
        });
      }

      return quotationResult;

    case 'invoice':
      // Send template message for invoice
      const invoiceResult = await sendInvoiceWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        invoiceNumber: data.invoiceNumber,
        amount: `₹${data.total}`,
        invoiceUrl: data.invoiceUrl || 'Portal login required',
        countryCode
      });

      // If document URL is provided, send the PDF as well
      if (documentUrl) {
        await sendWhatsAppDocument({
          to: whatsappNumber,
          documentUrl,
          filename: `Invoice_${data.invoiceNumber}.pdf`,
          caption: `Your invoice ${data.invoiceNumber} is attached.`,
          countryCode
        });
      }

      return invoiceResult;

    case 'orderform':
      // Send order confirmation message for Order Form
      const orderFormMessage = `🎉 *ORDER CONFIRMATION*\n\n` +
        `Dear ${customer.firstName} ${customer.lastName || ''},\n\n` +
        `Thank you for your order! Your advance payment has been confirmed.\n\n` +
        `📋 *Order Details:*\n` +
        `Order No: ${data.orderNumber}\n` +
        `Total Amount: ₹${data.totalAmount.toLocaleString('en-IN')}\n` +
        `Advance Paid: ₹${data.advanceAmount.toLocaleString('en-IN')}\n` +
        `Remaining: ₹${data.remainingAmount.toLocaleString('en-IN')}\n\n` +
        `📧 *Your order form has been sent to your email.*\n` +
        `You can also access it anytime from your customer portal.\n\n` +
        `🔗 Portal: ${process.env.FRONTEND_URL || 'https://yourapp.com'}/orders\n\n` +
        `We will contact you soon for installation scheduling.\n\n` +
        `*Sunlit Solar Team*`;

      const { sendWhatsAppText } = require('./sendWhatsApp');
      
      const orderFormResult = await sendWhatsAppText({
        to: whatsappNumber,
        text: orderFormMessage,
        countryCode
      });

      return orderFormResult;

    case 'welcome':
      // Send welcome credentials via WhatsApp
      return await sendWelcomeWhatsApp({
        to: whatsappNumber,
        customerName: `${customer.firstName} ${customer.lastName}`,
        loginUsername: data.loginUsername || data.email || data.phone,
        password: data.password,
        loginUrl: process.env.FRONTEND_URL || 'your-crm-portal.com',
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
    documentUrl: null // PDF will be handled differently for WhatsApp if needed
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
    documentUrl: null // PDF will be handled differently for WhatsApp if needed
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
      documentUrl: null // PDF will be handled as attachment for email
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

    let result;
    switch (type) {
      case 'installation_assignment':
        result = await sendInstallationAssignmentWhatsApp({
          to: phone,
          engineerName: engineer.name,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerAddress: data.customerAddress,
          installationDate: data.installationDate,
          orderNumber: data.orderNumber,
          countryCode
        });
        break;

      case 'installation_scheduled':
        result = await sendInstallationScheduledWhatsApp({
          to: phone,
          engineerName: engineer.name,
          customerName: data.customerName,
          installationDate: data.installationDate,
          orderNumber: data.orderNumber,
          countryCode
        });
        break;

      case 'installation_reminder':
        result = await sendInstallationReminderWhatsApp({
          to: phone,
          engineerName: engineer.name,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          installationDate: data.installationDate,
          orderNumber: data.orderNumber,
          countryCode
        });
        break;

      case 'urgent_customer_contact':
        result = await sendUrgentCustomerContactWhatsApp({
          to: phone,
          engineerName: engineer.name,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          message: data.message,
          orderNumber: data.orderNumber,
          countryCode
        });
        break;

      case 'custom_message':
        result = await sendWhatsAppText({
          to: phone,
          text: data.message,
          countryCode
        });
        break;

      default:
        throw new Error(`Unknown service engineer notification type: ${type}`);
    }

    console.log(`WhatsApp notification sent to engineer ${engineer.name}: ${type}`);
    return { success: true, result };

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

module.exports = {
  sendNotification,
  sendQuotationNotification,
  sendInvoiceNotification,
  sendOrderFormNotification,
  sendWelcomeNotification,
  getAvailableContactMethods,
  sendServiceEngineerWhatsApp,
  sendSmartNotification,
}; 
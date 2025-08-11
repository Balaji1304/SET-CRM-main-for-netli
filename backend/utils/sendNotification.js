const sendEmail = require('./sendEmail');
const {
  sendQuotationWhatsApp,
  sendInvoiceWhatsApp,
  sendWelcomeWhatsApp,
  sendWhatsAppDocument,
  sendWhatsAppText
} = require('./sendWhatsApp');

// Determine available contact methods for a customer
const getAvailableContactMethods = (customer) => {
  const methods = [];
  
  if (customer.email) {
    methods.push('email');
  }
  
  if (customer.whatsapp || customer.phone) {
    methods.push('whatsapp');
  }
  
  return methods;
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
  const phone = customer.whatsapp || customer.phone;
  const countryCode = customer.countryCode || '+91';

  switch (type) {
    case 'quotation':
      // Send template message for quotation
      const quotationResult = await sendQuotationWhatsApp({
        to: phone,
        customerName: `${customer.firstName} ${customer.lastName}`,
        quotationNumber: data.quotationNumber,
        quotationUrl: data.paymentLink || data.quotationUrl || 'Portal login required',
        countryCode
      });

      // If document URL is provided, send the PDF as well
      if (documentUrl) {
        await sendWhatsAppDocument({
          to: phone,
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
        to: phone,
        customerName: `${customer.firstName} ${customer.lastName}`,
        invoiceNumber: data.invoiceNumber,
        amount: `₹${data.total}`,
        invoiceUrl: data.invoiceUrl || 'Portal login required',
        countryCode
      });

      // If document URL is provided, send the PDF as well
      if (documentUrl) {
        await sendWhatsAppDocument({
          to: phone,
          documentUrl,
          filename: `Invoice_${data.invoiceNumber}.pdf`,
          caption: `Your invoice ${data.invoiceNumber} is attached.`,
          countryCode
        });
      }

      return invoiceResult;

    case 'welcome':
      // Send welcome credentials via WhatsApp
      return await sendWelcomeWhatsApp({
        to: phone,
        customerName: `${customer.firstName} ${customer.lastName}`,
        email: data.email,
        password: data.password,
        loginUrl: process.env.FRONTEND_URL || 'your-crm-portal.com',
        countryCode
      });

    case 'custom':
      // Send custom text message
      return await sendWhatsAppText({
        to: phone,
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
      // Handle bundle products (if needed)
      else if (item.bundleId) {
        product = {
          ...item.bundleId.toObject(),
          specifications: [],
          images: []
        };
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

// Helper function for welcome notifications
const sendWelcomeNotification = async (user, password) => {
  const customer = {
    firstName: user.name.split(' ')[0] || 'Customer',
    lastName: user.name.split(' ').slice(1).join(' ') || '',
    email: user.email,
    phone: user.phone,
    whatsapp: user.whatsapp || user.phone
  };

  const welcomeData = {
    name: user.name,
    email: user.email,
    password
  };

  // Send notification via available channels
  return await sendNotification({
    customer,
    type: 'welcome',
    data: welcomeData
  });
};

module.exports = {
  sendNotification,
  sendQuotationNotification,
  sendInvoiceNotification,
  sendWelcomeNotification,
  getAvailableContactMethods
}; 
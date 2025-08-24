const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');
const User = require('../models/User');
const Lead = require('../models/Lead');
const CustomizedProduct = require('../models/CustomizedProduct');
const sendEmail = require('../utils/sendEmail');
const { sendQuotationNotification, sendWelcomeNotification, sendSmartNotification } = require('../utils/sendNotification');
const { generateQuotationNumber } = require('../utils/generateNumbers');
const generatePDF = require('../utils/generatePDF');
const { registerHelpers } = require('../utils/handlebarsHelpers');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { notifyClient, notifyRole } = require('../utils/websocket');
const { errorHandler, AppError } = require('../utils/errorHandler');
const Customer = require('../models/Customer');
const CustomerPurchase = require('../models/CustomerPurchase');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const NotificationService = require('../utils/notificationService');

// Register handlebars helpers
registerHelpers();

// @desc    Get all quotations
// @route   GET /api/quotations
exports.getQuotations = async (req, res) => {
  try {
    let query = {};
    
    // If user is a sales person, only show their quotations
    // Sales head and marketing coordinator can see all quotations
    if (req.user.role === 'sales_person') {
      query.createdBy = req.user.id;
    }
    
    // If user is a customer, only show quotations related to their leads
    if (req.user.role === 'customer') {
      // Find leads associated with this customer's phone number or email
      const leads = await Lead.find({ 
        $or: [
          { phone: req.user.phone },
          { email: req.user.email }
        ]
      });
      const leadIds = leads.map(lead => lead._id);
      query.lead = { $in: leadIds };
    }

    // Accounts department: allow status filter for pending_approval or approved
    if (req.user.role === 'accounts_department') {
      const requestedStatus = req.query.status;
      if (requestedStatus === 'approved') {
        query.status = 'approved';
      } else {
        // default
        query.status = 'pending_approval';
      }
    }

    const quotations = await Quotation.find(query)
      .populate('lead', 'firstName lastName email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 }); // Sort by newest first

    // Get quotation items for all quotations in a single query
    const quotationIds = quotations.map(q => q._id);
    const allQuotationItems = await QuotationItem.find({ quotationId: { $in: quotationIds } })
      .populate('productId')
      .populate('bundleId')
      .populate('customizedProductId');
    
    // Group quotation items by quotation ID for efficient lookup
    const itemsByQuotationId = {};
    allQuotationItems.forEach(item => {
      if (!itemsByQuotationId[item.quotationId.toString()]) {
        itemsByQuotationId[item.quotationId.toString()] = [];
      }
      itemsByQuotationId[item.quotationId.toString()].push(item);
    });
    
    // Add quotation items to each quotation
    const quotationsWithItems = quotations.map(quotation => {
      const quotationObj = quotation.toObject();
      quotationObj.quotationItems = itemsByQuotationId[quotation._id.toString()] || [];
      return quotationObj;
    });

    res.json({
      success: true,
      data: quotationsWithItems
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get single quotation
// @route   GET /api/quotations/:id
exports.getQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('lead')
      .populate('createdBy', 'name email'); // Also populate createdBy for full info

    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    // Check access permissions - sales person can only access their own quotations
    // Sales head and marketing coordinator can access all quotations
    if (req.user.role === 'sales_person' && quotation.createdBy._id.toString() !== req.user.id) {
      throw new AppError('Not authorized to access this quotation', 403);
    }

    // For customers, check if the quotation is related to their leads
    if (req.user.role === 'customer') {
      // Ensure quotation.lead is populated or handle if not (though it should be by above populate)
      if (!quotation.lead || !quotation.lead._id) {
        throw new AppError('Quotation lead information is missing', 500);
      }
      const lead = await Lead.findOne({ 
        _id: quotation.lead._id,
        email: req.user.email 
      });
      
      if (!lead) {
        throw new AppError('Not authorized to access this quotation', 403);
      }
    }

    // Accounts department can only view quotations in pending_approval
    if (req.user.role === 'accounts_department' && quotation.status !== 'pending_approval') {
      throw new AppError('Not authorized to access this quotation', 403);
    }

    // Get quotation items
    const quotationItems = await QuotationItem.find({ quotationId: quotation._id })
      .populate('productId')
      .populate('bundleId')
      .populate('customizedProductId');

    // Convert to object for modification
    const quotationData = quotation.toObject();
    quotationData.quotationItems = quotationItems;

    // If quotation is approved, fetch related CustomerPurchase and Invoice status
    if (quotationData.status === 'approved') {
      const customerPurchase = await CustomerPurchase.findOne({ quotationId: quotation._id });
      if (customerPurchase) {
        quotationData.customerPurchaseDetails = {
          _id: customerPurchase._id,
          purchaseID: customerPurchase.purchaseID,
          isFullyPaid: customerPurchase.isFullyPaid,
          paymentStatus: customerPurchase.paymentStatus, // or customerPurchase.status
          remainingAmount: customerPurchase.remainingAmount,
          totalAmount: customerPurchase.totalAmount
        };

        // Check if an invoice exists for this purchase
        const invoice = await mongoose.model('Invoice').findOne({ customerPurchase: customerPurchase._id });
        if (invoice) {
          quotationData.customerPurchaseDetails.invoiceId = invoice._id;
          quotationData.customerPurchaseDetails.invoiceNumber = invoice.invoiceNumber;
          quotationData.customerPurchaseDetails.hasInvoice = true;
        } else {
          quotationData.customerPurchaseDetails.hasInvoice = false;
        }
      } else {
        // This case implies an approved quotation without a customer purchase record yet,
        // which might indicate the advance payment / purchase creation step hasn't completed.
        quotationData.customerPurchaseDetails = {
            isFullyPaid: false, // Default to not paid if no purchase record
            hasInvoice: false
        };
      }
    }

    res.json({
      success: true,
      data: quotationData
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Create quotation
// @route   POST /api/quotations
exports.createQuotation = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'sales_person' && req.user.role !== 'sales_head' && req.user.role !== 'marketing_coordinator')) {
      throw new AppError('Only sales roles can create quotations', 403);
    }
    const { leadId, quotationItems, terms, notes, advancePaymentPercentage } = req.body;

    // Validate advance payment percentage
    const percentage = parseInt(advancePaymentPercentage) || 20;
    if (percentage < 1 || percentage > 100) {
      throw new AppError('Advance payment percentage must be between 1 and 100', 400);
    }

    // Calculate total for Quotation (overall)
    // This requires individual quotation item totals to be calculated first
    let calculatedTotal = 0;
    for (const item of quotationItems) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discountPercentage = Number(item.discount || 0);
      if (isNaN(quantity) || isNaN(unitPrice) || isNaN(discountPercentage)) {
        throw new AppError('Invalid item quantity, unit price, or discount percentage.', 400);
      }
      calculatedTotal += quantity * unitPrice * (1 - discountPercentage / 100);
    }
    const total = Number(calculatedTotal.toFixed(2));

    // Create quotation
    const quotation = await Quotation.create({
      lead: leadId,
      quotationNumber: await generateQuotationNumber(),
      total,
      terms,
      notes,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: req.user.id,
      status: 'draft',
      advancePaymentStatus: 'PENDING',
      advancePaymentPercentage: percentage
    });

    // Create quotation items
    const createdQuotationItems = [];
    for (const item of quotationItems) {
      // Determine item type and validate required fields
      let itemType = 'product';
      let referenceId = null;
      
      if (item.productId) {
        itemType = 'product';
        referenceId = item.productId;
      } else if (item.bundleId) {
        itemType = 'bundle';
        referenceId = item.bundleId;
      } else if (item.customizedProductId) {
        itemType = 'customized';
        referenceId = item.customizedProductId;
      } else {
        throw new AppError('Product ID, Bundle ID, or Customized Product ID is required for each item', 400);
      }

      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discountPercentage = Number(item.discount || 0);

      // Calculate total for this specific QuotationItem
      const itemTotal = Number((quantity * unitPrice * (1 - discountPercentage / 100)).toFixed(2));
      
      const quotationItemData = {
        quotationId: quotation._id,
        itemType: itemType,
        quantity: quantity,
        unitPrice: unitPrice,
        discount: discountPercentage,
        total: itemTotal
      };

      // Set the appropriate reference field
      if (itemType === 'product') {
        quotationItemData.productId = referenceId;
      } else if (itemType === 'bundle') {
        quotationItemData.bundleId = referenceId;
        
        // For bundles, store component details if provided
        if (item.bundleComponents && Array.isArray(item.bundleComponents)) {
          quotationItemData.bundleComponents = item.bundleComponents.map(comp => ({
            solarItemId: comp.solarItemId,
            name: comp.name,
            componentType: comp.componentType,
            quantity: comp.quantity,
            make: comp.make, // Quotation-specific make
            warranty: comp.warranty,
            sortOrder: comp.sortOrder || 0
          }));
        }
        
        // Store bundle configuration if provided
        if (item.bundleConfiguration) {
          quotationItemData.bundleConfiguration = item.bundleConfiguration;
        }
      } else if (itemType === 'customized') {
        quotationItemData.customizedProductId = referenceId;
      }

      const quotationItem = await QuotationItem.create(quotationItemData);
      createdQuotationItems.push(quotationItem);
    }

    // Get populated quotation with lead info
    const populatedQuotation = await Quotation.findById(quotation._id).populate('lead');

    // Return the data in the new format
    const quotationWithItems = populatedQuotation.toObject();
    quotationWithItems.quotationItems = createdQuotationItems;

    // Create notification for new quotation
    try {
      await NotificationService.createQuotationWorkflowNotification('quotation_created', quotation, req.user);
    } catch (notificationError) {
      console.error('Failed to create quotation notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.status(201).json({
      success: true,
      data: quotationWithItems
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
exports.updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!req.user || (req.user.role !== 'sales_person' && req.user.role !== 'sales_head' && req.user.role !== 'marketing_coordinator')) {
      throw new AppError('Only sales roles can update quotations', 403);
    }

    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    // Only allow updates if quotation is in draft status
    if (quotation.status !== 'draft') {
      throw new AppError('Cannot update quotation that is not in draft status', 400);
    }

    // Extract data from request body
    const { quotationItems, terms, notes, advancePaymentPercentage } = req.body;

    // Validate advance payment percentage
    const percentage = parseInt(advancePaymentPercentage) || quotation.advancePaymentPercentage || 20;
    if (percentage < 1 || percentage > 100) {
      throw new AppError('Advance payment percentage must be between 1 and 100', 400);
    }

    // Recalculate total for Quotation (overall) based on updated items
    let calculatedTotal = 0;
    for (const item of quotationItems) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discountPercentage = Number(item.discount || 0);
      if (isNaN(quantity) || isNaN(unitPrice) || isNaN(discountPercentage)) {
        throw new AppError('Invalid item quantity, unit price, or discount percentage.', 400);
      }
      calculatedTotal += quantity * unitPrice * (1 - discountPercentage / 100);
    }
    const total = Number(calculatedTotal.toFixed(2));

    // Update quotation
    const updatedData = {
      terms,
      notes,
      total,
      advancePaymentPercentage: percentage,
      updatedAt: Date.now()
    };

    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    ).populate('lead');

    // Delete existing quotation items
    await QuotationItem.deleteMany({ quotationId: quotation._id });

    // Create new quotation items
    const createdQuotationItems = [];
    for (const item of quotationItems) {
      // Validate that at least one of productId, customizedProductId, or bundleId is provided
      if (!item.productId && !item.customizedProductId && !item.bundleId) {
        throw new AppError('Either Product ID, Customized Product ID, or Bundle ID is required for each item', 400);
      }
      
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discountPercentage = Number(item.discount || 0); // Assuming item.discount is percentage

      // Calculate total for this specific QuotationItem
      const itemTotal = Number((quantity * unitPrice * (1 - discountPercentage / 100)).toFixed(2));

      // Determine item type
      let itemType = '';
      if (item.productId) {
        itemType = 'product';
      } else if (item.customizedProductId) {
        itemType = 'customized';
      } else if (item.bundleId) {
        itemType = 'bundle';
      }

      const quotationItemData = {
        quotationId: quotation._id,
        itemType: itemType,
        quantity: quantity,
        unitPrice: unitPrice,
        discount: discountPercentage, // Store discount as percentage
        total: itemTotal // Store correctly calculated item total
      };

      // Add productId, customizedProductId, or bundleId
      if (item.productId) {
        quotationItemData.productId = item.productId;
      } else if (item.customizedProductId) {
        quotationItemData.customizedProductId = item.customizedProductId;
      } else if (item.bundleId) {
        quotationItemData.bundleId = item.bundleId;
        
        // Add bundle components if provided
        if (item.bundleComponents && Array.isArray(item.bundleComponents)) {
          quotationItemData.bundleComponents = item.bundleComponents;
        }
      }

      const quotationItem = await QuotationItem.create(quotationItemData);
      createdQuotationItems.push(quotationItem);
    }

    // Return the data in new format
    const quotationWithItems = updatedQuotation.toObject();
    quotationWithItems.quotationItems = createdQuotationItems;

    res.json({
      success: true,
      data: quotationWithItems
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
exports.deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!req.user || (req.user.role !== 'sales_person' && req.user.role !== 'sales_head' && req.user.role !== 'marketing_coordinator')) {
      return res.status(403).json({ success: false, message: 'Only sales roles can delete quotations' });
    }

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Only allow deletion of draft quotations
    if (quotation.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete quotation that is not in draft status'
      });
    }

    await quotation.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send quotation to lead
// @route   POST /api/quotations/:id/send
exports.sendQuotation = async (req, res) => {
  try {
    // Check if user has permission to send quotations
    if (!req.user || (req.user.role !== 'sales_person' && req.user.role !== 'sales_head' && req.user.role !== 'marketing_coordinator')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send quotations'
      });
    }

      // Fetch quotation with populated data first
      const quotation = await Quotation.findById(req.params.id)
      .populate('lead', 'firstName lastName email whatsapp phone countryCode preferredContactMethod hasWhatsapp whatsappSameAsPhone billingAddress shippingAddress address businessName');

      if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
      }

    // Get quotation items
    const quotationItems = await QuotationItem.find({ quotationId: quotation._id })
      .populate('productId')
      .populate('bundleId')
      .populate('customizedProductId');

    if (quotationItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quotation has no items'
      });
      }

      // Notify sending status
      notifyClient(req.user.id, quotation._id, 'sending');

      // Calculate advance payment amount based on user-defined percentage (default to 20% if not set)
      const advancePercentage = quotation.advancePaymentPercentage || 20;
      
      // Calculate and ensure correct formatting of the advance amount
      const rawAdvanceAmount = quotation.total * (advancePercentage/100);
      const advanceAmount = Math.max(Number(rawAdvanceAmount.toFixed(2)), 1);

      // Create payment link options
      // Use FRONTEND_URL environment variable instead of hardcoded domain
      const frontendDomain = process.env.FRONTEND_URL || 'blackenginecrm.netlify.app';
      const callbackUrl = frontendDomain.includes('://') 
        ? `${frontendDomain}/quotations/${quotation._id}/payment-status`
        : `https://${frontendDomain}/quotations/${quotation._id}/payment-status`;
      
      const paymentLinkOptions = {
        amount: Math.round(advanceAmount * 100), // in paise, rounded to ensure integer
        currency: "INR",
        accept_partial: false,
        description: `Advance Payment (${advancePercentage}%) for Quotation #${quotation.quotationNumber}`,
        customer: {
          name: `${quotation.lead.firstName} ${quotation.lead.lastName}`,
          email: quotation.lead.email || undefined, // Only include email if available
          contact: quotation.lead.phone ? `${quotation.lead.countryCode || '+91'}${quotation.lead.phone}` : undefined
        },
        notify: {
          sms: !!quotation.lead.phone,
          email: !!quotation.lead.email
        },
        reminder_enable: true,
        notes: {
          quotationId: quotation._id.toString()
        },
        callback_url: callbackUrl,
        callback_method: 'get'
      };

    // Format items for email using the quotation items
    const formattedItems = await Promise.all(
      quotationItems.map(async (item) => {
        let product = null;
        
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
        // Handle bundle products
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
        }
        
        return {
          product: product || {},
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          total: Number((item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)).toFixed(2))
        };
      })
    );

      // Process email data
      const emailData = {
        quotationNumber: quotation.quotationNumber,
        createdDate: new Date(quotation.createdAt).toLocaleDateString(),
        validUntil: new Date(quotation.validUntil).toLocaleDateString(),
        status: quotation.status,
        lead: {
          firstName: quotation.lead.firstName,
          lastName: quotation.lead.lastName,
          businessName: quotation.lead.businessName,
          billingAddress: quotation.lead.billingAddress,
          shippingAddress: quotation.lead.shippingAddress,
          address: quotation.lead.address, // Keep for backward compatibility
          email: quotation.lead.email,
          phone: quotation.lead.phone,
          countryCode: quotation.lead.countryCode
        },
      items: formattedItems,
        total: quotation.total,
        terms: quotation.terms,
        notes: quotation.notes,
        advanceAmount: advanceAmount,
        advancePercentage: advancePercentage
      };

    let paymentLink;
    let pdfBuffer;

    try {
      // Create payment link
      // Ensure minimum amount requirement is met
      if (paymentLinkOptions.amount < 100) {
        paymentLinkOptions.amount = 100; // Set to minimum 1 rupee (100 paise)
      }
      
      paymentLink = await razorpay.paymentLink.create(paymentLinkOptions);
    } catch (error) {
      console.error('Error creating payment link:', error.message);
      notifyClient(req.user.id, quotation._id, 'draft');
      return res.status(400).json({
        success: false,
        message: 'Failed to create payment link. Please check Razorpay credentials and configuration.'
      });
    }

    try {
      // Generate PDF with updated email data including payment link
      const pdfEmailData = {
        ...emailData,
        paymentLink: paymentLink.short_url
      };
      pdfBuffer = await generatePDF('quotation', pdfEmailData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      notifyClient(req.user.id, quotation._id, 'draft');
      return res.status(400).json({
        success: false,
        message: 'Failed to generate PDF'
      });
    }

      // Update emailData with payment link
      emailData.paymentLink = paymentLink.short_url;

    try {
      // Update quotation status first
      const updatedQuotation = await Quotation.findByIdAndUpdate(
        quotation._id,
        {
          status: 'sent',
          advancePaymentAmount: advanceAmount,
          razorpayPaymentLinkId: paymentLink.id,
          razorpayPaymentLink: paymentLink.short_url,
          paymentLinkExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        { new: true }
      ).populate('lead', 'firstName lastName email whatsapp phone countryCode preferredContactMethod billingAddress shippingAddress address businessName').populate('createdBy', 'name');

      // Send notification via smart communication workflow
      try {
        // Prepare complete email data structure (same as sendQuotationNotification)
        const quotationData = {
          quotationNumber: updatedQuotation.quotationNumber,
          createdDate: new Date(updatedQuotation.createdAt).toLocaleDateString(),
          validUntil: new Date(updatedQuotation.validUntil).toLocaleDateString(),
          status: updatedQuotation.status,
          lead: {
            firstName: updatedQuotation.lead.firstName,
            lastName: updatedQuotation.lead.lastName,
            businessName: updatedQuotation.lead.businessName,
            billingAddress: updatedQuotation.lead.billingAddress,
            shippingAddress: updatedQuotation.lead.shippingAddress,
            address: updatedQuotation.lead.address, // Keep for backward compatibility
            email: updatedQuotation.lead.email,
            phone: updatedQuotation.lead.phone,
            countryCode: updatedQuotation.lead.countryCode
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
            }
            
            return {
              product: product,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
              total: Number((item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)).toFixed(2))
            };
          }),
          total: updatedQuotation.total,
          terms: updatedQuotation.terms,
          notes: updatedQuotation.notes,
          advanceAmount: advanceAmount,
          advancePercentage: advancePercentage,
          paymentLink: updatedQuotation.razorpayPaymentLink
        };

        const notificationResult = await sendSmartNotification(
          updatedQuotation.lead,
          'quotation',
          quotationData,
          {
            attachments: [{ filename: `Quotation_${updatedQuotation.quotationNumber}.pdf`, content: pdfBuffer }],
            documentUrl: null // PDF will be sent as attachment for email
          }
        );
        console.log('Smart notification results:', notificationResult);
      } catch (notificationError) {
        console.error('Notification failed but quotation marked as sent:', notificationError.message);
        // Continue with success response even if notification fails
        // The quotation is still marked as sent and can be resent later
      }

      // Return data in the new format
      const quotationWithItems = updatedQuotation.toObject();
      quotationWithItems.quotationItems = quotationItems;

      // Append audit log
      updatedQuotation.auditLogs = updatedQuotation.auditLogs || [];
      updatedQuotation.auditLogs.push({ action: 'sent_to_customer', by: req.user.id, details: { from: 'draft', to: 'sent' } });
      await updatedQuotation.save();

      // Notify sales creator about sent status
      notifyClient(req.user.id, updatedQuotation._id, 'sent');

      return res.json({
        success: true,
        data: quotationWithItems
      });
    } catch (error) {
      console.error('Error updating quotation or sending notifications:', error);
      // Revert status to draft
      await Quotation.findByIdAndUpdate(quotation._id, { status: 'draft' }, { new: false });
      notifyClient(req.user.id, quotation._id, 'draft');
      return res.status(400).json({
        success: false,
        message: 'Failed to update quotation or send notifications'
      });
    }
  } catch (error) {
    console.error('Send quotation error:', error);
    return res.status(500).json({
        success: false,
      message: 'Internal server error'
      });
  }
};

// @desc    Approve quotation
// @route   PUT /api/quotations/:id/approve
exports.handleApproveQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate('lead', 'firstName lastName email whatsapp phone countryCode preferredContactMethod hasWhatsapp whatsappSameAsPhone billingAddress shippingAddress address businessName');
    
    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    if (quotation.status !== 'pending_approval') {
      throw new AppError('Can only approve quotations that are in pending_approval status', 400);
    }

    if (!quotation.lead || (!quotation.lead.email && (!quotation.lead.whatsapp || !quotation.lead.hasWhatsapp))) {
      throw new AppError('Lead data is incomplete. At least one contact method (email or WhatsApp) is required for approval.', 400);
    }

    // Role and segregation of duties: only accounts can approve and cannot approve their own
    if (req.user.role !== 'accounts_department') {
      throw new AppError('Only Accounts Department can approve quotations', 403);
    }
    if (quotation.createdBy && quotation.createdBy.toString() === req.user.id) {
      throw new AppError('Segregation of duties: You cannot approve a quotation you created', 403);
    }

    // Enforce payment confirmation before approval
    if (quotation.advancePaymentStatus !== 'CONFIRMED') {
      // Validate that offline payment details are present and sufficient
      const advancePercentage = quotation.advancePaymentPercentage || 20;
      const requiredAdvance = Number((quotation.total * (advancePercentage / 100)).toFixed(2));
      const paidAmount = Number(quotation.advancePaymentAmount || 0);

      if (isNaN(paidAmount) || paidAmount <= 0) {
        throw new AppError('Missing or invalid advance amount. Please ensure offline payment amount is recorded.', 400);
      }

      if (paidAmount + 1e-6 < requiredAdvance) {
        throw new AppError(`Advance paid (₹${paidAmount.toFixed(2)}) is less than required minimum (₹${requiredAdvance.toFixed(2)}).`, 400);
      }

      if (!quotation.paymentMethod) {
        throw new AppError('Payment method is required for offline payments.', 400);
      }

      // At least some reference or date must exist for audit (except for cash payments)
      if (!quotation.offlineTransactionNo && !quotation.razorpayPaymentId && quotation.paymentMethod !== 'cash') {
        throw new AppError('Reference number is required for offline payment verification.', 400);
      }

      quotation.advancePaymentStatus = 'CONFIRMED';
      quotation.advancePaymentConfirmedAt = quotation.advancePaymentConfirmedAt || new Date();
      await quotation.save();
    }

    const approvedQuotation = await approveQuotation(quotation); 
    
    const quotationItems = await QuotationItem.find({ quotationId: approvedQuotation._id })
      .populate('productId')
      .populate('bundleId')
      .populate('customizedProductId');

    const quotationWithItems = approvedQuotation.toObject();
    quotationWithItems.quotationItems = quotationItems;

    // Audit log
    approvedQuotation.auditLogs = approvedQuotation.auditLogs || [];
    approvedQuotation.auditLogs.push({ action: 'approved', by: req.user.id, details: { to: 'approved' } });
    await approvedQuotation.save();

    try {
      // Notify creator about approval
      if (typeof notifyClient === 'function') {
        notifyClient(approvedQuotation.createdBy, approvedQuotation._id, 'approved');
      }
    } catch (_) {}

    res.json({
      success: true,
      data: quotationWithItems
    });
  } catch (error) {
    console.error('Error in handleApproveQuotation:', error);
    errorHandler(res, error); 
  }
};

// Update the webhook handler to include signature verification
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    // Parse the raw body
    let webhookBody;
    try {
      if (req.body instanceof Buffer) {
        webhookBody = JSON.parse(req.body.toString());
      } else {
        webhookBody = req.body;
      }
    } catch (error) {
      console.error('Error parsing webhook body:', error.message);
      return res.status(400).json({ error: 'Invalid request body format' });
    }

    // Get webhook secret from environment variable
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    
    if (!webhookSecret) {
      console.error('Webhook verification failed: Missing RAZORPAY_WEBHOOK_SECRET environment variable');
      // Still process the webhook in development mode without verifying
      if (process.env.NODE_ENV !== 'development') {
        return res.status(400).json({ error: 'Webhook secret missing in server configuration' });
      }
      console.warn('WARNING: Skipping webhook signature verification in development mode');
    } else if (!signature) {
      console.error('Webhook verification failed: Missing x-razorpay-signature header');
      return res.status(400).json({ error: 'Missing signature header' });
    } else {
      // Verify the signature
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(req.body instanceof Buffer ? req.body : JSON.stringify(webhookBody));
      const digest = shasum.digest('hex');

      if (signature !== digest) {
        console.error('Invalid webhook signature. Received:', signature, 'Expected:', digest);
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const { payload, event } = webhookBody;
    
    if (!payload || !payload.payment_link) {
      console.error('Invalid webhook payload structure:', JSON.stringify(webhookBody));
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    const { payment_link } = payload;
    console.log(`Processing webhook event: ${event}, payment_link_id: ${payment_link.id}, payment_id: ${payment_link.payment_id}`);

    if (event === 'payment_link.paid') {
      // Extra verification with Razorpay API
      try {
        const paymentVerification = await razorpay.verifyPaymentStatus(payment_link.payment_id);
        console.log(`Payment verification via API successful. Status: ${paymentVerification.payment.status}`);
      } catch (verificationError) {
        console.error('Error verifying payment with API (continuing with webhook):', verificationError.message);
      }
      
      const quotation = await Quotation.findOne({ 
        razorpayPaymentLinkId: payment_link.id 
      }).populate('lead', 'firstName lastName email whatsapp phone countryCode preferredContactMethod hasWhatsapp whatsappSameAsPhone billingAddress shippingAddress address businessName');

      if (!quotation) {
        console.error(`Quotation not found for payment link ID: ${payment_link.id}`);
        return res.json({ status: 'error', message: 'Quotation not found' });
      }

      // Update payment status and auto-approve for online payments
      quotation.advancePaymentStatus = 'CONFIRMED';
      quotation.advancePaymentConfirmedAt = new Date();
      quotation.razorpayPaymentId = payment_link.payment_id;
      quotation.auditLogs = quotation.auditLogs || [];
      quotation.auditLogs.push({ action: 'payment_confirmed', details: { source: 'razorpay_webhook' } });

      try {
        const approvedQuotation = await approveQuotation(quotation);

        // Notify creator about approval
        if (typeof notifyClient === 'function') {
          const userId = approvedQuotation.createdBy;
          notifyClient(userId, approvedQuotation._id, 'approved');
        }

        return res.json({ status: 'success', message: 'Payment processed and quotation approved' });
      } catch (approvalError) {
        console.error('Auto-approval error after webhook:', approvalError.message);
        return res.json({ status: 'partial', message: 'Payment recorded but approval failed', error: approvalError.message });
      }
    } else {
      console.log(`Ignoring webhook event: ${event} (not handled)`);
      return res.json({ status: 'ignored', message: 'Event type not handled' });
    }
  } catch (error) {
    console.error('Webhook processing error:', error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
};

// Main helper function for the approval process logic
const approveQuotation = async (quotationInstance) => { 
  try {
    console.log(`Starting approval process for quotation ID: ${quotationInstance._id}.`);
    
    const lead = quotationInstance.lead;
    if (!lead) {
        throw new AppError('Critical: Lead data missing in quotation for approval.', 500);
    }

    // Ensure we have at least one contact method (phone is now primary, email is optional)
    if (!lead.phone && !lead.email) {
        throw new AppError('Critical: Lead contact information (phone or email) missing in quotation for approval.', 500);
    }

    let user = null;
    if (lead.phone) {
      user = await User.findOne({ phone: lead.phone, role: 'customer' });
    } else if (lead.email) {
      user = await User.findOne({ email: lead.email, role: 'customer' });
    }
    let leadUserId; // Renamed variable for clarity to avoid confusion with req.user.id if used elsewhere
    
    if (user) {
      leadUserId = user._id;
      console.log(`Existing user found: ${leadUserId} for phone ${lead.phone}`);
    } else {
      const password = Math.random().toString(36).slice(-8);
      user = new User({ 
        name: `${lead.firstName} ${lead.lastName}`,
        phone: lead.phone,
        email: lead.email || undefined,
        password, 
        role: 'customer'
      });
      await user.save();
      leadUserId = user._id;
      console.log(`New user created: ${leadUserId} for phone ${lead.phone}`);
      try {
        // Send welcome notification via available channels with lead's contact preferences
        await sendWelcomeNotification(user, password, {
          preferredContactMethod: lead.preferredContactMethod,
          hasWhatsapp: lead.hasWhatsapp,
          whatsappSameAsPhone: lead.whatsappSameAsPhone,
          whatsapp: lead.whatsapp,
          countryCode: lead.countryCode
        });
        console.log(`Welcome notification sent to ${user.phone}`);
      } catch (notificationError) {
        console.error(`Failed to send welcome notification to ${user.phone}:`, notificationError.message);
      }
    }
    
    // Find existing customer by phone (primary) or email (fallback)
    let customer = null;
    if (lead.phone) {
      customer = await Customer.findOne({ phone: lead.phone });
    }
    if (!customer && lead.email) {
      customer = await Customer.findOne({ email: lead.email });
    }
    
    if (!customer) {
      console.log(`Creating new customer record for phone: ${lead.phone} (email: ${lead.email || 'N/A'}) with user ID: ${leadUserId}`);
      customer = new Customer({ 
        leadId: lead._id,
        user: leadUserId, // Changed to use 'user' field as per updated Customer model
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email || undefined,
        phone: lead.phone,
        whatsapp: lead.whatsapp || undefined,
        whatsappSameAsPhone: lead.whatsappSameAsPhone,
        hasWhatsapp: lead.hasWhatsapp,
        countryCode: lead.countryCode || '+91',
        businessName: lead.businessName || '',
        address: lead.billingAddress || lead.address || '',
        customerType: lead.leadType || 'end_user'
      });
      await customer.save();
      console.log(`Created customer with ID: ${customer._id}`);
    } else {
      console.log(`Existing customer found: ${customer._id} for phone: ${lead.phone} (email: ${lead.email || 'N/A'})`);
      if (!customer.user && leadUserId) { // Check if the 'user' field needs linking
        customer.user = leadUserId; // Use 'user' field
        await customer.save();
        console.log(`Linked existing customer ${customer._id} to user ${leadUserId} via 'user' field.`);
      } else if (customer.user && leadUserId && customer.user.toString() !== leadUserId.toString()) {
        console.warn(`Customer ${customer._id} (email: ${lead.email}) is already linked to user ${customer.user}. Attempted to link to ${leadUserId}. Keeping existing link.`);
      }
    }
    
    const purchaseTotalAmount = quotationInstance.total;

    const advanceAmount = quotationInstance.advancePaymentAmount; 
    if (typeof advanceAmount !== 'number' || advanceAmount < 0) {
        throw new AppError(`Invalid advance payment amount (₹${advanceAmount}) for quotation ${quotationInstance._id}. It must be a non-negative number.`, 400);
    }

    const remainingAmount = Number((purchaseTotalAmount - advanceAmount).toFixed(2));
    const actualAdvancePercentage = purchaseTotalAmount > 0 ? Math.round((advanceAmount / purchaseTotalAmount) * 100) : 0;
    
    let customerPurchase = await CustomerPurchase.findOne({ 
      customerId: customer._id,
      quotationId: quotationInstance._id
    });
    
    if (!customerPurchase) {
      const purchaseCount = await CustomerPurchase.countDocuments();
      const purchaseID = `PO-${String(purchaseCount + 1).padStart(5, '0')}`;
      
      console.log(`Creating CustomerPurchase for quotation ${quotationInstance._id}, customer ${customer._id}. Advance: ₹${advanceAmount}, Total: ₹${purchaseTotalAmount}`);
      
      customerPurchase = new CustomerPurchase({ 
        purchaseID, 
        customerId: customer._id,
        quotationId: quotationInstance._id,
        advancePaid: advanceAmount,
        totalAmount: purchaseTotalAmount, 
        remainingAmount: remainingAmount,
        isFullyPaid: remainingAmount <= 0.01, 
        paymentMethod: quotationInstance.paymentMethod || 'cash',
        status: 'active',
        purchaseDate: quotationInstance.advancePaymentConfirmedAt || new Date(), 
        advancePaymentPercentage: actualAdvancePercentage 
      });
      await customerPurchase.save();
      console.log(`Created CustomerPurchase with ID: ${customerPurchase._id}`);
      
      // Update customer status since they now have an active purchase order
      try {
        const { updateCustomerStatus } = require('./customerPurchaseController');
        await updateCustomerStatus(customer._id);
      } catch (statusError) {
        console.error('Error updating customer status:', statusError);
        // Don't fail the main operation if status update fails
      }
      
      const paymentRecord = new Payment({ 
        customerPurchaseId: customerPurchase._id,
        amountPaid: advanceAmount,
        paymentMethod: quotationInstance.paymentMethod || 'cash', 
        transactionId: quotationInstance.razorpayPaymentId || quotationInstance.offlineTransactionNo || `ADV-${purchaseID}`,
        isAdvancePayment: true,
        paymentDate: quotationInstance.advancePaymentConfirmedAt || new Date(), 
        createdBy: quotationInstance.createdBy 
      });
      await paymentRecord.save();
      console.log(`Created Payment record for advance: ${paymentRecord._id}`);

    } else {
        console.log(`CustomerPurchase ${customerPurchase._id} already exists for quotation ${quotationInstance._id}. Skipping creation.`);
    }

    quotationInstance.status = 'approved';
    await quotationInstance.save();
    console.log(`Quotation ${quotationInstance._id} status updated to 'approved'. Approval process complete.`);

    // Create notification for quotation approval
    try {
      await NotificationService.createQuotationNotification('quotation_approved', quotationInstance);
    } catch (notificationError) {
      console.error('Failed to create quotation approval notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    return quotationInstance; 
  } catch (error) {
    console.error('Error in approveQuotation helper:', error.message, error.stack);
    throw error; 
  }
};

// @desc    Confirm offline payment
// @route   POST /api/quotations/:id/offline-payment
exports.confirmOfflinePayment = async (req, res) => {
  try {
    const { amount, transactionNo, paymentMethod, paymentDate, notes } = req.body;
    
    let quotation = await Quotation.findById(req.params.id).populate('lead', 'firstName lastName email whatsapp phone countryCode preferredContactMethod hasWhatsapp whatsappSameAsPhone billingAddress shippingAddress address businessName');

    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    // Block offline confirmation if already paid via Razorpay
    if (quotation.razorpayPaymentId) {
      throw new AppError('Online payment already recorded. Offline confirmation is disabled for this quotation.', 400);
    }

    if (quotation.status === 'approved' || quotation.status === 'pending_approval') {
        console.log(`Quotation ${quotation._id} is already approved. Offline payment confirmation redundant unless updating details.`);
        const items = await QuotationItem.find({ quotationId: quotation._id })
          .populate('productId')
          .populate('bundleId')
          .populate('customizedProductId');
        const approvedQuotationWithItems = quotation.toObject();
        approvedQuotationWithItems.quotationItems = items;
        return res.json({
          success: true,
          message: 'Quotation is already approved. Payment details (if new) have been noted.',
          data: approvedQuotationWithItems
        });
    }
    
    if (quotation.status !== 'sent') {
      throw new AppError('Can only confirm payment for sent quotations that are not yet approved.', 400);
    }

    const advancePercentage = quotation.advancePaymentPercentage || 20;
    const minimumAdvance = Number((quotation.total * (advancePercentage/100)).toFixed(2));
    const paymentAmount = Number(parseFloat(amount).toFixed(2));

    if (isNaN(paymentAmount) || paymentAmount <=0) {
        throw new AppError('Invalid payment amount provided.', 400);
    }

    if (paymentAmount < minimumAdvance) {
      throw new AppError(`Advance payment (₹${paymentAmount}) must be at least ₹${minimumAdvance.toFixed(2)} (${advancePercentage}% of total amount)`, 400);
    }

    if (!quotation.lead || (!quotation.lead.email && (!quotation.lead.whatsapp || !quotation.lead.hasWhatsapp))) {
      throw new AppError('Lead data is incomplete. At least one contact method (email or WhatsApp) is required.', 400);
    }

    quotation.advancePaymentStatus = 'CONFIRMED';
    quotation.advancePaymentAmount = paymentAmount; 
    quotation.advancePaymentConfirmedAt = paymentDate ? new Date(paymentDate) : new Date();
    // For cash payments, generate a default reference if none provided
    quotation.offlineTransactionNo = transactionNo || (paymentMethod === 'cash' ? `CASH-${Date.now()}-${quotation.quotationNumber}` : transactionNo);
    
    if (paymentMethod) quotation.paymentMethod = paymentMethod; 
    if (notes) quotation.paymentNotes = notes;
    
    await quotation.save();

    // Attempt to cancel/expire any active Razorpay payment link for this quotation
    try {
      if (quotation.razorpayPaymentLinkId) {
        await razorpay.paymentLink.cancel(quotation.razorpayPaymentLinkId);
        quotation.razorpayPaymentLinkId = undefined;
        quotation.razorpayPaymentLink = undefined;
        await quotation.save();
      }
    } catch (plErr) {
      console.warn('Failed to cancel Razorpay payment link (non-blocking):', plErr.message);
    }
    console.log(`Quotation ${quotation._id}: Updated with offline payment details.`);

    // Move to pending_approval and notify accounts
    quotation.status = 'pending_approval';
    quotation.auditLogs = quotation.auditLogs || [];
    quotation.auditLogs.push({ action: 'payment_confirmed_offline', by: req.user.id });
    quotation.auditLogs.push({ action: 'moved_to_pending_approval' });
    await quotation.save();

    try {
      if (typeof notifyRole === 'function') {
        notifyRole('accounts_department', { quotationId: quotation._id.toString(), status: 'pending_approval' });
      }
    } catch (_) {}

    const quotationItems = await QuotationItem.find({ quotationId: quotation._id })
      .populate('productId')
      .populate('bundleId')
      .populate('customizedProductId');

    const quotationWithItems = quotation.toObject(); 
    quotationWithItems.quotationItems = quotationItems;
    
    res.json({
      success: true,
      message: 'Offline payment confirmed; awaiting accounts approval.',
      data: quotationWithItems 
    });
  } catch (error) {
    console.error('Error in confirmOfflinePayment:', error);
    if (error && error.code === 11000 && error.keyPattern && error.keyPattern.offlineTransactionNo) {
      return res.status(400).json({ success: false, message: 'This transaction/reference number is already used. Please enter a unique reference.' });
    }
    errorHandler(res, error);
  }
};

// Add this new controller function
exports.getCustomerProducts = async (req, res) => {
  try {
    // Verify user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Step 1: Find customer record associated with this user
    const customer = await Customer.findOne({ user: req.user._id });

    if (!customer) {
      return res.json({
        success: true,
        data: []
      });
    }

    try {
      // Step 2: Find all purchases made by this customer
      const customerPurchases = await CustomerPurchase.find({ 
        customerId: customer._id 
      }).populate({
        path: 'quotationId',
        select: 'quotationNumber advancePaymentPercentage advancePaymentConfirmedAt advancePaymentAmount'
      });
      
      if (!customerPurchases || customerPurchases.length === 0) {
        return res.json({
          success: true,
          data: []
        });
      }
      
      // Step 3: Get quotation IDs to fetch quotation items
      const quotationIds = customerPurchases
        .filter(purchase => purchase.quotationId && purchase.quotationId._id)
        .map(purchase => purchase.quotationId._id);
      
      // Step 4: Get all quotation items with product details
      const quotationItems = await QuotationItem.find({
        quotationId: { $in: quotationIds }
      }).populate('productId')
        .populate('bundleId')
        .populate('customizedProductId');
      
      // Step 5: Group quotation items by quotation ID for easier lookup
      const itemsByQuotationId = {};
      quotationItems.forEach(item => {
        const quotationIdStr = item.quotationId.toString();
        if (!itemsByQuotationId[quotationIdStr]) {
          itemsByQuotationId[quotationIdStr] = [];
        }
        itemsByQuotationId[quotationIdStr].push(item);
      });
      
      // Step 6: Format the data for the frontend
      const products = [];
      
      customerPurchases.forEach(purchase => {
        const quotation = purchase.quotationId;
        const quotationIdStr = quotation._id.toString();
        const items = itemsByQuotationId[quotationIdStr] || [];
        
        // Get purchase-specific data
        const purchaseData = {
              quotationNumber: quotation.quotationNumber,
          purchaseDate: purchase.purchaseDate || quotation.advancePaymentConfirmedAt,
          purchaseId: purchase._id,
          purchaseID: purchase.purchaseID,
          totalAmount: purchase.totalAmount,
          advancePaid: purchase.advancePaid,
          remainingAmount: purchase.remainingAmount,
          isFullyPaid: purchase.isFullyPaid,
          advancePaymentPercentage: purchase.advancePaymentPercentage || Math.round((purchase.advancePaid / purchase.totalAmount) * 100),
          paymentStatus: purchase.isFullyPaid ? 'FULLY_PAID' : 'ADVANCE_PAID'
        };
        
        // Add each item with the purchase data
        items.forEach(item => {
          if (!item.productId) return;

          const productDisplayData = {
            _id: item.productId._id,
            name: item.productId.name,
            description: item.productId.description,
            category: item.productId.category,
            imageUrl: (item.productId.imageUrls && item.productId.imageUrls.length > 0) ? item.productId.imageUrls[0] : null
          };
          
          products.push({
            quotationNumber: purchaseData.quotationNumber,
            purchaseDate: purchaseData.purchaseDate,
            purchaseId: purchaseData.purchaseId,
            purchaseID: purchaseData.purchaseID,
            product: productDisplayData,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            total: item.quantity * item.unitPrice * (1 - (item.discount || 0)/100),
            isFullyPaid: purchaseData.isFullyPaid,
            advancePaymentPercentage: purchaseData.advancePaymentPercentage,
            advancePaymentAmount: purchaseData.advancePaid,
            totalAmount: purchaseData.totalAmount,
            remainingAmount: purchaseData.remainingAmount,
            paymentStatus: purchaseData.paymentStatus
          });
        });
      });
      
      // console.log('Final products data being sent to frontend:', JSON.stringify(products, null, 2)); // Logging removed

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error processing customer purchases:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in getCustomerProducts:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer products',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : 'Server Error'
    });
  }
};

// Add this new controller function
exports.getPendingPayments = async (req, res) => {
  try {
    // Find the lead associated with the user
    const lead = await Lead.findOne({ email: req.user.email });
    
    if (!lead) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Find all quotations for the lead
    const quotations = await Quotation.find({
      lead: lead._id,
      status: { $in: ['sent', 'approved'] }
    }).select(
      'quotationNumber total advancePaymentStatus advancePaymentAmount ' +
      'advancePaymentConfirmedAt razorpayPaymentLink razorpayPaymentId ' +
      'offlineTransactionNo createdAt'
    );

    // Format the response data
    const formattedQuotations = quotations.map(q => ({
      _id: q._id,
      quotationNumber: q.quotationNumber,
      total: q.total,
      advancePaymentStatus: q.advancePaymentStatus,
      advancePaymentAmount: q.advancePaymentAmount,
      advancePaymentConfirmedAt: q.advancePaymentConfirmedAt,
      razorpayPaymentLink: q.razorpayPaymentLink,
      razorpayPaymentId: q.razorpayPaymentId,
      offlineTransactionNo: q.offlineTransactionNo,
      createdAt: q.createdAt
    }));

    res.json({
      success: true,
      data: formattedQuotations
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending payments',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : 'Server Error'
    });
  }
};

// Add a new controller to check payment status
exports.checkPaymentStatus = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .select('quotationNumber advancePaymentStatus razorpayPaymentId status');
      
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }
    
    // Respond with payment status
    res.json({
      success: true,
      data: {
        quotationId: quotation._id,
        quotationNumber: quotation.quotationNumber,
        paymentStatus: quotation.advancePaymentStatus,
        paymentId: quotation.razorpayPaymentId,
        quotationStatus: quotation.status
      }
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking payment status'
    });
  }
};

// Add a new controller for public payment status
exports.checkPublicPaymentStatus = async (req, res) => {
  try {
    const { paymentId, quotationId } = req.query;
    
    // Log all query parameters for debugging
    console.log('Public payment status check. Received query parameters:', req.query);
    
    if (!paymentId || !quotationId) {
      console.error('Public payment status check failed: Missing required paymentId or quotationId.', req.query);
      return res.status(400).json({
        success: false,
        message: 'Missing payment ID or quotation ID',
        providedParams: req.query
      });
    }
    
    console.log(`Public payment status check for quotation: '${quotationId}', paymentId: '${paymentId}'`);
    
    const mongoose = require('mongoose'); // Ensure mongoose is available

    if (typeof quotationId !== 'string' || !mongoose.Types.ObjectId.isValid(quotationId)) {
      console.error(`Invalid Quotation ID format: '${quotationId}'. Must be a 24-character hex string.`);
      return res.status(400).json({
        success: false,
        message: `Invalid Quotation ID format: ${quotationId}`,
        quotationId
      });
    }
    
    const cleanQuotationId = new mongoose.Types.ObjectId(quotationId);
    console.log(`Searching for quotation with ObjectId: '${cleanQuotationId.toString()}'`);
    
    try {
      // Find the quotation using payment ID and quotation ID
      const quotation = await Quotation.findOne({
        _id: cleanQuotationId,
        razorpayPaymentId: paymentId
      }).select('quotationNumber advancePaymentStatus advancePaymentAmount razorpayPaymentId status');
      
      // If no quotation is found with matching payment ID, check if it exists at all
      if (!quotation) {
        console.log(`No quotation found with _id: '${cleanQuotationId.toString()}' AND razorpayPaymentId: '${paymentId}'. Checking for quotation by ID only.`);
        // Try to find the quotation without payment ID (payment might be in process)
        const pendingQuotation = await Quotation.findById(cleanQuotationId)
          .select('quotationNumber advancePaymentStatus advancePaymentAmount razorpayPaymentId status lead'); // Added lead for potential email
        
        if (!pendingQuotation) {
          console.error(`Quotation not found by ID: '${cleanQuotationId.toString()}'. Original query quotationId was: '${quotationId}'.`);
          return res.status(404).json({
            success: false,
            message: 'Quotation not found',
            quotationId: quotationId, // Return original id from query
            debug: { 
              searchedObjectId: cleanQuotationId.toString(),
              isValidOriginalId: mongoose.Types.ObjectId.isValid(quotationId)
            }
          });
        }
        
        // If payment ID is provided but doesn't match the quotation, verify payment with Razorpay API
        if (paymentId && pendingQuotation.status === 'sent') {
          try {
            console.log(`Verifying payment with Razorpay API for paymentId: '${paymentId}' as it's not yet on quotation '${pendingQuotation._id}'.`);
            // Verify payment status directly with Razorpay API
            const paymentVerification = await razorpay.verifyPaymentStatus(paymentId);
            
            // If payment is verified successfully and quotation is still in "sent" status
            if (paymentVerification.verified) {      
              console.log(`Payment '${paymentId}' verified with Razorpay API. Payment status: ${paymentVerification.payment.status}. Quotation '${pendingQuotation._id}' status: '${pendingQuotation.status}'.`);
              // Return a special status indicating the payment is verified with Razorpay 
              // but not yet processed in our system
              return res.json({
                success: true,
                message: 'Payment verified with Razorpay API but not yet recorded in system. Webhook will process shortly.',
                data: {
                  quotationId: pendingQuotation._id,
                  quotationNumber: pendingQuotation.quotationNumber,
                  paymentStatus: 'RAZORPAY_VERIFIED', // Custom status
                  quotationStatus: pendingQuotation.status,
                  razorpayPaymentStatus: paymentVerification.payment.status,
                  paymentAmount: paymentVerification.payment.amount // Amount in paise
                }
              });
            } else {
              console.warn(`Razorpay API verification failed or payment not successful for paymentId '${paymentId}'. Status: ${paymentVerification.payment?.status}`);
            }
          } catch (error) {
            console.error('Error verifying payment with Razorpay API during public status check:', error.message);
            // Continue with normal flow (return PENDING) even if API verification fails, 
            // as webhook is the source of truth for updates.
          }
        }
        
        console.log(`Returning current status for quotation: '${pendingQuotation._id}'. Payment Status: '${pendingQuotation.advancePaymentStatus}', Quotation Status: '${pendingQuotation.status}'.`);
        // Return normal status if API verification fails or is not applicable
        return res.json({
          success: true,
          data: {
            quotationId: pendingQuotation._id,
            quotationNumber: pendingQuotation.quotationNumber,
            paymentStatus: pendingQuotation.advancePaymentStatus || 'PENDING', // Fallback to PENDING
            quotationStatus: pendingQuotation.status
          }
        });
      }
      
      console.log(`Found quotation with matching _id and razorpayPaymentId. Quotation Status: '${quotation.status}', Payment status: '${quotation.advancePaymentStatus}'.`);
      // Return payment details from our database for existing payments
      return res.json({
        success: true,
        data: {
          quotationId: quotation._id,
          quotationNumber: quotation.quotationNumber,
          paymentStatus: quotation.advancePaymentStatus,
          paymentAmount: quotation.advancePaymentAmount,
          paymentId: quotation.razorpayPaymentId,
          quotationStatus: quotation.status
        }
      });
    } catch (dbError) {
      console.error('Database error in public payment status check:', dbError.message, dbError.stack);
      return res.status(500).json({
        success: false,
        message: 'Database error checking payment status',
        error: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Unexpected error in checkPublicPaymentStatus controller:', error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: 'Error checking payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Simplify manual payment confirmation
exports.manualConfirmPayment = async (req, res) => {
  try {
    const { quotationId, paymentId, paymentLinkId } = req.body;
    
    if (!quotationId || !paymentId || !paymentLinkId) {
      console.error('Manual payment confirmation failed: Missing required parameters', req.body);
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: quotationId, paymentId, paymentLinkId'
      });
    }
    
    console.log(`Manual payment confirmation request for quotation: ${quotationId}, paymentId: ${paymentId}`);
    
    // Find the quotation
    const quotation = await Quotation.findById(quotationId).populate('lead', 'firstName lastName email whatsapp phone countryCode preferredContactMethod hasWhatsapp whatsappSameAsPhone billingAddress shippingAddress address businessName');
    
    if (!quotation) {
      console.error(`Quotation not found: ${quotationId}`);
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }
    
    // If payment is already confirmed and approved, just return success
    if (quotation.advancePaymentStatus === 'CONFIRMED' && quotation.status === 'approved') {
      console.log(`Payment already confirmed for quotation: ${quotationId}`);
      return res.json({
        success: true,
        message: 'Payment already confirmed',
        data: {
          quotationId: quotation._id,
          quotationNumber: quotation.quotationNumber,
          paymentStatus: quotation.advancePaymentStatus,
          quotationStatus: quotation.status
        }
      });
    }
    
    // DIRECT VERIFICATION WITH RAZORPAY API
    try {
      console.log(`Verifying payment with Razorpay API: ${paymentId}`);
      // Verify payment status directly with Razorpay
      const paymentVerification = await razorpay.verifyPaymentStatus(paymentId);
      
      if (!paymentVerification.verified) {
        console.error(`Payment verification failed for ${paymentId}. Razorpay status: ${paymentVerification.payment.status}`);
        return res.status(400).json({
          success: false,
          message: `Payment verification failed. Razorpay status: ${paymentVerification.payment.status}`,
          data: paymentVerification.payment
        });
      }
      
      console.log(`Payment verification successful. Status: ${paymentVerification.payment.status}`);
      
      // Also verify payment link if possible
      try {
        await razorpay.verifyPaymentLinkStatus(paymentLinkId);
        console.log(`Payment link verification successful: ${paymentLinkId}`);
      } catch (linkError) {
        // Non-blocking error, continue
        console.error('Error verifying payment link (non-blocking):', linkError.message);
      }
      
      // Update payment details
      quotation.advancePaymentStatus = 'CONFIRMED';
      quotation.advancePaymentConfirmedAt = new Date();
      quotation.razorpayPaymentId = paymentId;
      
      // If payment link ID doesn't match but we have a new one, update it
      if (paymentLinkId && quotation.razorpayPaymentLinkId !== paymentLinkId) {
        quotation.razorpayPaymentLinkId = paymentLinkId;
      }
      
      await quotation.save();
      console.log(`Quotation ${quotationId} updated with payment details`);
      
      // Approve the quotation
      try {
        console.log(`Approving quotation ${quotationId}`);
    const approvedQuotation = await approveQuotation(quotation); 
        
        // Notify the sales person if websocket utils are available
        if (typeof notifyClient === 'function') {
          const userId = quotation.createdBy;
          notifyClient(userId, quotation._id, 'approved');
          console.log(`Notification sent to user ${userId} about quotation approval`);
        }
        
        return res.json({
          success: true,
          message: 'Payment verified via Razorpay API and quotation approved',
          data: {
            quotationId: approvedQuotation._id,
            quotationNumber: approvedQuotation.quotationNumber,
            paymentStatus: 'CONFIRMED',
            quotationStatus: 'approved',
            verificationMethod: 'razorpay_api'
          }
        });
      } catch (error) {
        console.error('Error in approval after API verification:', error.message, error.stack);
        return res.status(500).json({
          success: false,
          message: 'Payment verified but approval failed',
          error: error.message
        });
      }
    } catch (verificationError) {
      console.error('Razorpay API verification failed:', verificationError.message);
      
      // Fallback to signature verification if API verification fails
      
      // Check if the payment is already registered but quotation not approved
      if (quotation.razorpayPaymentId === paymentId || quotation.razorpayPaymentLinkId === paymentLinkId) {
        console.log(`Using fallback verification: Payment ID/Link matches quotation records`);
        
        // Update payment details if not already set
        if (quotation.advancePaymentStatus !== 'CONFIRMED') {
          quotation.advancePaymentStatus = 'CONFIRMED';
          quotation.advancePaymentConfirmedAt = new Date();
          
          // Set payment ID if not already set
          if (!quotation.razorpayPaymentId) {
            quotation.razorpayPaymentId = paymentId;
          }
          
          await quotation.save();
          console.log(`Updated payment status using fallback method for quotation ${quotationId}`);
        }
        
        // Approve quotation if not already approved
        if (quotation.status !== 'approved') {
          try {
            // Use the helper function to create customer and approve quotation
            console.log(`Approving quotation ${quotationId} via fallback method`);
            const approvedQuotation = await approveQuotation(quotation);
            
            // Notify the sales person if websocket utils are available
            if (typeof notifyClient === 'function') {
              const userId = quotation.createdBy;
              notifyClient(userId, quotation._id, 'approved');
            }
            
            return res.json({
              success: true,
              message: 'Payment confirmed via fallback method and quotation approved',
              data: {
                quotationId: approvedQuotation._id,
                quotationNumber: approvedQuotation.quotationNumber,
                paymentStatus: 'CONFIRMED',
                quotationStatus: 'approved',
                verificationMethod: 'fallback'
              }
            });
          } catch (error) {
            console.error('Error in fallback approval process:', error.message, error.stack);
            return res.status(500).json({
              success: false,
              message: 'Payment confirmed but approval failed',
              error: error.message
            });
          }
        } else {
          // Already approved, just return success
          console.log(`Quotation ${quotationId} already approved`);
          return res.json({
            success: true,
            message: 'Payment confirmed via fallback and quotation already approved',
            data: {
              quotationId: quotation._id,
              quotationNumber: quotation.quotationNumber,
              paymentStatus: 'CONFIRMED',
              quotationStatus: 'approved',
              verificationMethod: 'fallback'
            }
          });
        }
      } else {
        // This is a new payment ID not matching what's in the quotation
        // In this case, since API verification failed and IDs don't match, we should be cautious
        console.error(`Payment verification failed and payment details do not match quotation records. 
          Quotation payment ID: ${quotation.razorpayPaymentId}, 
          Quotation payment link ID: ${quotation.razorpayPaymentLinkId},
          Provided payment ID: ${paymentId},
          Provided payment link ID: ${paymentLinkId}`);
        
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed and payment details do not match existing records',
          error: verificationError.message
        });
      }
    }
  } catch (error) {
    console.error('Manual payment confirmation error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Error processing manual payment confirmation',
      error: error.message
    });
  }
};

// Close quotation when lead does not accept it
exports.closeQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Only allow closing sent quotations
    if (quotation.status !== 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Can only close quotations that have been sent'
      });
    }

    // Update quotation status
    quotation.status = 'closed';
    quotation.closedAt = new Date();
    quotation.closedBy = req.user.id;
    if (req.body.closeReason) {
      quotation.closeReason = req.body.closeReason;
    }
    
    await quotation.save();

    res.json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Close quotation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error closing quotation'
    });
  }
};

// Remove the duplicate exports at the bottom and replace with:
module.exports = {
  getQuotations: exports.getQuotations,
  getQuotation: exports.getQuotation,
  createQuotation: exports.createQuotation,
  updateQuotation: exports.updateQuotation,
  deleteQuotation: exports.deleteQuotation,
  sendQuotation: exports.sendQuotation,
  handleApproveQuotation: exports.handleApproveQuotation,
  handleRazorpayWebhook: exports.handleRazorpayWebhook,
  confirmOfflinePayment: exports.confirmOfflinePayment,
  getCustomerProducts: exports.getCustomerProducts,
  getPendingPayments: exports.getPendingPayments,
  checkPaymentStatus: exports.checkPaymentStatus,
  checkPublicPaymentStatus: exports.checkPublicPaymentStatus,
  manualConfirmPayment: exports.manualConfirmPayment,
  closeQuotation: exports.closeQuotation
}; 
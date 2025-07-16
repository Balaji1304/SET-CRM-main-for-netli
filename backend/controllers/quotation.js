const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');
const User = require('../models/User');
const Lead = require('../models/Lead');
const sendEmail = require('../utils/sendEmail');
const { sendQuotationNotification, sendWelcomeNotification } = require('../utils/sendNotification');
const { generateQuotationNumber } = require('../utils/generateNumbers');
const generatePDF = require('../utils/generatePDF');
const { registerHelpers } = require('../utils/handlebarsHelpers');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { notifyClient } = require('../utils/websocket');
const { errorHandler, AppError } = require('../utils/errorHandler');
const Customer = require('../models/Customer');
const CustomerPurchase = require('../models/CustomerPurchase');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');

// Register handlebars helpers
registerHelpers();

// @desc    Get all quotations
// @route   GET /api/quotations
exports.getQuotations = async (req, res) => {
  try {
    let query = {};
    
    // If user is a sales person, only show their quotations
    if (req.user.role === 'sales_person') {
      query.createdBy = req.user.id;
    }
    
    // If user is a customer, only show quotations related to their leads
    if (req.user.role === 'customer') {
      // Find leads associated with this customer's email
      const leads = await Lead.find({ email: req.user.email });
      const leadIds = leads.map(lead => lead._id);
      query.lead = { $in: leadIds };
    }

    const quotations = await Quotation.find(query)
      .populate('lead', 'firstName lastName email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 }); // Sort by newest first

    // Get quotation items for all quotations in a single query
    const quotationIds = quotations.map(q => q._id);
    const allQuotationItems = await QuotationItem.find({ quotationId: { $in: quotationIds } })
      .populate('productId');
    
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

    // Check access permissions
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

    // Get quotation items
    const quotationItems = await QuotationItem.find({ quotationId: quotation._id })
      .populate('productId');

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
    const { leadId, quotationItems, terms, notes, advancePaymentPercentage } = req.body;

    // Validate advance payment percentage
    const percentage = parseInt(advancePaymentPercentage) || 20;
    if (percentage < 1 || percentage > 100) {
      throw new AppError('Advance payment percentage must be between 1 and 100', 400);
    }

    // Calculate totals for Quotation (overall)
    // This requires individual quotation item subtotals to be calculated first
    let calculatedQuotationSubtotal = 0;
    for (const item of quotationItems) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discountPercentage = Number(item.discount || 0);
      if (isNaN(quantity) || isNaN(unitPrice) || isNaN(discountPercentage)) {
        throw new AppError('Invalid item quantity, unit price, or discount percentage.', 400);
      }
      calculatedQuotationSubtotal += quantity * unitPrice * (1 - discountPercentage / 100);
    }
    calculatedQuotationSubtotal = Number(calculatedQuotationSubtotal.toFixed(2));

    const tax = Number((calculatedQuotationSubtotal * 0.18).toFixed(2)); // Assuming 18% tax on the corrected subtotal
    const total = Number((calculatedQuotationSubtotal + tax).toFixed(2));

    // Create quotation
    const quotation = await Quotation.create({
      lead: leadId,
      quotationNumber: await generateQuotationNumber(),
      subtotal: calculatedQuotationSubtotal, // Use the correctly calculated subtotal
      tax,
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
      if (!item.productId) {
        throw new AppError('Product ID is required for each item', 400);
      }
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discountPercentage = Number(item.discount || 0); // Assuming item.discount is percentage

      // Calculate subtotal for this specific QuotationItem
      const itemSubtotal = Number((quantity * unitPrice * (1 - discountPercentage / 100)).toFixed(2));
      
      const quotationItem = await QuotationItem.create({
        quotationId: quotation._id,
        productId: item.productId,
        quantity: quantity,
        unitPrice: unitPrice,
        discount: discountPercentage, // Store discount as percentage
        subtotal: itemSubtotal // Store correctly calculated item subtotal
      });
      createdQuotationItems.push(quotationItem);
    }

    // Get populated quotation with lead info
    const populatedQuotation = await Quotation.findById(quotation._id).populate('lead');

    // Return the data in the new format
    const quotationWithItems = populatedQuotation.toObject();
    quotationWithItems.quotationItems = createdQuotationItems;

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

    // Recalculate totals for Quotation (overall) based on updated items
    let calculatedQuotationSubtotal = 0;
    for (const item of quotationItems) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discountPercentage = Number(item.discount || 0);
      if (isNaN(quantity) || isNaN(unitPrice) || isNaN(discountPercentage)) {
        throw new AppError('Invalid item quantity, unit price, or discount percentage.', 400);
      }
      calculatedQuotationSubtotal += quantity * unitPrice * (1 - discountPercentage / 100);
    }
    calculatedQuotationSubtotal = Number(calculatedQuotationSubtotal.toFixed(2));
    
    const tax = Number((calculatedQuotationSubtotal * 0.18).toFixed(2)); // Assuming 18% tax
    const total = Number((calculatedQuotationSubtotal + tax).toFixed(2));

    // Update quotation
    const updatedData = {
      terms,
      notes,
      subtotal: calculatedQuotationSubtotal, // Use the correctly calculated subtotal
      tax,
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
      if (!item.productId) {
        throw new AppError('Product ID is required for each item', 400);
      }
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discountPercentage = Number(item.discount || 0); // Assuming item.discount is percentage

      // Calculate subtotal for this specific QuotationItem
      const itemSubtotal = Number((quantity * unitPrice * (1 - discountPercentage / 100)).toFixed(2));

      const quotationItem = await QuotationItem.create({
        quotationId: quotation._id,
        productId: item.productId,
        quantity: quantity,
        unitPrice: unitPrice,
        discount: discountPercentage, // Store discount as percentage
        subtotal: itemSubtotal // Store correctly calculated item subtotal
      });
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
    if (!req.user || req.user.role !== 'sales_person') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send quotations'
      });
    }

      // Fetch quotation with populated data first
      const quotation = await Quotation.findById(req.params.id)
      .populate('lead');

      if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
      }

    // Get quotation items
    const quotationItems = await QuotationItem.find({ quotationId: quotation._id })
      .populate('productId');

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
          email: quotation.lead.email
        },
        notify: {
          sms: true,
          email: true
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
      quotationItems.map(async (item) => ({
        product: {
          ...item.productId.toObject(),
          specifications: Object.entries(item.productId.specifications || {}).map(([key, value]) => ({
            name: key,
            value: value
          })),
          images: (item.productId.imageUrls || []).map(url => ({ url }))
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: Number((item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)).toFixed(2))
      }))
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
          address: quotation.lead.address,
          email: quotation.lead.email
        },
      items: formattedItems,
        subtotal: quotation.subtotal,
        tax: quotation.tax,
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
      // Generate PDF
      pdfBuffer = await generatePDF('quotation', emailData);
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
      ).populate('lead', 'firstName lastName email whatsapp phone countryCode preferredContactMethod').populate('createdBy', 'name');

      // Send notification via available channels (email and/or WhatsApp)
      try {
        const notificationResult = await sendQuotationNotification(updatedQuotation, quotationItems, pdfBuffer);
        console.log('Notification results:', notificationResult);
      } catch (notificationError) {
        console.error('Notification failed but quotation marked as sent:', notificationError.message);
        // Continue with success response even if notification fails
        // The quotation is still marked as sent and can be resent later
      }

      // Return data in the new format
      const quotationWithItems = updatedQuotation.toObject();
      quotationWithItems.quotationItems = quotationItems;

      // Notify sent status
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
    const quotation = await Quotation.findById(req.params.id).populate('lead');
    
    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    if (quotation.status !== 'sent') {
      throw new AppError('Can only approve quotations that have been sent', 400);
    }

    if (!quotation.lead || !quotation.lead.email) {
      throw new AppError('Lead data is incomplete. Email is required for approval.', 400);
    }

    // If payment isn't confirmed yet, set it up for manual approval by sales team
    if (quotation.advancePaymentStatus !== 'CONFIRMED') {
      console.log(`Quotation ${quotation._id}: Advance payment not confirmed. Setting up for manual approval.`);
      const advancePercentage = quotation.advancePaymentPercentage || 20;
      const advanceAmount = Number((quotation.total * (advancePercentage / 100)).toFixed(2));
      
      quotation.advancePaymentStatus = 'CONFIRMED'; 
      quotation.advancePaymentAmount = advanceAmount;
      quotation.advancePaymentConfirmedAt = new Date();
      quotation.paymentMethod = quotation.paymentMethod || 'cash'; 
      quotation.offlineTransactionNo = quotation.offlineTransactionNo || `MANUAL-APPROVE-${Date.now()}`;
      
      await quotation.save(); 
      console.log(`Quotation ${quotation._id}: Updated with manual payment details before approval.`);
    }

    const approvedQuotation = await approveQuotation(quotation); 
    
    const quotationItems = await QuotationItem.find({ quotationId: approvedQuotation._id })
      .populate('productId');

    const quotationWithItems = approvedQuotation.toObject();
    quotationWithItems.quotationItems = quotationItems;

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
      }).populate('lead');

      if (!quotation) {
        console.error(`Quotation not found for payment link ID: ${payment_link.id}`);
        return res.json({ status: 'error', message: 'Quotation not found' });
      }

      // Update payment status
      quotation.advancePaymentStatus = 'CONFIRMED';
      quotation.advancePaymentConfirmedAt = new Date();
      quotation.razorpayPaymentId = payment_link.payment_id;
      await quotation.save();
      console.log(`Payment status updated to CONFIRMED for quotation: ${quotation._id}`);

      try {
        // Use the helper function to create customer and approve quotation
        const approvedQuotation = await approveQuotation(quotation);
        console.log(`Quotation ${approvedQuotation._id} approved successfully`);

        // Notify client about the status change if websocket utils are available
        if (typeof notifyClient === 'function') {
          const userId = quotation.createdBy;
          notifyClient(userId, quotation._id, 'approved');
          console.log(`Notification sent to user ${userId} about quotation approval`);
        }
        
        return res.json({ status: 'success', message: 'Payment processed and quotation approved' });
      } catch (error) {
        console.error('Error in auto-approval process:', error.message, error.stack);
        return res.json({ 
          status: 'partial', 
          message: 'Payment recorded but approval failed',
          error: error.message
        });
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
    if (!lead || !lead.email) {
        throw new AppError('Critical: Lead data or email missing in quotation for approval.', 500);
    }

    let user = await User.findOne({ email: lead.email });
    let leadUserId; // Renamed variable for clarity to avoid confusion with req.user.id if used elsewhere
    
    if (user) {
      leadUserId = user._id;
      console.log(`Existing user found: ${leadUserId} for email ${lead.email}`);
    } else {
      const password = Math.random().toString(36).slice(-8);
      user = new User({ 
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email,
        password, 
        role: 'customer'
      });
      await user.save();
      leadUserId = user._id;
      console.log(`New user created: ${leadUserId} for email ${lead.email}`);
      
      try {
        // Send welcome notification via available channels
        await sendWelcomeNotification(user, password);
        console.log(`Welcome notification sent to ${user.email}`);
      } catch (notificationError) {
        console.error(`Failed to send welcome notification to ${user.email}:`, notificationError.message);
      }
    }
    
    let customer = await Customer.findOne({ email: lead.email });
    
    if (!customer) {
      console.log(`Creating new customer record for ${lead.email} with user ID: ${leadUserId}`);
      customer = new Customer({ 
        leadId: lead._id,
        user: leadUserId, // Changed to use 'user' field as per updated Customer model
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone || '',
        businessName: lead.businessName || '',
        address: lead.address || '',
        customerType: lead.customerType || 'end_user'
      });
      await customer.save();
      console.log(`Created customer with ID: ${customer._id}`);
    } else {
      console.log(`Existing customer found: ${customer._id} for email ${lead.email}`);
      if (!customer.user && leadUserId) { // Check if the 'user' field needs linking
        customer.user = leadUserId; // Use 'user' field
        await customer.save();
        console.log(`Linked existing customer ${customer._id} to user ${leadUserId} via 'user' field.`);
      } else if (customer.user && leadUserId && customer.user.toString() !== leadUserId.toString()) {
        console.warn(`Customer ${customer._id} (email: ${lead.email}) is already linked to user ${customer.user}. Attempted to link to ${leadUserId}. Keeping existing link.`);
      }
    }
    
    const purchaseSubtotal = quotationInstance.subtotal; 
    const purchaseTaxPercentage = quotationInstance.taxPercentage || 18; 
    const purchaseTaxAmount = Number((purchaseSubtotal * (purchaseTaxPercentage / 100)).toFixed(2));
    const purchaseTotalAmount = Number((purchaseSubtotal + purchaseTaxAmount).toFixed(2));

    if (Math.abs(purchaseTotalAmount - quotationInstance.total) > 0.01) {
        console.warn(`Calculated total (₹${purchaseTotalAmount}) for CustomerPurchase differs from quotation.total (₹${quotationInstance.total}). Using calculated total. Quotation ID: ${quotationInstance._id}.`);
    }

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
        subtotal: purchaseSubtotal,
        taxPercentage: purchaseTaxPercentage,
        taxAmount: purchaseTaxAmount,
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
    
    let quotation = await Quotation.findById(req.params.id).populate('lead');

    if (!quotation) {
      throw new AppError('Quotation not found', 404);
    }

    if (quotation.status === 'approved') {
        console.log(`Quotation ${quotation._id} is already approved. Offline payment confirmation redundant unless updating details.`);
        const items = await QuotationItem.find({ quotationId: quotation._id }).populate('productId');
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

    if (!quotation.lead || !quotation.lead.email) {
      throw new AppError('Lead data is incomplete. Email is required.', 400);
    }

    quotation.advancePaymentStatus = 'CONFIRMED';
    quotation.advancePaymentAmount = paymentAmount; 
    quotation.advancePaymentConfirmedAt = paymentDate ? new Date(paymentDate) : new Date();
    quotation.offlineTransactionNo = transactionNo;
    
    if (paymentMethod) quotation.paymentMethod = paymentMethod; 
    if (notes) quotation.paymentNotes = notes;
    
    await quotation.save();
    console.log(`Quotation ${quotation._id}: Updated with offline payment details.`);

    const approvedQuotation = await approveQuotation(quotation); 

    const quotationItems = await QuotationItem.find({ quotationId: approvedQuotation._id })
      .populate('productId');

    const quotationWithItems = approvedQuotation.toObject(); 
    quotationWithItems.quotationItems = quotationItems;
    
    res.json({
      success: true,
      message: 'Offline payment confirmed and quotation approved successfully.',
      data: quotationWithItems 
    });
  } catch (error) {
    console.error('Error in confirmOfflinePayment:', error);
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

    // Step 1: Find customer record associated with this user's email
    const customer = await Customer.findOne({ email: user.email });

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
      const quotationIds = customerPurchases.map(purchase => purchase.quotationId._id);
      
      // Step 4: Get all quotation items with product details
      const quotationItems = await QuotationItem.find({
        quotationId: { $in: quotationIds }
      }).populate('productId');
      
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
    const quotation = await Quotation.findById(quotationId).populate('lead');
    
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
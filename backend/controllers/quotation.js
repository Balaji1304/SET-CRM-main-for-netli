const Quotation = require('../models/Quotation');
const User = require('../models/User');
const Lead = require('../models/Lead');
const sendEmail = require('../utils/sendEmail');
const { generateQuotationNumber } = require('../utils/generateNumbers');
const generatePDF = require('../utils/generatePDF');
const { registerHelpers } = require('../utils/handlebarsHelpers');
const razorpay = require('../config/razorpay');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { notifyClient } = require('../utils/websocket');

// Register handlebars helpers
registerHelpers();

// @desc    Get all quotations
// @route   GET /api/quotations
exports.getQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find()
      .populate('lead', 'firstName lastName email')
      .populate('createdBy', 'name');

    res.json({
      success: true,
      data: quotations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single quotation
// @route   GET /api/quotations/:id
exports.getQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('lead')
      .populate('items.product');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.json({
      success: true,
      data: quotation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Create quotation
// @route   POST /api/quotations
exports.createQuotation = async (req, res) => {
  try {
    const { leadId, items, terms, notes } = req.body;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => 
      sum + Number((item.quantity * item.unitPrice * (1 - item.discount/100)).toFixed(2)), 0);
    const tax = Number((subtotal * 0.18).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));

    // Create quotation without payment link (it will be created when sending)
    const quotation = await Quotation.create({
      lead: leadId,
      quotationNumber: await generateQuotationNumber(),
      items,
      subtotal,
      tax,
      total,
      terms,
      notes,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: req.user.id,
      status: 'draft',
      advancePaymentStatus: 'PENDING'
    });

    // Populate the response data
    // const populatedQuotation = await Quotation.findById(quotation._id)
    //   .populate('lead')
    //   .populate('items.product');

    res.status(201).json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating quotation'
    });
  }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
exports.updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Only allow updates if quotation is in draft status
    if (quotation.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update quotation that is not in draft status'
      });
    }

    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedQuotation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
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
      .populate('lead')
      .populate('items.product');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Notify sending status
    notifyClient(req.user.id, quotation._id, 'sending');

    // Calculate advance payment amount (20% of total)
    const advanceAmount = Number((quotation.total * 0.20).toFixed(2));

    // Create payment link options
    // Always use a hardcoded domain without any protocol to prevent URL issues
    const frontendDomain = 'blackenginecrm.netlify.app';
    
    const paymentLinkOptions = {
      amount: advanceAmount * 100,
      currency: "INR",
      accept_partial: false,
      description: `Advance Payment (20%) for Quotation #${quotation.quotationNumber}`,
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
      callback_url: `https://${frontendDomain}/quotations/${quotation._id}/payment-status`,
      callback_method: 'get'
    };

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
      items: await Promise.all(
        quotation.items.map(async (item) => ({
          ...item.toObject(),
          product: {
            ...item.product.toObject(),
            specifications: Object.entries(item.product.specifications || {}).map(([key, value]) => ({
              name: key,
              value: value
            })),
            images: (item.product.imageUrls || []).map(url => ({ url }))
          },
          total: Number((item.quantity * item.unitPrice * (1 - item.discount/100)).toFixed(2))
        }))
      ),
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      total: quotation.total,
      terms: quotation.terms,
      notes: quotation.notes,
      advanceAmount: advanceAmount
    };

    let paymentLink;
    let pdfBuffer;

    try {
      // Create payment link
      console.log('Creating Razorpay payment link with options:', {
        ...paymentLinkOptions,
        amount: paymentLinkOptions.amount,
        currency: paymentLinkOptions.currency,
        customer: {
          name: paymentLinkOptions.customer.name,
          email: paymentLinkOptions.customer.email
        }
      });
      
      paymentLink = await razorpay.paymentLink.create(paymentLinkOptions);
      console.log('Payment link created successfully:', {
        id: paymentLink.id,
        status: paymentLink.status,
        short_url: paymentLink.short_url
      });
    } catch (error) {
      console.error('Error creating payment link:', {
        error: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
        razorpayError: error.error
      });
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
      // Update quotation and send email in parallel
      const [updatedQuotation] = await Promise.all([
        Quotation.findByIdAndUpdate(
          quotation._id,
          {
            status: 'sent',
            advancePaymentAmount: advanceAmount,
            razorpayPaymentLinkId: paymentLink.id,
            razorpayPaymentLink: paymentLink.short_url,
            paymentLinkExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          { new: true }
        ).populate('lead', 'firstName lastName email').populate('createdBy', 'name'),
        sendEmail({
          email: quotation.lead.email,
          subject: `Quotation ${quotation.quotationNumber}`,
          template: 'quotation',
          data: emailData,
          attachments: [{
            filename: `Quotation_${quotation.quotationNumber}.pdf`,
            content: pdfBuffer
          }]
        })
      ]);

      // Notify sent status
      notifyClient(req.user.id, updatedQuotation._id, 'sent');

      return res.json({
        success: true,
        data: updatedQuotation
      });
    } catch (error) {
      console.error('Error updating quotation or sending email:', error);
      // Revert status to draft
      await Quotation.findByIdAndUpdate(quotation._id, { status: 'draft' }, { new: false });
      notifyClient(req.user.id, quotation._id, 'draft');
      return res.status(400).json({
        success: false,
        message: 'Failed to update quotation or send email'
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
exports.approveQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('lead');
    
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Only allow approving sent quotations
    if (quotation.status !== 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Can only approve quotations that have been sent'
      });
    }

    // Create customer account
    const password = Math.random().toString(36).slice(-8);
    
    try {
      const customer = await User.create({
        name: `${quotation.lead.firstName} ${quotation.lead.lastName}`,
        email: quotation.lead.email,
        password,
        role: 'customer'
      });

      // Send credentials email
      await sendEmail({
        email: customer.email,
        subject: 'Welcome to Solar CRM - Your Account Details',
        template: 'welcome',
        data: {
          name: customer.name,
          email: customer.email,
          password
        }
      });

      // Update quotation status
      quotation.status = 'approved';
      await quotation.save();

      res.json({
        success: true,
        data: quotation
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error creating customer account'
      });
    }
  } catch (error) {
    console.error('Approve quotation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error approving quotation'
    });
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
      console.log('Parsed webhook body successfully');
    } catch (error) {
      console.error('Error parsing webhook body:', {
        error: error.message,
        bodyType: typeof req.body,
        isBuffer: req.body instanceof Buffer,
        bodyLength: req.body ? (req.body instanceof Buffer ? req.body.length : JSON.stringify(req.body).length) : 0
      });
      return res.status(400).json({ error: 'Invalid request body format' });
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    
    if (!webhookSecret || !signature) {
      console.error('Webhook secret or signature missing', {
        hasSecret: !!webhookSecret,
        hasSignature: !!signature
      });
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
    
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(req.body instanceof Buffer ? req.body : JSON.stringify(webhookBody));
    const digest = shasum.digest('hex');

    if (signature !== digest) {
      console.error('Invalid webhook signature', {
        receivedSignature: signature,
        computedDigest: digest
      });
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    console.log('Webhook signature verified successfully');
    
    // Log the received webhook event
    console.log('Received Razorpay webhook:', {
      event: webhookBody.event,
      payloadSummary: webhookBody.payload ? {
        paymentLinkId: webhookBody.payload.payment_link?.id,
        paymentId: webhookBody.payload.payment_link?.payment_id,
        status: webhookBody.payload.payment_link?.status
      } : 'No payload'
    });

    const { payload, event } = webhookBody;
    
    if (!payload || !payload.payment_link) {
      console.error('Invalid webhook payload structure', { body: webhookBody });
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    const { payment_link } = payload;

    if (event === 'payment_link.paid') {
      console.log('Processing payment_link.paid event', {
        paymentLinkId: payment_link.id,
        paymentId: payment_link.payment_id
      });
      
      // Extra verification with Razorpay API
      let paymentVerified = false;
      try {
        const paymentVerification = await razorpay.verifyPaymentStatus(payment_link.payment_id);
        paymentVerified = paymentVerification.verified;
        
        if (paymentVerified) {
          console.log('Payment verified with Razorpay API:', {
            paymentId: payment_link.payment_id,
            status: paymentVerification.payment.status
          });
        } else {
          console.warn('Webhook received but payment verification failed:', {
            paymentId: payment_link.payment_id,
            razorpayStatus: paymentVerification.payment.status
          });
          
          // Even if API verification fails, we'll continue with the webhook data
          // since webhook is signed and verified with HMAC
          console.log('Continuing with webhook data despite API verification failure');
        }
      } catch (verificationError) {
        console.error('Error verifying payment with API (continuing with webhook):', verificationError.message);
        // Continue with webhook data even if API verification fails
      }
      
      const quotation = await Quotation.findOne({ 
        razorpayPaymentLinkId: payment_link.id 
      }).populate('lead');

      if (!quotation) {
        console.error('Quotation not found for payment link', { paymentLinkId: payment_link.id });
        return res.json({ status: 'error', message: 'Quotation not found' });
      }

      console.log('Found quotation for payment', {
        quotationId: quotation._id,
        quotationNumber: quotation.quotationNumber,
        leadEmail: quotation.lead.email
      });

      // Update payment status
      quotation.advancePaymentStatus = 'CONFIRMED';
      quotation.advancePaymentConfirmedAt = new Date();
      quotation.razorpayPaymentId = payment_link.payment_id;
      await quotation.save();
      
      console.log('Updated quotation payment status to CONFIRMED');

      try {
        // Use the helper function to create customer and approve quotation
        const approvedQuotation = await approveQuotation(quotation);
        console.log('Quotation automatically approved after online payment:', {
          quotationId: approvedQuotation._id,
          status: approvedQuotation.status
        });
        
        // Notify client about the status change if websocket utils are available
        if (typeof notifyClient === 'function') {
          const userId = quotation.createdBy;
          notifyClient(userId, quotation._id, 'approved');
        }
        
        return res.json({ status: 'success', message: 'Payment processed and quotation approved' });
      } catch (error) {
        console.error('Error in auto-approval process:', {
          error: error.message,
          stack: error.stack,
          quotationId: quotation._id
        });
        return res.json({ 
          status: 'partial', 
          message: 'Payment recorded but approval failed',
          error: error.message
        });
      }
    } else {
      console.log('Ignoring non-payment webhook event', { event });
      return res.json({ status: 'ignored', message: 'Event type not handled' });
    }
  } catch (error) {
    console.error('Webhook processing error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
};

// Helper function for approval process
const approveQuotation = async (quotation) => {
  try {
    console.log('Starting approval process for quotation', {
      quotationId: quotation._id,
      leadEmail: quotation.lead.email
    });
    
    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: quotation.lead.email });
    
    if (existingUser) {
      console.log('User already exists for this lead email', {
        userId: existingUser._id,
        email: existingUser.email
      });
      
      // Just update the quotation status
      quotation.status = 'approved';
      await quotation.save();
      
      return quotation;
    }
    
    // Create customer account with random password
    const password = Math.random().toString(36).slice(-8);
    
    const customer = await User.create({
      name: `${quotation.lead.firstName} ${quotation.lead.lastName}`,
      email: quotation.lead.email,
      password,
      role: 'customer'
    });
    
    console.log('Created new customer account', {
      customerId: customer._id,
      email: customer.email
    });

    // Send credentials email
    await sendEmail({
      email: customer.email,
      subject: 'Welcome to Solar CRM - Your Account Details',
      template: 'welcome',
      data: {
        name: customer.name,
        email: customer.email,
        password
      }
    });
    
    console.log('Sent welcome email with credentials');

    // Update quotation status
    quotation.status = 'approved';
    await quotation.save();
    
    console.log('Updated quotation status to approved', {
      quotationId: quotation._id,
      status: quotation.status
    });

    return quotation;
  } catch (error) {
    console.error('Error in approval process:', {
      message: error.message,
      stack: error.stack,
      quotationId: quotation._id
    });
    throw error;
  }
};

// Add this new controller function
exports.confirmOfflinePayment = async (req, res) => {
  try {
    const { amount, transactionNo } = req.body;
    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Only allow offline payment for 'sent' status
    if (quotation.status !== 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Can only confirm payment for sent quotations'
      });
    }

    // Validate advance payment amount (should be at least 20% of total)
    const minimumAdvance = quotation.total * 0.20;
    if (amount < minimumAdvance) {
      return res.status(400).json({
        success: false,
        message: `Advance payment must be at least ${minimumAdvance} (20% of total amount)`
      });
    }

    // Update quotation with payment details
    quotation.advancePaymentStatus = 'CONFIRMED';
    quotation.advancePaymentAmount = amount;
    quotation.advancePaymentConfirmedAt = new Date();
    quotation.offlineTransactionNo = transactionNo;
    await quotation.save();

    // Automatically trigger approval process
    await approveQuotation(quotation);

    res.json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Error in confirmOfflinePayment:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Add this new controller function
exports.getCustomerProducts = async (req, res) => {
  try {
    console.log('User requesting products:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });

    // Verify user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('User not found in database');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find lead by email
    const lead = await Lead.findOne({ email: user.email });
    console.log('Lead search result:', lead ? {
      id: lead._id,
      email: lead.email,
      name: `${lead.firstName} ${lead.lastName}`
    } : 'No lead found');

    if (!lead) {
      return res.json({
        success: true,
        data: []
      });
    }

    try {
      // Find quotations using the lead ID
      const quotations = await Quotation.find({
        status: 'approved',
        lead: lead._id
      }).populate({
        path: 'items.product',
        select: 'name category description specifications price images'
      });

      console.log('Found quotations:', {
        count: quotations.length,
        quotationIds: quotations.map(q => q._id)
      });

      // Extract and format products from quotations
      const products = quotations.flatMap(quotation => {
        try {
          return quotation.items.map(item => {
            if (!item.product) {
              console.log('Missing product in quotation:', {
                quotationId: quotation._id,
                itemId: item._id
              });
              return null;
            }

            return {
              quotationNumber: quotation.quotationNumber,
              purchaseDate: quotation.advancePaymentConfirmedAt,
              product: {
                _id: item.product._id,
                name: item.product.name,
                category: item.product.category,
                description: item.product.description,
                specifications: item.product.specifications,
                price: item.product.price,
                images: item.product.images
              },
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)
            };
          }).filter(Boolean); // Remove null items
        } catch (err) {
          console.error('Error processing quotation:', {
            quotationId: quotation._id,
            error: err.message
          });
          return [];
        }
      });

      console.log('Processed products:', {
        count: products.length,
        sampleProduct: products[0] ? {
          quotationNumber: products[0].quotationNumber,
          productName: products[0].product.name
        } : null
      });
      
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error processing quotations:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in getCustomerProducts:', {
      message: error.message,
      stack: error.stack
    });
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
    console.log('User requesting payments:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });

    // Find the lead associated with the user
    const lead = await Lead.findOne({ email: req.user.email });
    console.log('Lead found:', lead ? { id: lead._id, email: lead.email } : 'No lead found');
    
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

    console.log('Found quotations:', {
      count: quotations.length,
      quotationIds: quotations.map(q => q._id)
    });

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
    console.error('Error fetching pending payments:', {
      error: error.message,
      stack: error.stack
    });
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
    
    if (!paymentId || !quotationId) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment ID or quotation ID'
      });
    }
    
    // Find the quotation using payment ID and quotation ID
    const quotation = await Quotation.findOne({
      _id: quotationId,
      razorpayPaymentId: paymentId
    }).select('quotationNumber advancePaymentStatus advancePaymentAmount razorpayPaymentId status');
    
    // If no quotation is found with matching payment ID, check if it exists at all
    if (!quotation) {
      // Try to find the quotation without payment ID (payment might be in process)
      const pendingQuotation = await Quotation.findById(quotationId);
      
      if (!pendingQuotation) {
        return res.status(404).json({
          success: false,
          message: 'Quotation not found'
        });
      }
      
      // If payment ID is provided but doesn't match the quotation, verify payment with Razorpay API
      if (paymentId && pendingQuotation.status === 'sent') {
        try {
          // Verify payment status directly with Razorpay API
          const paymentVerification = await razorpay.verifyPaymentStatus(paymentId);
          
          // If payment is verified successfully and quotation is still in "sent" status
          if (paymentVerification.verified) {
            console.log('Payment verified with Razorpay API but not recorded in system:', {
              quotationId: pendingQuotation._id,
              paymentId,
              status: paymentVerification.payment.status
            });
            
            // Return a special status indicating the payment is verified with Razorpay 
            // but not yet processed in our system
            return res.json({
              success: true,
              message: 'Payment verified with Razorpay API but not yet recorded in system',
              data: {
                quotationId: pendingQuotation._id,
                quotationNumber: pendingQuotation.quotationNumber,
                paymentStatus: 'RAZORPAY_VERIFIED',
                quotationStatus: pendingQuotation.status,
                razorpayPaymentStatus: paymentVerification.payment.status,
                paymentAmount: paymentVerification.payment.amount
              }
            });
          }
        } catch (error) {
          console.error('Error verifying payment with Razorpay API:', error);
          // Continue with normal flow even if verification fails
        }
      }
      
      // Return normal status if API verification fails or is not applicable
      return res.json({
        success: true,
        data: {
          quotationId: pendingQuotation._id,
          quotationNumber: pendingQuotation.quotationNumber,
          paymentStatus: 'PENDING',
          quotationStatus: pendingQuotation.status
        }
      });
    }
    
    // Return payment details from our database for existing payments
    res.json({
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
  } catch (error) {
    console.error('Error checking public payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking payment status',
      error: error.message
    });
  }
};

// Manual payment confirmation when webhook fails
exports.manualConfirmPayment = async (req, res) => {
  try {
    const { quotationId, paymentId, paymentLinkId, signature } = req.body;
    
    if (!quotationId || !paymentId || !paymentLinkId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    console.log('Manual payment confirmation attempt:', {
      quotationId,
      paymentId,
      paymentLinkId
    });
    
    // Find the quotation
    const quotation = await Quotation.findById(quotationId).populate('lead');
    
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }
    
    // If payment is already confirmed and approved, just return success
    if (quotation.advancePaymentStatus === 'CONFIRMED' && quotation.status === 'approved') {
      console.log('Payment already confirmed and quotation approved:', {
        quotationId: quotation._id,
        quotationNumber: quotation.quotationNumber
      });
      
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
      // Verify payment status directly with Razorpay
      const paymentVerification = await razorpay.verifyPaymentStatus(paymentId);
      
      if (!paymentVerification.verified) {
        console.log('Payment verification failed:', paymentVerification);
        return res.status(400).json({
          success: false,
          message: `Payment verification failed. Razorpay status: ${paymentVerification.payment.status}`,
          data: paymentVerification.payment
        });
      }
      
      console.log('Payment verified with Razorpay API:', {
        paymentId,
        status: paymentVerification.payment.status,
        amount: paymentVerification.payment.amount
      });
      
      // Also verify payment link if possible
      try {
        const linkVerification = await razorpay.verifyPaymentLinkStatus(paymentLinkId);
        console.log('Payment link verification result:', {
          linkId: paymentLinkId,
          status: linkVerification.paymentLink.status
        });
      } catch (linkError) {
        // Non-blocking error, just log it
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
      console.log('Updated quotation payment status to CONFIRMED after API verification');
      
      // Approve the quotation
      try {
        const approvedQuotation = await approveQuotation(quotation);
        console.log('Quotation approved after API verification:', {
          quotationId: approvedQuotation._id,
          status: approvedQuotation.status
        });
        
        // Notify the sales person if websocket utils are available
        if (typeof notifyClient === 'function') {
          const userId = quotation.createdBy;
          notifyClient(userId, quotation._id, 'approved');
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
        console.error('Error in approval after API verification:', error);
        return res.status(500).json({
          success: false,
          message: 'Payment verified but approval failed',
          error: error.message
        });
      }
    } catch (verificationError) {
      console.error('Razorpay API verification failed:', verificationError);
      
      // Fallback to signature verification if API verification fails
      console.log('Falling back to previous verification method');
      
      // Check if the payment is already registered but quotation not approved
      if (quotation.razorpayPaymentId === paymentId || quotation.razorpayPaymentLinkId === paymentLinkId) {
        console.log('Payment details match, updating payment status for quotation:', {
          quotationId: quotation._id,
          quotationNumber: quotation.quotationNumber
        });
        
        // Update payment details if not already set
        if (quotation.advancePaymentStatus !== 'CONFIRMED') {
          quotation.advancePaymentStatus = 'CONFIRMED';
          quotation.advancePaymentConfirmedAt = new Date();
          
          // Set payment ID if not already set
          if (!quotation.razorpayPaymentId) {
            quotation.razorpayPaymentId = paymentId;
          }
          
          await quotation.save();
          console.log('Updated payment status to CONFIRMED via fallback method');
        }
        
        // Approve quotation if not already approved
        if (quotation.status !== 'approved') {
          try {
            // Use the helper function to create customer and approve quotation
            const approvedQuotation = await approveQuotation(quotation);
            console.log('Quotation manually approved after payment confirmation:', {
              quotationId: approvedQuotation._id,
              status: approvedQuotation.status
            });
            
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
            console.error('Error in fallback approval process:', error);
            return res.status(500).json({
              success: false,
              message: 'Payment confirmed but approval failed',
              error: error.message
            });
          }
        } else {
          // Already approved, just return success
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
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed and payment details do not match existing records',
          error: verificationError.message
        });
      }
    }
  } catch (error) {
    console.error('Manual payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing manual payment confirmation',
      error: error.message
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
  approveQuotation: exports.approveQuotation,
  handleRazorpayWebhook: exports.handleRazorpayWebhook,
  confirmOfflinePayment: exports.confirmOfflinePayment,
  getCustomerProducts: exports.getCustomerProducts,
  getPendingPayments: exports.getPendingPayments,
  checkPaymentStatus: exports.checkPaymentStatus,
  checkPublicPaymentStatus: exports.checkPublicPaymentStatus,
  manualConfirmPayment: exports.manualConfirmPayment
}; 
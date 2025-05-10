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

    res.json({
      success: true,
      data: quotations
    });
  } catch (error) {
    console.error('Error fetching quotations:', error);
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

    // Check access permissions
    if (req.user.role === 'sales_person' && quotation.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this quotation'
      });
    }

    // For customers, check if the quotation is related to their leads
    if (req.user.role === 'customer') {
      const lead = await Lead.findOne({ 
        _id: quotation.lead._id,
        email: req.user.email 
      });
      
      if (!lead) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this quotation'
        });
      }
    }

    res.json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Error fetching quotation:', error);
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
    } catch (error) {
      console.error('Error parsing webhook body:', error.message);
      return res.status(400).json({ error: 'Invalid request body format' });
    }

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    
    if (!webhookSecret || !signature) {
      console.error('Webhook signature verification failed: Missing secret or signature');
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
    
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(req.body instanceof Buffer ? req.body : JSON.stringify(webhookBody));
    const digest = shasum.digest('hex');

    if (signature !== digest) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    
    const { payload, event } = webhookBody;
    
    if (!payload || !payload.payment_link) {
      console.error('Invalid webhook payload structure');
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    const { payment_link } = payload;

    if (event === 'payment_link.paid') {
      // Extra verification with Razorpay API
      try {
        const paymentVerification = await razorpay.verifyPaymentStatus(payment_link.payment_id);
        // Continue even if verification fails, since webhook is signed and verified
      } catch (verificationError) {
        console.error('Error verifying payment with API (continuing with webhook):', verificationError.message);
      }
      
      const quotation = await Quotation.findOne({ 
        razorpayPaymentLinkId: payment_link.id 
      }).populate('lead');

      if (!quotation) {
        console.error('Quotation not found for payment link');
        return res.json({ status: 'error', message: 'Quotation not found' });
      }

      // Update payment status
      quotation.advancePaymentStatus = 'CONFIRMED';
      quotation.advancePaymentConfirmedAt = new Date();
      quotation.razorpayPaymentId = payment_link.payment_id;
      await quotation.save();

      try {
        // Use the helper function to create customer and approve quotation
        const approvedQuotation = await approveQuotation(quotation);
        
        // Notify client about the status change if websocket utils are available
        if (typeof notifyClient === 'function') {
          const userId = quotation.createdBy;
          notifyClient(userId, quotation._id, 'approved');
        }
        
        return res.json({ status: 'success', message: 'Payment processed and quotation approved' });
      } catch (error) {
        console.error('Error in auto-approval process:', error.message);
        return res.json({ 
          status: 'partial', 
          message: 'Payment recorded but approval failed',
          error: error.message
        });
      }
    } else {
      return res.json({ status: 'ignored', message: 'Event type not handled' });
    }
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Simplify helper function for approval process
const approveQuotation = async (quotation) => {
  try {
    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: quotation.lead.email });
    
    if (existingUser) {
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

    return quotation;
  } catch (error) {
    console.error('Error in approval process:', error.message);
    throw error;
  }
};

// Add this new controller function
exports.confirmOfflinePayment = async (req, res) => {
  try {
    const { amount, transactionNo, paymentMethod, paymentDate, notes } = req.body;
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
    
    // Add the new payment details
    if (paymentMethod) quotation.paymentMethod = paymentMethod;
    if (paymentDate) quotation.paymentDate = new Date(paymentDate);
    if (notes) quotation.paymentNotes = notes;
    
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
    // Verify user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find lead by email
    const lead = await Lead.findOne({ email: user.email });

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

      // Extract and format products from quotations
      const products = quotations.flatMap(quotation => {
        try {
          return quotation.items.map(item => {
            if (!item.product) {
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
          console.error('Error processing quotation:', err.message);
          return [];
        }
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
          console.error('Error verifying payment with Razorpay API:', error.message);
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
    console.error('Error checking public payment status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error checking payment status',
      error: error.message
    });
  }
};

// Simplify manual payment confirmation
exports.manualConfirmPayment = async (req, res) => {
  try {
    const { quotationId, paymentId, paymentLinkId } = req.body;
    
    if (!quotationId || !paymentId || !paymentLinkId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
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
        console.error('Payment verification failed');
        return res.status(400).json({
          success: false,
          message: `Payment verification failed. Razorpay status: ${paymentVerification.payment.status}`,
          data: paymentVerification.payment
        });
      }
      
      // Also verify payment link if possible
      try {
        await razorpay.verifyPaymentLinkStatus(paymentLinkId);
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
      
      // Approve the quotation
      try {
        const approvedQuotation = await approveQuotation(quotation);
        
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
        console.error('Error in approval after API verification:', error.message);
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
        // Update payment details if not already set
        if (quotation.advancePaymentStatus !== 'CONFIRMED') {
          quotation.advancePaymentStatus = 'CONFIRMED';
          quotation.advancePaymentConfirmedAt = new Date();
          
          // Set payment ID if not already set
          if (!quotation.razorpayPaymentId) {
            quotation.razorpayPaymentId = paymentId;
          }
          
          await quotation.save();
        }
        
        // Approve quotation if not already approved
        if (quotation.status !== 'approved') {
          try {
            // Use the helper function to create customer and approve quotation
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
            console.error('Error in fallback approval process:', error.message);
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
    console.error('Manual payment confirmation error:', error.message);
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
  approveQuotation: exports.approveQuotation,
  handleRazorpayWebhook: exports.handleRazorpayWebhook,
  confirmOfflinePayment: exports.confirmOfflinePayment,
  getCustomerProducts: exports.getCustomerProducts,
  getPendingPayments: exports.getPendingPayments,
  checkPaymentStatus: exports.checkPaymentStatus,
  checkPublicPaymentStatus: exports.checkPublicPaymentStatus,
  manualConfirmPayment: exports.manualConfirmPayment,
  closeQuotation: exports.closeQuotation
}; 
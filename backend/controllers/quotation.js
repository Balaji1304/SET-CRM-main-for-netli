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
      callback_url: `${process.env.FRONTEND_URL}/dashboard/quotations/${quotation._id}/payment-status`,
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
      console.error('Error creating payment link:', error);
      notifyClient(req.user.id, quotation._id, 'draft');
      return res.status(400).json({
        success: false,
        message: 'Failed to create payment link'
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
    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (signature !== digest) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { payload } = req.body;
    const { payment_link } = payload;

    if (payload.event === 'payment_link.paid') {
      const quotation = await Quotation.findOne({ 
        razorpayPaymentLinkId: payment_link.id 
      }).populate('lead');

      if (quotation) {
        // Update payment status
        quotation.advancePaymentStatus = 'CONFIRMED';
        quotation.advancePaymentConfirmedAt = new Date();
        quotation.razorpayPaymentId = payment_link.payment_id;
        await quotation.save();

        // Automatically create customer account and approve quotation
        await approveQuotation(quotation);

        console.log('Quotation automatically approved after online payment:', quotation._id);
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
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

// Helper function for approval process
const approveQuotation = async (quotation) => {
  try {
    // Create customer account
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
    console.error('Error in approval process:', error);
    throw error;
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
  getPendingPayments: exports.getPendingPayments
}; 
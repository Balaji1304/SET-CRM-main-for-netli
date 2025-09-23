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
const { generateOrderFormPDF } = require('../utils/generateOrderForm');
const { sendOrderFormNotification } = require('../utils/sendNotification');
const NotificationService = require('../utils/notificationService');

// Register handlebars helpers
registerHelpers();

// @desc    Get all quotations
// @route   GET /api/quotations
exports.getQuotations = async (req, res) => {
  try {
    let query = {};
    
    // If user is a sales person, only show their quotations
    // Sales head, marketing coordinator and admin can see all quotations
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
    // Admin has access to all quotations without status restrictions
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
      .populate('lead', 'firstName lastName email phone')
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

// @desc    Export quotations
// @route   GET /api/quotations/export
exports.exportQuotations = async (req, res) => {
  try {
    // Only allow admin users to export
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can export quotations'
      });
    }

    // Get all quotations with related data
    const quotations = await Quotation.find({})
      .populate('lead', 'firstName lastName email phone businessName')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // Format data for CSV export
    const exportData = quotations.map(quotation => ({
      'Quotation Number': quotation.quotationNumber,
      'Lead Name': quotation.lead ? `${quotation.lead.firstName} ${quotation.lead.lastName}` : 'N/A',
      'Business Name': quotation.lead?.businessName || 'N/A',
      'Email': quotation.lead?.email || 'N/A',
      'Phone': quotation.lead?.phone || 'N/A',
      'Total Amount': quotation.total,
      'Status': quotation.status,
      'Advance Payment Status': quotation.advancePaymentStatus || 'N/A',
      'Advance Payment Amount': quotation.advancePaymentAmount || 0,
      'Created By': quotation.createdBy?.name || 'N/A',
      'Created Date': quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : 'N/A',
      'Valid Until': quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'N/A'
    }));

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Export quotations error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error exporting quotations'
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

    // Allow closing sent or pending_approval quotations
    if (quotation.status !== 'sent' && quotation.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: 'Can only close quotations that are sent or pending approval'
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

// Placeholder functions for missing controllers to prevent server crash
exports.getQuotation = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.createQuotation = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.updateQuotation = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.deleteQuotation = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.sendQuotation = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.handleApproveQuotation = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.handleRazorpayWebhook = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.confirmOfflinePayment = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.getCustomerProducts = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.getPendingPayments = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.checkPaymentStatus = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.checkPublicPaymentStatus = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

exports.manualConfirmPayment = async (req, res) => {
  res.status(501).json({ success: false, message: 'Function not implemented yet' });
};

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
  closeQuotation: exports.closeQuotation,
  exportQuotations: exports.exportQuotations
};
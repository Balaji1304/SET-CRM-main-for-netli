const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  quotationNumber: {
    type: String,
    required: true,
    unique: true
  },
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'pending_approval', 'approved', 'rejected', 'expired', 'closed'],
    default: 'draft'
  },
  validUntil: {
    type: Date,
    required: true
  },
  terms: String,
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  advancePaymentStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMED'],
    default: 'PENDING'
  },
  advancePaymentAmount: {
    type: Number
  },
  advancePaymentPercentage: {
    type: Number,
    default: 20 // 20% of total amount
  },
  advancePaymentConfirmedAt: {
    type: Date
  },
  razorpayPaymentId: {
    type: String
  },
  razorpayOrderId: {
    type: String
  },
  razorpayPaymentLink: {
    type: String
  },
  razorpayPaymentLinkId: {
    type: String
  },
  paymentLinkExpiresAt: {
    type: Date
  },
  offlineTransactionNo: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'razorpay', 'other'],
    default: 'cash'
  },
  paymentDate: {
    type: Date
  },
  paymentNotes: {
    type: String
  },
  closedAt: {
    type: Date
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closeReason: {
    type: String
  },
  auditLogs: [
    {
      action: { type: String, required: true },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date, default: Date.now },
      details: { type: Object }
    }
  ]
});

// Virtual populate to get QuotationItems
quotationSchema.virtual('quotationItems', {
  ref: 'QuotationItem',
  localField: '_id',
  foreignField: 'quotationId'
});

// Set toJSON option to include virtuals
quotationSchema.set('toJSON', { virtuals: true });
quotationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Quotation', quotationSchema); 
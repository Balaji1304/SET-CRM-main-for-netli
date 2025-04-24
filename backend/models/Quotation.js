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
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    }
  }],
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
    enum: ['draft', 'sent', 'approved', 'rejected', 'expired'],
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
    type: String
  }
});

module.exports = mongoose.model('Quotation', quotationSchema); 
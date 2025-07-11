const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  customerPurchaseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CustomerPurchase', 
    required: true 
  },
  amountPaid: { 
    type: Number, 
    required: true,
    min: [0, 'Amount paid cannot be negative'] 
  },
  paymentDate: { 
    type: Date, 
    default: Date.now 
  },
  paymentMethod: { 
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'razorpay', 'other'],
    default: 'other'
  },
  referenceNumber: {
    type: String
  },
  remarks: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected'],
    default: 'pending_approval'
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the 'updatedAt' field before saving
paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema); 
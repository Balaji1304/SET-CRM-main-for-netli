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
  paidAt: { 
    type: Date, 
    default: Date.now 
  },
  paymentMethod: { 
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'razorpay', 'other'],
    default: 'cash'
  },
  transactionId: {
    type: String
  },
  receiptNumber: {
    type: String
  },
  notes: {
    type: String
  },
  isAdvancePayment: {
    type: Boolean,
    default: false
  },
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
  }
});

// Update the 'updatedAt' field before saving
paymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema); 
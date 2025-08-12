const mongoose = require('mongoose');

const customerPurchaseSchema = new mongoose.Schema({
  purchaseID: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  quotationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Quotation', 
    required: true 
  },
  advancePaid: { 
    type: Number, 
    required: true,
    min: [0, 'Advance paid cannot be negative']
  },
  totalAmount: { 
    type: Number, 
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  remainingAmount: { 
    type: Number, 
    required: true,
    min: [0, 'Remaining amount cannot be negative']
  },
  isFullyPaid: { 
    type: Boolean, 
    default: false 
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'razorpay', 'other'],
    default: 'cash'
  },
  razorpayPaymentLink: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  assignedEngineerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  serviceDueDate: {
    type: Date,
    default: null
  },
  serviceTaskStatus: {
    type: String,
    enum: ['pending_assignment', 'assigned', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold', 'ready_to_dispatch', 'installation_date_allocated'],
    default: 'pending_assignment'
  },
  installationDate: {
    type: Date,
    default: null
  },
  serviceAssignmentNotes: {
    type: String,
    trim: true,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  paymentReviewStatus: {
    type: String,
    enum: ['none', 'pending_verification', 'verified', 'rejected'],
    default: 'none'
  }
});

// Update the 'updatedAt' field before saving
customerPurchaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CustomerPurchase', customerPurchaseSchema); 
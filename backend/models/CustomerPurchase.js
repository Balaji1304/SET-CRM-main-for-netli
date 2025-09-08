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
    enum: ['pending_assignment', 'order_accepted', 'ready_to_dispatch', 'installation_date_allocated', 'assigned', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'pending_assignment'
  },
  installationDate: {
    type: Date,
    default: null
  },
  estimatedDispatchDate: {
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
  },
  // Installation workflow fields - Simplified for Service Engineers
  installationStatus: {
    type: String,
    enum: ['assigned', 'accepted', 'in_progress', 'completed', 'issues'],
    default: 'assigned'
  },
  engineerAcceptedAt: {
    type: Date,
    default: null
  },
  workStartedAt: {
    type: Date,
    default: null
  },
  workCompletedAt: {
    type: Date,
    default: null
  },
  completionPhotos: [{
    type: String, // Cloudinary URLs
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  customerSignoffData: {
    approved: {
      type: Boolean,
      default: false
    },
    signedAt: {
      type: Date,
      default: null
    },
    customerFeedback: {
      type: String,
      default: ''
    },
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    serviceQualityRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    timelinessRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    professionalismRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  issuesReported: [{
    description: {
      type: String,
      required: true
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolution: String
  }]
});

// Update the 'updatedAt' field before saving
customerPurchaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CustomerPurchase', customerPurchaseSchema); 
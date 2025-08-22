const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  // Lead Source Information  
  leadSource: {
    type: String,
    required: [true, 'Lead source is required'],
    enum: {
      values: ['referral', 'indiamart', 'exhibition', 'facebook', 'instagram', 'google_ads', 'website', 'cold_call', 'walk_in', 'paper_ad', 'existing_customer', 'other'],
      message: 'Lead source must be one of: referral, indiamart, exhibition, facebook, instagram, google_ads, website, cold_call, walk_in, paper_ad, existing_customer, other'
    }
  },
  customLeadSource: {
    type: String,
    required: false,
    trim: true
  },
  
  // Lead Type Information (optional for enquiry)
  leadType: {
    type: String,
    required: false,
    enum: {
      values: ['end_user', 'plumber', 'dealer', 'builder', 'other'],
      message: 'Lead type must be one of: end_user, plumber, dealer, builder, other'
    }
  },
  customLeadType: {
    type: String,
    required: false,
    trim: true
  },

  // Personal Information (captured via phone call)
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    trim: true
  },
  email: {
    type: String,
    required: false,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  whatsapp: {
    type: String,
    required: false
  },
  
  // Address Information
  billingAddress: {
    type: String,
    required: false,
    trim: true
  },
  shippingAddress: {
    type: String,
    required: false,
    trim: true
  },
  
  // Reference Information
  referredBy: {
    type: String,
    required: false,
    trim: true
  },

  // Product Requirements
  productRequirements: {
    type: String,
    required: false,
    trim: true
  },

  // Assignment Information
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  assignedAt: {
    type: Date,
    required: false
  },
  assignmentStatus: {
    type: String,
    enum: ['pending_assignment', 'assigned', 'converted_to_lead'],
    default: 'pending_assignment'
  },

  // Conversion Tracking
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: false
  },
  convertedAt: {
    type: Date,
    required: false
  },

  // Additional Information
  notes: {
    type: String,
    trim: true
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
enquirySchema.index({ assignmentStatus: 1, createdAt: -1 });
enquirySchema.index({ assignedTo: 1, assignmentStatus: 1 });

// Pre-save middleware
enquirySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Enquiry', enquirySchema); 
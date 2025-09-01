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
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        // Phone number validation - should be 10 digits (after removing country code)
        const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number format
        const cleanPhone = v.replace(/\D/g, ''); // Remove non-digits
        // If it has country code, remove it
        const phoneWithoutCountryCode = cleanPhone.startsWith('91') && cleanPhone.length === 12 
          ? cleanPhone.substring(2) 
          : cleanPhone;
        return phoneRegex.test(phoneWithoutCountryCode);
      },
      message: 'Please enter a valid 10-digit Indian mobile number'
    }
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  whatsapp: {
    type: String,
    required: false,
    validate: {
      validator: function(v) {
        // If whatsapp is provided, validate it
        if (!v) return true; // Optional field
        const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number format
        const cleanPhone = v.replace(/\D/g, ''); // Remove non-digits
        // If it has country code, remove it
        const phoneWithoutCountryCode = cleanPhone.startsWith('91') && cleanPhone.length === 12 
          ? cleanPhone.substring(2) 
          : cleanPhone;
        return phoneRegex.test(phoneWithoutCountryCode);
      },
      message: 'Please enter a valid 10-digit WhatsApp number'
    }
  },
  whatsappSameAsPhone: {
    type: Boolean,
    default: true
  },
  hasWhatsapp: {
    type: Boolean,
    default: true
  },
  preferredContactMethod: {
    type: String,
    enum: ['email', 'whatsapp', 'both'],
    required: false // Will be auto-set based on available contact methods
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

// Pre-validation middleware to ensure schema compliance
enquirySchema.pre('validate', function(next) {
  // Convert empty email string to undefined
  if (this.email === '' || this.email === null) {
    this.email = undefined;
  }
  
  // Handle WhatsApp logic
  if (this.whatsappSameAsPhone && this.hasWhatsapp) {
    this.whatsapp = this.phone;
  } else if (!this.hasWhatsapp) {
    this.whatsapp = undefined;
  }
  
  // Auto-set preferred contact method based on available contact methods
  const hasValidEmail = this.email && this.email.trim() !== '';
  const hasValidWhatsapp = this.hasWhatsapp && this.whatsapp;
  
  if (hasValidEmail && hasValidWhatsapp) {
    this.preferredContactMethod = 'both';
  } else if (hasValidWhatsapp) {
    this.preferredContactMethod = 'whatsapp';
  } else if (hasValidEmail) {
    this.preferredContactMethod = 'email';
  } else {
    // Fallback - this should rarely happen due to validation requiring at least one contact method
    this.preferredContactMethod = 'email';
  }
  
  // Validate that at least one contact method is provided
  if (!this.email && (!this.whatsapp || !this.hasWhatsapp)) {
    const error = new Error('At least one contact method (email or WhatsApp number) is required');
    error.name = 'ValidationError';
    return next(error);
  }
  
  next();
});

module.exports = mongoose.model('Enquiry', enquirySchema); 
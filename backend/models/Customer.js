const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  leadId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lead', 
    required: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: false,
    sparse: true, // Allow multiple null values
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    validate: {
      validator: function(v) {
        const phoneRegex = /^[6-9]\d{9}$/;
        const cleanPhone = v.replace(/\D/g, '');
        const phoneWithoutCountryCode = cleanPhone.startsWith('91') && cleanPhone.length === 12 
          ? cleanPhone.substring(2) 
          : cleanPhone;
        return phoneRegex.test(phoneWithoutCountryCode);
      },
      message: 'Please enter a valid 10-digit Indian mobile number'
    }
  },
  whatsapp: {
    type: String,
    required: false,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const phoneRegex = /^[6-9]\d{9}$/;
        const cleanPhone = v.replace(/\D/g, '');
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
  countryCode: {
    type: String,
    default: '+91'
  },
  preferredContactMethod: {
    type: String,
    enum: ['email', 'whatsapp', 'both'],
    default: 'email'
  },
  businessName: {
    type: String
  },
  address: {
    type: String
  },
  customerType: {
    type: String,
    enum: ['end_user', 'plumber', 'dealer', 'builder', 'other']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Validation to ensure at least one contact method is provided
customerSchema.pre('validate', function(next) {
  // Handle WhatsApp logic
  if (this.whatsappSameAsPhone && this.hasWhatsapp) {
    this.whatsapp = this.phone;
  } else if (!this.hasWhatsapp) {
    this.whatsapp = undefined;
  }
  
  if (!this.email && (!this.whatsapp || !this.hasWhatsapp)) {
    const error = new Error('At least one contact method (email or WhatsApp number) is required');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

// Update the 'updatedAt' field before saving
customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Auto-set preferred contact method if not specified
  if (!this.preferredContactMethod) {
    if (this.email && this.whatsapp && this.hasWhatsapp) {
      this.preferredContactMethod = 'both';
    } else if (this.email) {
      this.preferredContactMethod = 'email';
    } else if (this.whatsapp && this.hasWhatsapp) {
      this.preferredContactMethod = 'whatsapp';
    }
  }
  
  next();
});

module.exports = mongoose.model('Customer', customerSchema); 
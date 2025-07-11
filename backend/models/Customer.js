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
    unique: true,
    sparse: true, // Allow multiple null values
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: false
  },
  whatsapp: {
    type: String,
    required: false
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
    enum: ['individual', 'plumber', 'dealer', 'business_owner']
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
  if (!this.email && !this.whatsapp) {
    const error = new Error('At least one contact method (email or whatsapp) is required');
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
    if (this.email && this.whatsapp) {
      this.preferredContactMethod = 'both';
    } else if (this.email) {
      this.preferredContactMethod = 'email';
    } else if (this.whatsapp) {
      this.preferredContactMethod = 'whatsapp';
    }
  }
  
  next();
});

module.exports = mongoose.model('Customer', customerSchema); 
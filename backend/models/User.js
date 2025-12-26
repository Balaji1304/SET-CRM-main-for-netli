const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: function() {
      // Only required for non-customer roles (admin requires email too)
      return this.role !== 'customer';
    },
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required for all roles'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please add a valid 10-digit phone number'],
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['customer', 'sales_person', 'front_office_executive', 'product_head', 'service_engineer', 'sales_head', 'marketing_coordinator', 'accounts_department', 'admin'],
    default: 'customer'
  },
  whatsapp: {
    type: String,
    trim: true,
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
  countryCode: {
    type: String,
    default: '+91'
  },
  // Notification preferences for all users
  notificationPreferences: {
    whatsappEnabled: {
      type: Boolean,
      default: false // Will be set dynamically based on role and available contact methods
    },
    emailEnabled: {
      type: Boolean,
      default: false // Will be set dynamically based on role and available contact methods
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-validation middleware to handle contact method logic
userSchema.pre('validate', function(next) {
  // Convert empty email to undefined for customers
  if (this.role === 'customer' && (this.email === '' || this.email === null)) {
    this.email = undefined;
  }
  
  // Validate that at least one contact method is provided for customers
  if (this.role === 'customer') {
    if (!this.email && !this.whatsapp) {
      const error = new Error('At least one contact method (email or WhatsApp number) is required for customers');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  
  next();
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Set notification preferences defaults based on role and available contact methods
  // Only set defaults if notification preferences haven't been explicitly set
  if (this.isNew || !this.notificationPreferences || 
      (this.notificationPreferences.whatsappEnabled === undefined && this.notificationPreferences.emailEnabled === undefined)) {
    
    const hasValidEmail = this.email && this.email.trim() !== '';
    const hasValidWhatsapp = this.whatsapp && this.whatsapp.trim() !== '';
    const hasValidPhone = this.phone && this.phone.trim() !== '';
    
    if (this.role === 'customer') {
      // For customers: Enable based on availability of contact methods
      this.notificationPreferences = {
        whatsappEnabled: hasValidWhatsapp,
        emailEnabled: hasValidEmail
      };
    } else {
      // For all other users: Default to WhatsApp only (uses phone as fallback)
      this.notificationPreferences = {
        whatsappEnabled: hasValidPhone || hasValidWhatsapp,
        emailEnabled: false
      };
    }
  }
  
  next();
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create sparse unique index on email to allow multiple null values
// but ensure uniqueness when email is present
userSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema); 
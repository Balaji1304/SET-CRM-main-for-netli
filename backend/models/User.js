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
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['customer', 'sales_person', 'sales_representative', 'front_office_executive', 'product_head', 'service_engineer', 'sales_head', 'marketing_coordinator', 'accounts_department'],
    default: 'customer'
  },
  // Contact information for service engineers (field work)
  phone: {
    type: String,
    required: function() {
      return this.role === 'service_engineer';
    },
    trim: true
  },
  whatsapp: {
    type: String,
    trim: true,
    // Use phone number if whatsapp is not provided for service engineers
    default: function() {
      return this.role === 'service_engineer' ? this.phone : undefined;
    }
  },
  countryCode: {
    type: String,
    default: '+91'
  },
  // Notification preferences for service engineers
  notificationPreferences: {
    whatsappEnabled: {
      type: Boolean,
      default: function() {
        return this.role === 'service_engineer'; // Auto-enable for engineers
      }
    },
    emailEnabled: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
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

module.exports = mongoose.model('User', userSchema); 
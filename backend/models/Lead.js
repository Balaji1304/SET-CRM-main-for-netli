const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['solar_panels', 'inverters', 'batteries', 'mounting_systems']
  },
  name: {
    type: String,
    required: [true, 'Product name is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  }
}, {
  _id: false
});

const leadSchema = new mongoose.Schema({
  // Lead Type Information
  leadType: {
    type: String,
    required: [true, 'Lead type is required'],
    enum: ['new_customer', 'referral', 'event_lead']
  },

  // Personal Information
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
    required: [true, 'Email is required'],
    unique: true,
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
  address: {
    type: String,
    required: [true, 'Address is required']
  },

  // Business Information
  businessName: {
    type: String,
    required: [true, 'Business name is required']
  },
  customerType: {
    type: String,
    required: [true, 'Customer type is required'],
    enum: ['individual', 'plumber', 'dealer', 'business_owner']
  },

  // Product Information
  products: [productSchema],
  productRequirements: {
    type: String,
    trim: true
  },

  // Additional Information
  interestStage: {
    type: String,
    required: [true, 'Interest stage is required'],
    enum: ['new_lead', 'in_negotiation', 'quotation_sent']
  },
  dateCollected: {
    type: Date,
    required: [true, 'Date of lead collection is required']
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },

  // Status Information
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['active', 'pending', 'closed'],
    default: 'pending'
  },
  source: {
    type: String,
    required: [true, 'Source is required'],
    enum: ['exhibition', 'facebook', 'website', 'referral', 'cold_call'],
    default: 'website'
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

leadSchema.pre('save', function(next) {
  next();
});

module.exports = mongoose.model('Lead', leadSchema); 
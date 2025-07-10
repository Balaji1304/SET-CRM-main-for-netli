const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Product ID is required']
  },
  category: {
    type: String,
    required: [true, 'Product category is required']
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
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  // Bundle-specific fields
  isBundleItem: {
    type: Boolean,
    default: false
  },
  bundleCode: {
    type: String,
    required: false
  },
  bundleItems: {
    type: Array,
    default: []
  }
}, {
  _id: false
});

const leadSchema = new mongoose.Schema({
  // Lead Type Information  
  leadType: {
    type: String,
    required: [true, 'Lead type is required'],
    enum: {
      values: ['new_customer', 'referral', 'event_lead', 'exhibition', 'facebook', 'instagram', 'linkedin', 'google_ads', 'website', 'cold_call', 'walk_in'],
      message: 'Lead type must be one of: new_customer, referral, event_lead, exhibition, facebook, instagram, linkedin, google_ads, website, cold_call, walk_in'
    }
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
  whatsapp: {
    type: String,
    required: [true, 'WhatsApp number is required']
  },
  billingAddress: {
    type: String,
    required: [true, 'Billing address is required']
  },
  shippingAddress: {
    type: String,
    required: false
  },
  // Legacy field for backward compatibility (mapped to billingAddress)
  address: {
    type: String,
    required: false
  },

  // Business Information
  businessName: {
    type: String,
    required: false,
    trim: true
  },
  customerType: {
    type: String,
    required: [true, 'Customer type is required'],
    enum: {
      values: ['individual', 'plumber', 'dealer', 'builder', 'architect', 'business_owner', 'other'],
      message: 'Customer type must be one of: individual, plumber, dealer, builder, architect, business_owner, other'
    }
  },
  gstinUin: {
    type: String,
    required: false,
    trim: true
  },

  // Product Information
  selectedProductType: {
    type: String,
    enum: ['individual', 'bundle'],
    default: 'individual'
  },
  products: [productSchema],
  productRequirements: {
    type: String,
    trim: true
  },

  // Additional Information
  interestStage: {
    type: String,
    required: [true, 'Interest stage is required'],
    enum: {
      values: ['new_lead', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'],
      message: 'Interest stage must be one of: new_lead, contacted, qualified, proposal_sent, negotiation, won, lost'
    }
  },
  dateCollected: {
    type: Date,
    required: [true, 'Date of lead collection is required']
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDateTime: {
    type: Date,
    required: false
  },

  // Status Information
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['active', 'pending', 'on_hold', 'closed_won', 'closed_lost'],
      message: 'Status must be one of: active, pending, on_hold, closed_won, closed_lost'
    },
    default: 'pending'
  },


  // Geolocation fields
  latitude: {
    type: Number,
    required: false
  },
  longitude: {
    type: Number,
    required: false
  },

  // Notes
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

// Pre-save middleware to handle field mapping and validation
leadSchema.pre('save', function(next) {
  // Map billingAddress to address for backward compatibility
  if (this.billingAddress && !this.address) {
    this.address = this.billingAddress;
  }
  
  // Ensure products don't have the old 'price' field
  if (this.products && this.products.length > 0) {
    this.products.forEach(product => {
      if (product.price && !product.unitPrice) {
        product.unitPrice = product.price;
        delete product.price;
      }
    });
  }
  
  next();
});

// Pre-validation middleware to ensure schema compliance
leadSchema.pre('validate', function(next) {
  // Ensure required fields are properly set
  if (!this.billingAddress && this.address) {
    this.billingAddress = this.address;
  }
  
  next();
});

module.exports = mongoose.model('Lead', leadSchema); 
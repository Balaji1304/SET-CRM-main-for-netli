const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false  // Make flexible - will be validated in pre-save middleware
  },
  category: {
    type: String,
    required: false  // Make flexible - will be validated in pre-save middleware
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
      values: ['referral', 'indiamart', 'exhibition', 'facebook', 'instagram', 'google_ads', 'website', 'cold_call', 'walk_in', 'paper_ad', 'existing_customer', 'other'],
      message: 'Lead type must be one of: referral, indiamart, exhibition, facebook, instagram, google_ads, website, cold_call, walk_in, paper_ad, existing_customer, other'
    }
  },
  customLeadType: {
    type: String,
    required: false,
    trim: true
  },

  // Personal Information
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
    required: function() {
      // Email is only required for complete leads or non-enquiry leads
      return this.leadCompletionStatus === 'complete' || !this.createdFromEnquiry;
    },
    unique: true,
    sparse: true, // Allow multiple documents with null/undefined email
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
      values: ['end_user', 'plumber', 'dealer', 'builder', 'other'],
      message: 'Customer type must be one of: end_user, plumber, dealer, builder, other'
    }
  },
  customCustomerType: {
    type: String,
    required: false,
    trim: true
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
  dateCollected: {
    type: Date,
    required: [true, 'Date of lead collection is required']
  },
  
  // Enquiry Integration Fields
  createdFromEnquiry: {
    type: Boolean,
    default: false
  },
  enquiryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enquiry',
    required: false
  },
  leadCompletionStatus: {
    type: String,
    enum: ['complete', 'incomplete', 'pending_completion'],
    default: 'complete'
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
  
  // Auto-update completion status for enquiry-generated leads
  if (this.createdFromEnquiry && this.leadCompletionStatus === 'incomplete') {
    console.log(`Checking completion status for enquiry-generated lead ${this._id}...`);
    console.log(`Products:`, this.products);
    console.log(`Selected product type:`, this.selectedProductType);
    
    // Check if lead now has proper product information
    const hasValidProducts = this.products && this.products.length > 0 && 
      this.products.every(product => {
        // Skip placeholder products
        if (product.name === 'Products to be specified by salesperson') {
          console.log(`Skipping placeholder product: ${product.name}`);
          return false;
        }
        
        // For individual products, check required fields
        if (this.selectedProductType === 'individual') {
          const isValid = product.productId && product.category && product.name && 
                          product.quantity > 0 && product.unitPrice >= 0;
          console.log(`Individual product ${product.name} validation:`, {
            productId: !!product.productId,
            category: !!product.category,
            name: !!product.name,
            quantity: product.quantity > 0,
            unitPrice: product.unitPrice >= 0,
            isValid
          });
          return isValid;
        }
        // For bundles, check bundle-specific fields
        else if (this.selectedProductType === 'bundle') {
          const isValid = product.name && product.quantity > 0 && product.unitPrice >= 0 &&
                          (product.isBundleItem || product.productId);
          console.log(`Bundle product ${product.name} validation:`, {
            name: !!product.name,
            quantity: product.quantity > 0,
            unitPrice: product.unitPrice >= 0,
            bundleOrProduct: !!(product.isBundleItem || product.productId),
            isValid
          });
          return isValid;
        }
        return false;
      });
    
    // Also check if email is provided (not required but indicates completion)
    const hasEmail = this.email && this.email !== undefined && !this.email.includes('temp.setcrmleads.com');
    
    console.log(`Completion check results:`, {
      hasValidProducts,
      hasEmail,
      productsCount: this.products?.length || 0
    });
    
    // Mark as complete if products are properly filled
    if (hasValidProducts) {
      this.leadCompletionStatus = 'complete';
      console.log(`✅ Lead ${this._id} marked as COMPLETE - products filled by salesperson`);
    } else {
      console.log(`❌ Lead ${this._id} remains INCOMPLETE - products not fully filled`);
    }
  }
  
  // Validate product requirements for complete leads (non-enquiry or completed enquiry)
  if (this.leadCompletionStatus === 'complete' || !this.createdFromEnquiry) {
    if (!this.products || this.products.length === 0) {
      return next(new Error('At least one product is required for complete leads'));
    }
    
    for (let i = 0; i < this.products.length; i++) {
      const product = this.products[i];
      
      // For individual products
      if (this.selectedProductType === 'individual') {
        if (!product.productId) {
          return next(new Error(`Product ${i + 1}: Product ID is required`));
        }
        if (!product.category) {
          return next(new Error(`Product ${i + 1}: Category is required`));
        }
      }
      
      // For bundles
      else if (this.selectedProductType === 'bundle') {
        if (!product.isBundleItem && !product.productId) {
          return next(new Error(`Product ${i + 1}: Either bundle item flag or product ID is required`));
        }
      }
      
      // Common validations for all products
      if (!product.name) {
        return next(new Error(`Product ${i + 1}: Name is required`));
      }
      if (!product.quantity || product.quantity < 1) {
        return next(new Error(`Product ${i + 1}: Valid quantity is required`));
      }
      if (product.unitPrice < 0) {
        return next(new Error(`Product ${i + 1}: Unit price cannot be negative`));
      }
    }
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
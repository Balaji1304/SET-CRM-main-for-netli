const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  quotationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Quotation', 
    required: true 
  },
  // Either productId OR bundleId should be provided, not both
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product'
  },
  bundleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductBundle'
  },
  itemType: {
    type: String,
    enum: ['product', 'bundle'],
    required: true,
    default: 'product'
  },
  quantity: { 
    type: Number, 
    required: true,
    min: [1, 'Quantity must be at least 1'] 
  },
  unitPrice: { 
    type: Number, 
    required: true,
    min: [0, 'Unit price cannot be negative'] 
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  subtotal: { 
    type: Number, 
    required: true 
  },
  // For bundles, store the selected brand preference
  brandPreference: {
    type: String,
    enum: ['panasonic', 'growatt', 'vikram', 'tata', 'luminous', 'exide', 'other']
  },
  // Store bundle configuration details for reference
  bundleConfiguration: {
    subcategory: String, // '2kva', '4kva', etc.
    specifications: Object,
    itemsIncluded: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Validation and pre-save hooks
quotationItemSchema.pre('save', function(next) {
  // Ensure either productId or bundleId is provided, not both
  if (this.itemType === 'product' && !this.productId) {
    return next(new Error('ProductId is required when itemType is product'));
  }
  if (this.itemType === 'bundle' && !this.bundleId) {
    return next(new Error('BundleId is required when itemType is bundle'));
  }
  if (this.productId && this.bundleId) {
    return next(new Error('Cannot have both productId and bundleId in the same item'));
  }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('QuotationItem', quotationItemSchema); 
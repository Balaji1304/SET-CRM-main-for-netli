const mongoose = require('mongoose');

const bundleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  isOptional: {
    type: Boolean,
    default: false
  },
  alternativeProducts: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    priceAdjustment: {
      type: Number,
      default: 0
    }
  }]
}, { _id: false });

const productBundleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Bundle name is required'],
    trim: true
  },
  bundleCode: {
    type: String,
    required: [true, 'Bundle code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Bundle category is required'],
    default: 'power_plants_system'
  },
  subcategory: {
    type: String,
    required: [true, 'Subcategory is required'],
    enum: ['2kva', '4kva', '5kva', '10kva', 'custom']
  },
  description: {
    type: String,
    required: [true, 'Bundle description is required'],
    trim: true
  },
  items: [bundleItemSchema],
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  finalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  specifications: {
    totalCapacity: String,
    totalPanels: Number,
    inverterCapacity: String,
    batteryCapacity: String,
    estimatedOutput: String,
    installationArea: String,
    warranty: String,
    gridConnection: {
      type: String,
      enum: ['on-grid', 'off-grid', 'hybrid'],
      default: 'hybrid'
    }
  },
  supportedBrands: [{
    type: String,
    enum: ['panasonic', 'growatt', 'vikram', 'tata', 'luminous', 'exide', 'other']
  }],
  imageUrls: [{
    type: String
  }],
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Calculate final price before saving
productBundleSchema.pre('save', function(next) {
  if (this.isModified('basePrice') || this.isModified('discountPercentage')) {
    const discountAmount = this.basePrice * (this.discountPercentage / 100);
    this.finalPrice = this.basePrice - discountAmount;
  }
  this.updatedAt = Date.now();
  next();
});

// Virtual to get total individual product price
productBundleSchema.virtual('individualProductsTotal').get(function() {
  return this.populated('items.product') ? 
    this.items.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0) : null;
});

// Virtual to calculate savings
productBundleSchema.virtual('savings').get(function() {
  if (this.individualProductsTotal) {
    return this.individualProductsTotal - this.finalPrice;
  }
  return null;
});

productBundleSchema.set('toJSON', { virtuals: true });
productBundleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ProductBundle', productBundleSchema); 
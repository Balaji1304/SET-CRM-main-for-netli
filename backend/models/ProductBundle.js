const mongoose = require('mongoose');

const bundleItemSchema = new mongoose.Schema({
  solarItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SolarBundleItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  }
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
  items: {
    type: [bundleItemSchema],
    default: [] // Allow empty items array
  },
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
    required: false, // Will be calculated automatically
    min: 0,
    default: 0
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

// Calculate final price before validation and saving
productBundleSchema.pre('validate', function(next) {
  try {
    const basePrice = Number(this.basePrice) || 0;
    const discountPercentage = Number(this.discountPercentage) || 0;
    const discountAmount = basePrice * (discountPercentage / 100);
    this.finalPrice = basePrice - discountAmount;
    next();
  } catch (error) {
    console.error('Error in pre-validate hook:', error);
    next(error);
  }
});

// Update timestamp before saving
productBundleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual to get total number of items
productBundleSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + (item.quantity || 0), 0);
});

// Virtual to calculate savings
productBundleSchema.virtual('savings').get(function() {
  if (this.basePrice && this.finalPrice) {
    return this.basePrice - this.finalPrice;
  }
  return 0;
});

productBundleSchema.set('toJSON', { virtuals: true });
productBundleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ProductBundle', productBundleSchema); 
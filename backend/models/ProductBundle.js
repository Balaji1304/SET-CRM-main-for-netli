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
    trim: true
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
  price: {
    type: Number,
    required: true,
    min: 0
  },
  // System Configuration fields
  systemConfiguration: {
    systemDescription: {
      type: String,
      trim: true,
      maxLength: [100, 'System description cannot exceed 100 characters']
    },
    installedCapacityKWP: {
      type: Number,
      min: 0,
      validate: {
        validator: function(v) {
          return v === null || v === undefined || v >= 0;
        },
        message: 'Installed capacity must be a positive number'
      }
    },
    moduleSpecification: {
      type: String,
      trim: true,
      maxLength: [50, 'Module specification cannot exceed 50 characters']
    },
    inverterSpecification: {
      type: String,
      trim: true,
      maxLength: [30, 'Inverter specification cannot exceed 30 characters']
    },
    areaRequired: {
      type: String,
      trim: true,
      maxLength: [30, 'Area required cannot exceed 30 characters']
    }
  },
  imageUrls: [{
    type: String
  }],
  tags: [String],
  termsAndConditions: {
    type: String,
    trim: true,
    maxLength: [5000, 'Terms and conditions cannot be more than 5000 characters']
  },
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

// Update timestamp before saving
productBundleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual to get total number of items
productBundleSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + (item.quantity || 0), 0);
});

productBundleSchema.set('toJSON', { virtuals: true });
productBundleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ProductBundle', productBundleSchema); 
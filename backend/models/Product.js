const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true
  },
  modelNumber: {
    type: String,
    required: [true, 'Please add a model number'],
    unique: true,
    trim: true
  },
  stockStatus: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: 0
  },
  availability: {
    type: String,
    enum: ['Available', 'Limited', 'Unavailable'],
    default: 'Available'
  },
  specifications: {
    type: String,
    trim: true
  },
  warrantyPeriod: {
    type: String,
    trim: true
  },
  leadTime: {
    type: String,
    trim: true
  },
  brochureUrl: {
    type: String,
    trim: true
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

// Update the 'updatedAt' field before saving
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add any methods or middleware here
productSchema.methods.updateStock = function(quantity) {
  if (quantity <= 0) {
    this.stockStatus = 'Out of Stock';
  } else if (quantity <= 10) {
    this.stockStatus = 'Low Stock';
  } else {
    this.stockStatus = 'In Stock';
  }
};

module.exports = mongoose.model('Product', productSchema); 
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
  description: {
    type: String,
    required: [true, 'Please add a product description'],
    trim: true,
    maxLength: [10000, 'Description cannot be more than 10000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  reorderLevel: {
    type: Number,
    required: true,
    default: 10
  },
  category: {
    type: String,
    required: [true, 'Please add a product category'],
    trim: true
  },
  brand: {
    type: String,
    required: [true, 'Please add a product brand'],
    enum: ['panasonic', 'growatt', 'vikram', 'tata', 'luminous', 'exide', 'other'],
    trim: true
  },
  isBundleCompatible: {
    type: Boolean,
    default: false
  },
  compatibleBundles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductBundle'
  }],
  specifications: {
    type: Object,
    default: {
      power: '',
      efficiency: '',
      warranty: '',
      dimensions: ''
    },
    required: true
  },
  imageUrls: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
});

// Update the 'updatedAt' field before saving
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add any methods or middleware here

module.exports = mongoose.model('Product', productSchema); 
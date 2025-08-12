const mongoose = require('mongoose');

const customizedProductSchema = new mongoose.Schema({
  // Basic fields entered during lead creation
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  
  // Reference to the lead this customized product belongs to
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  
  // Additional fields entered during quotation creation (matching Product model)
  modelNumber: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxLength: [10000, 'Description cannot be more than 10000 characters']
  },
  specifications: {
    type: Object,
    default: {
      power: '',
      efficiency: '',
      warranty: '',
      dimensions: ''
    }
  },
  imageUrls: [{
    type: String
  }],
  
  // Status tracking
  isCompleted: {
    type: Boolean,
    default: false // True when quotation details are added
  },
  
  // Metadata
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

// Update the 'updatedAt' field before saving
customizedProductSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
customizedProductSchema.index({ leadId: 1 });
customizedProductSchema.index({ createdBy: 1 });

module.exports = mongoose.model('CustomizedProduct', customizedProductSchema);

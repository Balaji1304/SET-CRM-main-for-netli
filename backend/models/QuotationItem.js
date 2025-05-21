const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  quotationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Quotation', 
    required: true 
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate subtotal before saving
quotationItemSchema.pre('save', function(next) {
  // If subtotal isn't already set, calculate it
  if (!this.subtotal) {
    this.subtotal = (this.quantity * this.unitPrice) - (this.discount || 0);
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('QuotationItem', quotationItemSchema); 
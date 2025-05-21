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
  // The controller now correctly calculates and sets subtotal.
  // This pre-save hook for subtotal calculation is no longer strictly necessary
  // if the controller always provides it. However, it can serve as a fallback
  // or for direct model manipulations if any occur elsewhere.
  // For clarity and to rely on controller logic, we can comment it out or ensure it only runs if subtotal is missing.

  // if (this.isNew && typeof this.subtotal !== 'number') { // Or simply remove if controller is sole source
  //   const discountAmount = (this.unitPrice * (this.discount || 0) / 100) * this.quantity;
  //   this.subtotal = (this.quantity * this.unitPrice) - discountAmount;
  // }
  
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('QuotationItem', quotationItemSchema); 
const mongoose = require('mongoose');

const packageItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
});

const packageSchema = new mongoose.Schema(
  {
    packageNumber: {
      type: String,
      required: true,
      unique: true,
    },
    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerPurchase',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    status: {
      type: String,
      enum: ['Not Shipped', 'Shipped', 'Delivered'],
      default: 'Not Shipped',
    },
    items: [packageItemSchema],
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Package', packageSchema); 
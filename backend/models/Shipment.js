const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema(
  {
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    carrier: {
      type: String,
      required: true,
      trim: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
    },
    shippedDate: {
      type: Date,
      default: null,
    },
    deliveredDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shipment', shipmentSchema); 
const mongoose = require('mongoose');

const solarBundleItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    unique: true
  },
  warranty: {
    type: String,
    required: [true, 'Warranty is required'],
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
solarBundleItemSchema.index({ name: 1 });

// Static method to get all items
solarBundleItemSchema.statics.getAllActiveItems = function() {
  return this.find({}).sort({ name: 1 });
};

solarBundleItemSchema.set('toJSON', { virtuals: true });
solarBundleItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SolarBundleItem', solarBundleItemSchema); 
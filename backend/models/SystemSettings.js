const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  gatewayChargeMode: {
    type: String,
    enum: ['customer', 'company'],
    default: 'company'
  },
  gatewayChargePercent: {
    type: Number,
    default: 2,
    min: 0,
    max: 10
  },
  gatewayChargeGstPercent: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

systemSettingsSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Singleton: always upsert with a fixed _id
systemSettingsSchema.statics.get = async function () {
  const SINGLETON_ID = '000000000000000000000001';
  let doc = await this.findById(SINGLETON_ID);
  if (!doc) {
    doc = await this.create({ _id: SINGLETON_ID });
  }
  return doc;
};

systemSettingsSchema.statics.set = async function (updates, userId) {
  const SINGLETON_ID = '000000000000000000000001';
  return this.findByIdAndUpdate(
    SINGLETON_ID,
    { ...updates, updatedBy: userId, updatedAt: Date.now() },
    { new: true, upsert: true, runValidators: true }
  );
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);

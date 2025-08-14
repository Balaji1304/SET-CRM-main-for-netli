const mongoose = require('mongoose');

const solarBundleItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    unique: true
  },
  componentType: {
    type: String,
    required: [true, 'Component type is required'],
    enum: ['module', 'structure', 'electrical', 'conditioning', 'protection', 'cable'],
    default: 'electrical'
  },
  warranty: {
    type: String,
    required: [true, 'Warranty is required'],
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

// Update timestamp before saving
solarBundleItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better performance
solarBundleItemSchema.index({ name: 1 });
solarBundleItemSchema.index({ componentType: 1 });

// Static method to get all items
solarBundleItemSchema.statics.getAllActiveItems = function() {
  return this.find({}).sort({ componentType: 1, name: 1 });
};

// Static method to ensure default solar bundle items exist
solarBundleItemSchema.statics.ensureDefaultItems = async function() {
  const defaultItems = [
    { name: 'SPV Modules : ≥ 540Wp', componentType: 'module', warranty: '25 Years' },
    { name: 'Module Mounting Structure', componentType: 'structure', warranty: '10 Years' },
    { name: 'AC & DC Junction Boxes', componentType: 'electrical', warranty: '5 Years' },
    { name: 'Power Conditioning Unit – 3 Phase, 415 VAC', componentType: 'conditioning', warranty: '5 Years' },
    { name: 'Earthing Hit', componentType: 'protection', warranty: '10 Years' },
    { name: 'Lightning Arrester', componentType: 'protection', warranty: '10 Years' },
    { name: 'DC Cables 4sqmm (Polycab)', componentType: 'cable', warranty: '25 Years' },
    { name: 'Cable AC', componentType: 'cable', warranty: '25 Years' }
  ];

  const promises = defaultItems.map(async (item) => {
    try {
      await this.findOneAndUpdate(
        { name: item.name },
        { 
          $set: { 
            componentType: item.componentType,
            warranty: item.warranty,
            updatedAt: Date.now()
          }
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );
    } catch (error) {
      if (error.code !== 11000) { // Ignore duplicate key errors
        console.error(`Error ensuring solar bundle item ${item.name}:`, error);
      }
    }
  });

  await Promise.all(promises);
};

solarBundleItemSchema.set('toJSON', { virtuals: true });
solarBundleItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('SolarBundleItem', solarBundleItemSchema); 
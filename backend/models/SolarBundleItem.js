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
  make: {
    type: String,
    required: [true, 'Make is required'],
    trim: true
  },
  warranty: {
    type: String,
    required: [true, 'Warranty is required'],
    trim: true
  },
  sortOrder: {
    type: Number,
    default: 0
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
solarBundleItemSchema.index({ sortOrder: 1 });

// Static method to get all items
solarBundleItemSchema.statics.getAllActiveItems = function() {
  return this.find({}).sort({ sortOrder: 1, name: 1 });
};

// Static method to ensure default solar bundle items exist
solarBundleItemSchema.statics.ensureDefaultItems = async function() {
  const defaultItems = [
    { name: 'SPV Modules : ≥ 540Wp', componentType: 'module', make: 'Panasonic/ Vikram/ Rayzan/ Novas Solar', warranty: '25 Years', sortOrder: 1 },
    { name: 'Module Mounting Structure', componentType: 'structure', make: 'Standard make Galvanized Iron Normal mountable', warranty: '10 Years', sortOrder: 2 },
    { name: 'AC & DC Junction Boxes', componentType: 'electrical', make: 'Hansel/ CEC/ ESK/ VNT/ other make compliant to bid requirements', warranty: '5 Years', sortOrder: 3 },
    { name: 'Power Conditioning Unit – 3 Phase, 415 VAC', componentType: 'conditioning', make: 'Havells/ Growatt/ Deye', warranty: '5 Years', sortOrder: 4 },
    { name: 'Earthing Hit', componentType: 'protection', make: 'Reputed brand chemical earthing', warranty: '10 Years', sortOrder: 5 },
    { name: 'Lightning Arrester', componentType: 'protection', make: 'Provided as per IEC Standards', warranty: '10 Years', sortOrder: 6 },
    { name: 'DC Cables 4sqmm (Polycab)', componentType: 'cable', make: 'Provide', warranty: '25 Years', sortOrder: 7 },
    { name: 'Cable AC', componentType: 'cable', make: 'Orbit/ Polycab/ Havells', warranty: '25 Years', sortOrder: 8 }
  ];

  const promises = defaultItems.map(async (item) => {
    try {
      await this.findOneAndUpdate(
        { name: item.name },
        { 
          $set: { 
            componentType: item.componentType,
            make: item.make,
            warranty: item.warranty,
            sortOrder: item.sortOrder,
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
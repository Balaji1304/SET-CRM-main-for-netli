const mongoose = require('mongoose');
const SolarBundleItem = require('../models/SolarBundleItem');

/**
 * Migration to add sortOrder field to existing SolarBundleItem documents
 * and set the proper order for default components
 */
const updateSolarBundleItemsSortOrder = async () => {
  try {
    console.log('Starting SolarBundleItem sortOrder migration...');
    
    // Define the desired sort order mapping
    const sortOrderMap = {
      'SPV Modules : ≥ 540Wp': 1,
      'Module Mounting Structure': 2,
      'AC & DC Junction Boxes': 3,
      'Power Conditioning Unit – 3 Phase, 415 VAC': 4,
      'Earthing Hit': 5,
      'Lightning Arrester': 6,
      'DC Cables 4sqmm (Polycab)': 7,
      'Cable AC': 8
    };
    
    // Get all existing SolarBundleItems
    const items = await SolarBundleItem.find({});
    console.log(`Found ${items.length} solar bundle items to update`);
    
    // Update each item with its sort order
    const updatePromises = items.map(async (item) => {
      const sortOrder = sortOrderMap[item.name] || 999; // Default to 999 for unknown items
      
      const result = await SolarBundleItem.updateOne(
        { _id: item._id },
        { 
          $set: { 
            sortOrder: sortOrder,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`Updated ${item.name} with sortOrder: ${sortOrder}`);
      return result;
    });
    
    await Promise.all(updatePromises);
    
    console.log('SolarBundleItem sortOrder migration completed successfully');
    return { success: true, message: 'Migration completed' };
    
  } catch (error) {
    console.error('Error during SolarBundleItem sortOrder migration:', error);
    throw error;
  }
};

// Export for use in other scripts or manual execution
module.exports = updateSolarBundleItemsSortOrder;

// If running this file directly
if (require.main === module) {
  const runMigration = async () => {
    try {
      // Connect to MongoDB (use your actual MongoDB URI)
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/your-database';
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      console.log('Connected to MongoDB');
      
      // Run migration
      await updateSolarBundleItemsSortOrder();
      
      console.log('Migration completed successfully');
      process.exit(0);
      
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  };
  
  runMigration();
}

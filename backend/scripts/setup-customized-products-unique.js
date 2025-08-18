const mongoose = require('mongoose');
require('dotenv').config();

async function setupCustomizedProductsUnique() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/solar-crm', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('customizedproducts');
    
    // Drop existing index if any (in case of re-run)
    try {
      await collection.dropIndex('name_1');
      console.log('Dropped existing name index');
    } catch (err) {
      console.log('No existing name index to drop');
    }
    
    // Create unique index on name field
    await collection.createIndex({ name: 1 }, { unique: true });
    console.log('✅ Created unique index on customized product name field');
    
    // Verify the index was created
    const indexes = await collection.indexes();
    const nameIndex = indexes.find(idx => idx.key && idx.key.name === 1);
    
    if (nameIndex && nameIndex.unique) {
      console.log('✅ Unique constraint on name field is active');
    } else {
      console.log('❌ Failed to create unique constraint');
    }
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('Customized products will now be globally unique by name.');
    
  } catch (error) {
    console.error('❌ Error during setup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the setup
setupCustomizedProductsUnique();

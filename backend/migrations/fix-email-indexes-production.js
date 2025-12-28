/**
 * Production Migration: Fix email indexes for users and customers collections
 * 
 * This migration ensures that both users and customers collections have sparse unique
 * indexes on the email field, allowing multiple documents with null email values.
 * 
 * Run this on production via Render Shell:
 * 1. Go to your Render dashboard
 * 2. Select your backend service
 * 3. Go to "Shell" tab
 * 4. Run: node migrations/fix-email-indexes-production.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fixEmailIndexesProduction = async () => {
  try {
    // Use MONGODB_URI from environment (Render will have this set)
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database:', mongoose.connection.db.databaseName);

    const db = mongoose.connection.db;
    
    // ========== FIX USERS COLLECTION ==========
    console.log('\n' + '='.repeat(60));
    console.log('FIXING USERS COLLECTION');
    console.log('='.repeat(60));
    
    const usersCollection = db.collection('users');
    const userIndexes = await usersCollection.indexes();
    
    console.log('\n📋 Current indexes on USERS:');
    userIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(unique)' : ''} ${idx.sparse ? '(sparse)' : ''}`);
    });

    // Drop old email indexes on users
    const userEmailIndexes = userIndexes.filter(idx => 
      idx.key.email !== undefined && idx.name !== '_id_'
    );

    if (userEmailIndexes.length > 0) {
      console.log('\n🗑️  Dropping old email indexes on USERS...');
      for (const idx of userEmailIndexes) {
        try {
          await usersCollection.dropIndex(idx.name);
          console.log(`  ✓ Dropped: ${idx.name}`);
        } catch (err) {
          console.log(`  ⚠ Could not drop ${idx.name}: ${err.message}`);
        }
      }
    }

    // Create new sparse unique index on users
    console.log('\n✨ Creating sparse unique index on USERS email...');
    await usersCollection.createIndex(
      { email: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'email_1_sparse',
        background: true
      }
    );
    console.log('  ✓ Created email_1_sparse index');

    const usersWithNullEmail = await usersCollection.countDocuments({ email: null });
    console.log(`\n📊 Users with null email: ${usersWithNullEmail}`);

    // ========== FIX CUSTOMERS COLLECTION ==========
    console.log('\n' + '='.repeat(60));
    console.log('FIXING CUSTOMERS COLLECTION');
    console.log('='.repeat(60));
    
    const customersCollection = db.collection('customers');
    const customerIndexes = await customersCollection.indexes();
    
    console.log('\n📋 Current indexes on CUSTOMERS:');
    customerIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(unique)' : ''} ${idx.sparse ? '(sparse)' : ''}`);
    });

    // Drop old email indexes on customers
    const customerEmailIndexes = customerIndexes.filter(idx => 
      idx.key.email !== undefined && idx.name !== '_id_'
    );

    if (customerEmailIndexes.length > 0) {
      console.log('\n🗑️  Dropping old email indexes on CUSTOMERS...');
      for (const idx of customerEmailIndexes) {
        try {
          await customersCollection.dropIndex(idx.name);
          console.log(`  ✓ Dropped: ${idx.name}`);
        } catch (err) {
          console.log(`  ⚠ Could not drop ${idx.name}: ${err.message}`);
        }
      }
    }

    // Create new sparse unique index on customers
    console.log('\n✨ Creating sparse unique index on CUSTOMERS email...');
    await customersCollection.createIndex(
      { email: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'email_1_sparse',
        background: true
      }
    );
    console.log('  ✓ Created email_1_sparse index');

    const customersWithNullEmail = await customersCollection.countDocuments({ email: null });
    console.log(`\n📊 Customers with null email: ${customersWithNullEmail}`);

    // ========== VERIFY FINAL STATE ==========
    console.log('\n' + '='.repeat(60));
    console.log('FINAL VERIFICATION');
    console.log('='.repeat(60));
    
    const finalUserIndexes = await usersCollection.indexes();
    console.log('\n✅ Final USERS indexes:');
    finalUserIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(unique)' : ''} ${idx.sparse ? '(sparse)' : ''}`);
    });

    const finalCustomerIndexes = await customersCollection.indexes();
    console.log('\n✅ Final CUSTOMERS indexes:');
    finalCustomerIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(unique)' : ''} ${idx.sparse ? '(sparse)' : ''}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n⚠️  IMPORTANT: Restart your Render service to apply changes!');
    console.log('   Go to Render Dashboard → Your Service → Manual Deploy\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

fixEmailIndexesProduction();

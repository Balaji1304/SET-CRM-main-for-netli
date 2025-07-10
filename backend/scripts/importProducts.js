const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const Product = require('../models/Product');

// Load environment variables
require('dotenv').config();

// Database connection
const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/solar-crm';
    
    // Ensure database name is included
    if (mongoUri.endsWith('/')) {
      mongoUri += 'solar-crm';
    } else if (!mongoUri.includes('/', 10)) { // Check if database name exists after protocol
      mongoUri += '/solar-crm';
    }
    console.log(`🔗 Connecting to: ${mongoUri}`);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('💡 Make sure MongoDB is running and the MONGODB_URI in .env is correct');
    process.exit(1);
  }
};

// Transform data to match expected format
const transformProduct = (product) => {
  const transformed = {
    name: product.name,
    modelNumber: product.modelNumber,
    description: product.description,
    price: parseFloat(product.price),
    category: product.category,
    specifications: product.specifications,
    quantity: product.quantity || 50,
    reorderLevel: product.reorderLevel || 10,
    imageUrls: Array.isArray(product.imageUrls) 
      ? product.imageUrls.flat().filter(url => url && typeof url === 'string')
      : [],
  };

  // Explicitly exclude _id field to let MongoDB generate new ObjectIds
  // This ensures fresh ObjectIds are created regardless of input data
  delete transformed._id;

  // Handle specifications if it's a string (parse JSON)
  if (typeof transformed.specifications === 'string') {
    try {
      transformed.specifications = JSON.parse(transformed.specifications);
    } catch (error) {
      console.warn(`⚠️  Invalid specifications JSON for product: ${product.name}`);
      transformed.specifications = {};
    }
  }

  return transformed;
};

// Import products with progress tracking
const importProducts = async (filePath) => {
  try {
    console.log('📁 Reading products file...');
    const fileContent = await fs.readFile(filePath, 'utf8');
    const products = JSON.parse(fileContent);
    
    console.log(`📊 Found ${products.length} products to import`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process products in batches for better performance
    const batchSize = 10;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      for (const productData of batch) {
        try {
          const transformedProduct = transformProduct(productData);
          
          // Check if product already exists (by name or model number)
          const existingProduct = await Product.findOne({
            $or: [
              { name: transformedProduct.name },
              { modelNumber: transformedProduct.modelNumber }
            ]
          });

          if (existingProduct) {
            console.log(`⏭️  Skipping existing product: ${transformedProduct.name}`);
            continue;
          }

          // Create new product (MongoDB will auto-generate ObjectId)
          const newProduct = new Product(transformedProduct);
          const savedProduct = await newProduct.save();
          
          successCount++;
          console.log(`✅ Created product: ${transformedProduct.name} | ID: ${savedProduct._id} (${successCount}/${products.length})`);
          
        } catch (error) {
          errorCount++;
          const errorMsg = `Failed to create product: ${productData.name} - ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
      
      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Summary report
    console.log('\n📈 IMPORT SUMMARY:');
    console.log(`✅ Successfully imported: ${successCount} products`);
    console.log(`❌ Failed to import: ${errorCount} products`);
    console.log(`📊 Total processed: ${products.length} products`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    return { successCount, errorCount, errors };
    
  } catch (error) {
    console.error('❌ Error during import process:', error.message);
    throw error;
  }
};

// Validation function
const validateProducts = async (filePath) => {
  try {
    console.log('🔍 Validating products file...');
    const fileContent = await fs.readFile(filePath, 'utf8');
    const products = JSON.parse(fileContent);
    
    const validationErrors = [];
    
    products.forEach((product, index) => {
      if (!product.name) validationErrors.push(`Product ${index + 1}: Missing name`);
      if (!product.modelNumber) validationErrors.push(`Product ${index + 1}: Missing modelNumber`);
      if (!product.price || isNaN(parseFloat(product.price))) {
        validationErrors.push(`Product ${index + 1}: Invalid price`);
      }
      if (!product.category) validationErrors.push(`Product ${index + 1}: Missing category`);
    });
    
    if (validationErrors.length > 0) {
      console.log('⚠️  VALIDATION ERRORS:');
      validationErrors.forEach(error => console.log(`- ${error}`));
      return false;
    }
    
    console.log('✅ All products passed validation');
    return true;
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
};

// Main execution function
const main = async () => {
  try {
    console.log('🚀 Starting product import process...\n');
    
    // Connect to database
    await connectDB();
    
    // Get file path from command line arguments or use default
    const filePath = process.argv[2] || path.join(__dirname, '../../final_products_img.json');
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error('❌ File not found:', filePath);
      console.log('💡 Usage: node importProducts.js [path-to-json-file]');
      process.exit(1);
    }
    
    // Validate products before import
    const isValid = await validateProducts(filePath);
    if (!isValid) {
      console.log('❌ Validation failed. Please fix the errors and try again.');
      process.exit(1);
    }
    
    // Confirm import
    console.log(`\n📁 File: ${filePath}`);
    console.log('⚠️  This will import products into your database.');
    console.log('⚠️  Existing products with same name/model will be skipped.');
    console.log('🆔 Fresh ObjectIds will be generated by MongoDB for all new products.');
    
    // Start import
    const result = await importProducts(filePath);
    
    console.log('\n🎉 Import process completed successfully!');
    
  } catch (error) {
    console.error('❌ Import process failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚠️  Process interrupted. Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
});

// Export for testing or reuse
module.exports = {
  connectDB,
  transformProduct,
  importProducts,
  validateProducts
};

// Run if called directly
if (require.main === module) {
  main();
} 
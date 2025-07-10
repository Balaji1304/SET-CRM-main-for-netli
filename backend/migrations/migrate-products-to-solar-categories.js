// const mongoose = require('mongoose');
// const Product = require('../models/Product');

// // Migration script to update existing products to new solar categories
// const migrationMap = {
//   // Map old category names to new ones
//   'solar_panel': 'solar_panels',
//   'solar panel': 'solar_panels',
//   'panels': 'solar_panels',
//   'water_heater': 'solar_water_heater',
//   'water heater': 'solar_water_heater',
//   'street_light': 'solar_street_lights',
//   'street light': 'solar_street_lights',
//   'lights': 'solar_street_lights',
//   'dryer': 'solar_dryer',
//   'power_plant': 'solar_power_plant',
//   'power plant': 'solar_power_plant',
//   'pump': 'solar_pump',
//   'pumps': 'solar_pump'
// };

// const SOLAR_CATEGORIES = {
//   'solar_panels': {
//     label: 'Solar Panels',
//     specifications: ['power', 'efficiency', 'warranty', 'dimensions', 'voltage', 'current', 'cells']
//   },
//   'solar_water_heater': {
//     label: 'Solar Water Heater',
//     specifications: ['capacity', 'collector_area', 'tank_material', 'warranty', 'dimensions', 'pressure_rating', 'heating_element']
//   },
//   'solar_street_lights': {
//     label: 'Solar Street Lights',
//     specifications: ['luminous_flux', 'led_power', 'solar_panel_wattage', 'battery_capacity', 'warranty', 'pole_height', 'lighting_hours']
//   },
//   'solar_dryer': {
//     label: 'Solar Dryer',
//     specifications: ['drying_capacity', 'tray_area', 'temperature_range', 'warranty', 'dimensions', 'material', 'ventilation_system']
//   },
//   'solar_power_plant': {
//     label: 'Solar Power Plant',
//     specifications: ['total_capacity', 'panel_count', 'inverter_capacity', 'warranty', 'area_required', 'efficiency', 'grid_connection']
//   },
//   'solar_pump': {
//     label: 'Solar Pump',
//     specifications: ['flow_rate', 'head', 'motor_power', 'solar_panel_wattage', 'warranty', 'pump_type', 'efficiency']
//   }
// };

// const migrateProducts = async () => {
//   try {
//     console.log('🚀 Starting product migration...');
    
//     // Connect to MongoDB if not already connected
//     if (mongoose.connection.readyState !== 1) {
//       await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/set-crm');
//     }
    
//     // Get all existing products
//     const products = await Product.find({}).lean();
//     console.log(`📦 Found ${products.length} products to migrate`);
    
//     let migratedCount = 0;
//     let skippedCount = 0;
//     let errorCount = 0;
    
//     for (const product of products) {
//       try {
//         const oldCategory = product.category;
//         let newCategory = oldCategory;
        
//         // Map old category to new category
//         const mappedCategory = migrationMap[oldCategory?.toLowerCase()];
//         if (mappedCategory) {
//           newCategory = mappedCategory;
//         } else if (!SOLAR_CATEGORIES[oldCategory]) {
//           // If category doesn't exist in new structure, default to solar_panels
//           newCategory = 'solar_panels';
//           console.log(`⚠️  Unknown category "${oldCategory}" for product ${product.name}. Defaulting to solar_panels.`);
//         }
        
//         // Prepare update object
//         const updateObj = {
//           category: newCategory,
//           updatedAt: new Date()
//         };
        
//         // Migrate specifications to new structure
//         if (product.specifications) {
//           const categorySpecs = SOLAR_CATEGORIES[newCategory].specifications;
//           const newSpecs = {};
          
//           // Copy existing specifications that match new structure
//           categorySpecs.forEach(spec => {
//             if (product.specifications[spec]) {
//               newSpecs[spec] = product.specifications[spec];
//             } else {
//               newSpecs[spec] = '';
//             }
//           });
          
//           updateObj.specifications = newSpecs;
//         }
        
//         // Add new fields with defaults
//         updateObj.isActive = true;
//         updateObj.subcategory = '';
//         updateObj.manufacturer = '';
//         updateObj.countryOfOrigin = 'India';
//         updateObj.tags = [
//           newCategory,
//           SOLAR_CATEGORIES[newCategory].label.toLowerCase().replace(/\s+/g, '_'),
//           ...product.name.toLowerCase().split(' ').filter(word => word.length > 2)
//         ];
        
//         // Update SEO metadata
//         updateObj.seoMetadata = {
//           metaTitle: `${product.name} - ${SOLAR_CATEGORIES[newCategory].label}`,
//           metaDescription: product.description ? product.description.substring(0, 160) : '',
//           keywords: updateObj.tags
//         };
        
//         // Add technical details structure
//         updateObj.technicalDetails = {
//           installation_requirements: '',
//           maintenance_schedule: '',
//           certifications: [],
//           environmental_conditions: {
//             operating_temperature: '',
//             humidity_range: '',
//             wind_resistance: ''
//           }
//         };
        
//         // Update the product
//         await Product.findByIdAndUpdate(product._id, updateObj);
        
//         migratedCount++;
//         console.log(`✅ Migrated: ${product.name} (${oldCategory} → ${newCategory})`);
        
//       } catch (error) {
//         errorCount++;
//         console.error(`❌ Error migrating product ${product.name}:`, error.message);
//       }
//     }
    
//     console.log('\n📊 Migration Summary:');
//     console.log(`✅ Successfully migrated: ${migratedCount} products`);
//     console.log(`⚠️  Skipped: ${skippedCount} products`);
//     console.log(`❌ Errors: ${errorCount} products`);
//     console.log('🎉 Migration completed!');
    
//   } catch (error) {
//     console.error('💥 Migration failed:', error);
//   } finally {
//     if (mongoose.connection.readyState === 1) {
//       await mongoose.connection.close();
//     }
//   }
// };

// // Function to create sample products for each category
// const createSampleProducts = async () => {
//   try {
//     console.log('🚀 Creating sample products...');
    
//     if (mongoose.connection.readyState !== 1) {
//       await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/set-crm');
//     }
    
//     const sampleProducts = [
//       {
//         name: 'Monocrystalline Solar Panel 320W',
//         modelNumber: 'SP-MONO-320',
//         description: 'High-efficiency monocrystalline solar panel with 320W power output, perfect for residential and commercial installations.',
//         price: 15000,
//         quantity: 50,
//         reorderLevel: 10,
//         category: 'solar_panels',
//         specifications: {
//           power: '320W',
//           efficiency: '19.5%',
//           warranty: '25 years',
//           dimensions: '1956 x 992 x 35 mm',
//           voltage: '37.2V',
//           current: '8.61A',
//           cells: '72 cells'
//         }
//       },
//       {
//         name: 'Solar Water Heater 200L',
//         modelNumber: 'SWH-200L',
//         description: 'Premium quality solar water heater with 200L capacity, suitable for family of 4-6 members.',
//         price: 35000,
//         quantity: 25,
//         reorderLevel: 5,
//         category: 'solar_water_heater',
//         specifications: {
//           capacity: '200 Liters',
//           collector_area: '3.0 sq.m',
//           tank_material: 'Stainless Steel 316L',
//           warranty: '5 years',
//           dimensions: '2000 x 1500 x 200 mm',
//           pressure_rating: '6 bar',
//           heating_element: '2000W backup'
//         }
//       },
//       {
//         name: 'LED Solar Street Light 60W',
//         modelNumber: 'SSL-LED-60W',
//         description: 'High-brightness LED solar street light with integrated solar panel and lithium battery.',
//         price: 8500,
//         quantity: 100,
//         reorderLevel: 20,
//         category: 'solar_street_lights',
//         specifications: {
//           luminous_flux: '8000 lumens',
//           led_power: '60W',
//           solar_panel_wattage: '80W',
//           battery_capacity: '20Ah LiFePO4',
//           warranty: '3 years',
//           pole_height: '6-8 meters',
//           lighting_hours: '12 hours'
//         }
//       },
//       {
//         name: 'Solar Food Dryer 50kg',
//         modelNumber: 'SFD-50KG',
//         description: 'Commercial solar food dryer with 50kg capacity, ideal for fruits, vegetables, and spices.',
//         price: 125000,
//         quantity: 5,
//         reorderLevel: 2,
//         category: 'solar_dryer',
//         specifications: {
//           drying_capacity: '50 kg',
//           tray_area: '20 sq.m',
//           temperature_range: '40-70°C',
//           warranty: '2 years',
//           dimensions: '4000 x 2000 x 2500 mm',
//           material: 'Galvanized steel',
//           ventilation_system: 'Natural convection'
//         }
//       },
//       {
//         name: 'Solar Power Plant 100kW',
//         modelNumber: 'SPP-100KW',
//         description: 'Complete solar power plant solution with 100kW capacity for commercial and industrial use.',
//         price: 4500000,
//         quantity: 2,
//         reorderLevel: 1,
//         category: 'solar_power_plant',
//         specifications: {
//           total_capacity: '100 kW',
//           panel_count: '312 panels',
//           inverter_capacity: '100 kW',
//           warranty: '25 years',
//           area_required: '5000 sq.m',
//           efficiency: '18%',
//           grid_connection: 'Three-phase'
//         }
//       },
//       {
//         name: 'Solar Water Pump 5HP',
//         modelNumber: 'SWP-5HP',
//         description: 'High-efficiency solar water pump with 5HP motor, suitable for agricultural irrigation.',
//         price: 185000,
//         quantity: 8,
//         reorderLevel: 3,
//         category: 'solar_pump',
//         specifications: {
//           flow_rate: '150 LPM',
//           head: '80 meters',
//           motor_power: '5 HP',
//           solar_panel_wattage: '4000W',
//           warranty: '3 years',
//           pump_type: 'Submersible',
//           efficiency: '85%'
//         }
//       }
//     ];
    
//     for (const productData of sampleProducts) {
//       const existingProduct = await Product.findOne({ modelNumber: productData.modelNumber });
//       if (!existingProduct) {
//         await Product.create(productData);
//         console.log(`✅ Created sample product: ${productData.name}`);
//       } else {
//         console.log(`⚠️  Sample product already exists: ${productData.name}`);
//       }
//     }
    
//     console.log('🎉 Sample products creation completed!');
    
//   } catch (error) {
//     console.error('💥 Sample products creation failed:', error);
//   } finally {
//     if (mongoose.connection.readyState === 1) {
//       await mongoose.connection.close();
//     }
//   }
// };

// // Export functions for use
// module.exports = {
//   migrateProducts,
//   createSampleProducts,
//   SOLAR_CATEGORIES
// };

// // Run migration if called directly
// if (require.main === module) {
//   const command = process.argv[2];
//   if (command === 'migrate') {
//     migrateProducts();
//   } else if (command === 'samples') {
//     createSampleProducts();
//   } else {
//     console.log('Usage:');
//     console.log('  node migrate-products-to-solar-categories.js migrate  - Migrate existing products');
//     console.log('  node migrate-products-to-solar-categories.js samples  - Create sample products');
//   }
// } 
# Solar Categories Migration Guide

## Overview
This guide documents the major database structure changes made to support enhanced solar product categories in your CRM system.

## New Categories Added

### 1. Solar Panels (`solar_panels`)
- **Specifications**: power, efficiency, warranty, dimensions, voltage, current, cells
- **Use Case**: Traditional solar panel products

### 2. Solar Water Heater (`solar_water_heater`)
- **Specifications**: capacity, collector_area, tank_material, warranty, dimensions, pressure_rating, heating_element
- **Use Case**: Solar water heating systems

### 3. Solar Street Lights (`solar_street_lights`)
- **Specifications**: luminous_flux, led_power, solar_panel_wattage, battery_capacity, warranty, pole_height, lighting_hours
- **Use Case**: Solar-powered street lighting solutions

### 4. Solar Dryer (`solar_dryer`)
- **Specifications**: drying_capacity, tray_area, temperature_range, warranty, dimensions, material, ventilation_system
- **Use Case**: Solar food/agricultural drying systems

### 5. Solar Power Plant (`solar_power_plant`)
- **Specifications**: total_capacity, panel_count, inverter_capacity, warranty, area_required, efficiency, grid_connection
- **Use Case**: Large-scale solar installations

### 6. Solar Pump (`solar_pump`)
- **Specifications**: flow_rate, head, motor_power, solar_panel_wattage, warranty, pump_type, efficiency
- **Use Case**: Solar-powered water pumps

## Enhanced Database Schema

### New Fields Added to Product Model:
- `subcategory`: String - Additional categorization
- `manufacturer`: String - Product manufacturer
- `countryOfOrigin`: String - Country of origin (default: India)
- `isActive`: Boolean - Product active status
- `tags`: Array - SEO and search tags
- `technicalDetails`: Object - Detailed technical information
- `seoMetadata`: Object - SEO optimization fields
- `createdBy`: ObjectId - User who created the product
- `lastModifiedBy`: ObjectId - User who last modified

### Enhanced Fields:
- `category`: Now has strict validation with enum values
- `specifications`: Dynamic based on category selection
- `modelNumber`: Auto-converted to uppercase
- Improved validation and error messages

## Backend Changes

### 1. Product Model (`backend/models/Product.js`)
- **Enhanced with 6 solar categories**
- **Dynamic specifications** based on category
- **Virtual fields** for category labels and stock status
- **Instance methods** for stock management
- **Static methods** for category operations
- **Improved indexing** for performance

### 2. Product Controller (`backend/controllers/products.js`)
- **New endpoints**:
  - `GET /api/products/categories` - Get all categories
  - `GET /api/products/categories/:category/specifications` - Get category specs
- **Enhanced filtering and search**
- **Pagination support**
- **Better error handling**
- **Image optimization** with transformations

### 3. Product Routes (`backend/routes/products.js`)
- **Updated with new endpoints**
- **Improved file upload handling**
- **Better security with authentication**

## Frontend Changes

### 1. Add Product Page (`frontend/src/app/products/add/page.js`)
- **Dynamic category selection** from API
- **Category-specific specifications** auto-loaded
- **Technical details section** added
- **Improved form structure** and validation
- **Better user experience** with organized sections

### 2. Enhanced Form Features:
- **Real-time category specification loading**
- **Structured technical details input**
- **SEO metadata support**
- **Manufacturer and origin fields**
- **Tags and categorization**

## Migration Process

### 1. Database Migration
```bash
# Run the migration script
cd backend
node migrations/migrate-products-to-solar-categories.js migrate
```

### 2. Create Sample Products
```bash
# Create sample products for each category
node migrations/migrate-products-to-solar-categories.js samples
```

### 3. Update Existing Frontend
The frontend changes are backward compatible but provide enhanced features when using the new API endpoints.

## Key Benefits

### 1. **Category-Specific Specifications**
- Each category has relevant specification fields
- Dynamic form generation based on category
- Better data organization and validation

### 2. **Enhanced Search and Filtering**
- Tag-based search functionality
- Category-based filtering
- Full-text search across multiple fields

### 3. **Better SEO and Organization**
- Auto-generated SEO metadata
- Structured technical documentation
- Improved product categorization

### 4. **Advanced Stock Management**
- Virtual stock status fields
- Enhanced reorder level tracking
- Better inventory reporting

### 5. **Future-Proof Structure**
- Easy to add new categories
- Flexible specification system
- Scalable for growth

## Usage Examples

### 1. Creating a Solar Panel Product
```javascript
const solarPanel = {
  name: "Monocrystalline Solar Panel 400W",
  modelNumber: "SP-MONO-400",
  category: "solar_panels",
  specifications: {
    power: "400W",
    efficiency: "20.5%",
    warranty: "25 years",
    voltage: "41.2V",
    current: "9.71A",
    cells: "72 cells"
  },
  // ... other fields
};
```

### 2. Fetching Category Specifications
```javascript
// Get all categories
const categories = await fetch('/api/products/categories');

// Get specifications for solar panels
const specs = await fetch('/api/products/categories/solar_panels/specifications');
```

### 3. Advanced Product Search
```javascript
// Search with filters
const products = await fetch('/api/products?category=solar_panels&search=monocrystalline&sortBy=price&sortOrder=asc');
```

## API Reference

### New Endpoints

#### Get Categories
```
GET /api/products/categories
Response: { success: true, data: { category_key: { label, specifications } } }
```

#### Get Category Specifications
```
GET /api/products/categories/:category/specifications
Response: { success: true, data: [specification_names] }
```

#### Enhanced Product Listing
```
GET /api/products?category=solar_panels&search=term&sortBy=name&sortOrder=asc&page=1&limit=20
```

## Troubleshooting

### Common Issues

1. **Migration Errors**
   - Ensure MongoDB connection is working
   - Check existing product data format
   - Run migration in development first

2. **Category Validation Errors**
   - Use only the defined category keys
   - Check case sensitivity
   - Verify category exists in SOLAR_CATEGORIES

3. **Specification Loading Issues**
   - Ensure category is selected first
   - Check network connectivity
   - Verify API endpoints are accessible

## Future Enhancements

### Planned Features
1. **Custom Categories**: Admin ability to add new categories
2. **Specification Templates**: Reusable specification sets
3. **Category Images**: Visual representation of categories
4. **Advanced Analytics**: Category-based reporting
5. **Import/Export**: Bulk operations for products

### Extension Points
- Add new categories in `SOLAR_CATEGORIES` object
- Extend specifications by modifying category definitions
- Add new technical detail fields as needed
- Implement custom validation rules per category

## Conclusion

This migration provides a robust foundation for managing diverse solar products with category-specific specifications, enhanced search capabilities, and better organization. The system is designed to be scalable and maintainable for future growth.

For any issues or questions, refer to the migration logs and ensure all steps are followed in order. 
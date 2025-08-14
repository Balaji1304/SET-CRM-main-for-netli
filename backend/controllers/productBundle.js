const ProductBundle = require('../models/ProductBundle');
const Product = require('../models/Product');
const SolarBundleItem = require('../models/SolarBundleItem');
const { errorHandler, AppError } = require('../utils/errorHandler');
const { getBundleTerms, getAllBundleTerms } = require('../utils/termsAndConditions');
const cloudinary = require('../config/cloudinary');
const { optimizeImage } = require('../utils/imageOptimizer');
const { promisify } = require('util');

// Promisify cloudinary API methods
const deleteFolder = promisify(cloudinary.api.delete_folder.bind(cloudinary.api));
const deleteResources = promisify(cloudinary.api.delete_resources_by_prefix.bind(cloudinary.api));

// @desc    Get all product bundles
// @route   GET /api/bundles
// @access  Private
exports.getBundles = async (req, res) => {
  try {
    const { category, subcategory, brand, isActive } = req.query;
    
    let query = {};
    
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const bundles = await ProductBundle.find(query)
      .populate({
        path: 'items.solarItem',
        select: 'name warranty'
      })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // Filter by brand if specified
    let filteredBundles = bundles;
    if (brand) {
      filteredBundles = bundles.filter(bundle => 
        bundle.supportedBrands.includes(brand)
      );
    }

    res.json({
      success: true,
      count: filteredBundles.length,
      data: filteredBundles
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get single product bundle
// @route   GET /api/bundles/:id
// @access  Private
exports.getBundle = async (req, res) => {
  try {
    const bundle = await ProductBundle.findById(req.params.id)
      .populate({
        path: 'items.solarItem',
        select: 'name warranty'
      })
      .populate('createdBy', 'name');

    if (!bundle) {
      throw new AppError('Bundle not found', 404);
    }

    res.json({
      success: true,
      data: bundle
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Create new product bundle
// @route   POST /api/bundles
// @access  Private (product_head, admin)
exports.createBundle = async (req, res) => {
  try {
    const {
      name,
      bundleCode,
      category,
      subcategory,
      description,
      items,
      price,
      systemConfiguration,
      specifications,
      supportedBrands,
      images,
      tags,
      termsAndConditions
    } = req.body;

    // Check if bundle code already exists
    const existingBundle = await ProductBundle.findOne({ bundleCode: bundleCode.toUpperCase() });
    if (existingBundle) {
      throw new AppError('Bundle code already exists. Please use a unique bundle code.', 400);
    }

    // Auto-fill terms and conditions if not provided
    const finalTermsAndConditions = termsAndConditions || getBundleTerms();

    // Create bundle first to get the ID for folder structure
    const bundle = await ProductBundle.create({
      name,
      bundleCode: bundleCode.toUpperCase(),
      category: category || 'power_plants_system',
      subcategory,
      description,
      items: [],
      price: price || 0,
      systemConfiguration: systemConfiguration || {},
      specifications,
      supportedBrands: supportedBrands || [],
      imageUrls: [],
      tags: tags || [],
      termsAndConditions: finalTermsAndConditions,
      createdBy: req.user.id
    });

    // Process and upload images if provided
    let uploadedImages = [];
    if (images && images.length > 0) {
      // Create folder path based on category and bundle ID
      const folderPath = `bundles/${bundle.category.toLowerCase().replace(/\s+/g, '_')}/${bundle._id}/images`;
      
      // Upload and optimize images
      uploadedImages = await Promise.all(
        images.map(async (imageData) => {
          // Remove data:image/[type];base64, prefix
          const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Optimize image
          const optimizedBuffer = await optimizeImage(buffer);
          
          // Upload to Cloudinary
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: folderPath,
                use_filename: true,
                unique_filename: true,
                resource_type: 'image',
                type: 'upload',
                overwrite: true,
                create_folder: true
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            
            uploadStream.end(optimizedBuffer);
          });
          
          return result.secure_url;
        })
      );

      // Update bundle with image URLs
      bundle.imageUrls = uploadedImages;
    }

    // Validate that all solar items exist (only if items are provided)
    let processedItems = [];
    if (items && items.length > 0) {
      const solarItemIds = items.map(item => item.solarItem).filter(Boolean);
      const solarItems = await SolarBundleItem.find({ _id: { $in: solarItemIds } });
      
      if (solarItems.length !== solarItemIds.length) {
        throw new AppError('One or more solar items not found', 400);
      }

      processedItems = items;
    }

    // Update bundle with processed items
    bundle.items = processedItems;
    await bundle.save();

    const populatedBundle = await ProductBundle.findById(bundle._id)
      .populate({
        path: 'items.solarItem',
        select: 'name warranty'
      });

    res.status(201).json({
      success: true,
      data: populatedBundle
    });
  } catch (error) {
    console.error('Bundle creation error:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation details:', error.errors);
    }
    errorHandler(res, error);
  }
};

// @desc    Update product bundle
// @route   PUT /api/bundles/:id
// @access  Private (product_head, admin)
exports.updateBundle = async (req, res) => {
  try {
    const bundle = await ProductBundle.findById(req.params.id);

    if (!bundle) {
      throw new AppError('Bundle not found', 404);
    }

    // Check if user owns this bundle or is admin
    if (bundle.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to update this bundle', 403);
    }

    const {
      name,
      bundleCode,
      subcategory,
      description,
      items,
      price,
      systemConfiguration,
      specifications,
      supportedBrands,
      images,
      tags,
      isActive,
      termsAndConditions
    } = req.body;

    // Handle image updates if there are images
    let uploadedImages = bundle.imageUrls; // Keep existing images by default
    if (images && images.length > 0) {
      // Create folder path
      const folderPath = `bundles/${bundle.category.toLowerCase().replace(/\s+/g, '_')}/${bundle._id}/images`;
      
      // Process each image - could be existing URLs or new base64 images
      const processedImages = await Promise.all(
        images.map(async (imageData) => {
          // If it's already a URL (existing image), keep it
          if (typeof imageData === 'string' && imageData.startsWith('http')) {
            return imageData;
          }
          
          // If it's a base64 image, upload it
          if (typeof imageData === 'string' && imageData.startsWith('data:image')) {
            // Remove data:image/[type];base64, prefix
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Optimize image
            const optimizedBuffer = await optimizeImage(buffer);
            
            // Upload to Cloudinary
            const result = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: folderPath,
                  use_filename: true,
                  unique_filename: true,
                  resource_type: 'image',
                  type: 'upload',
                  overwrite: true,
                  create_folder: true
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
              
              uploadStream.end(optimizedBuffer);
            });
            
            return result.secure_url;
          }
          
          return imageData; // Return as-is for other cases
        })
      );

      // If we're removing images, delete them from Cloudinary
      const removedImages = bundle.imageUrls.filter(url => !processedImages.includes(url));
      if (removedImages.length > 0) {
        for (const imageUrl of removedImages) {
          try {
            const publicId = imageUrl.split('/').slice(-3).join('/').split('.')[0];
            await cloudinary.uploader.destroy(publicId);
          } catch (deleteError) {
            console.warn('Failed to delete image from Cloudinary:', deleteError);
          }
        }
      }

      uploadedImages = processedImages;
    }

    // Validate solar items if items are being updated
    let processedItems = items;
    if (items) {
      const solarItemIds = items.map(item => item.solarItem).filter(Boolean);
      const solarItems = await SolarBundleItem.find({ _id: { $in: solarItemIds } });
      
      if (solarItems.length !== solarItemIds.length) {
        throw new AppError('One or more solar items not found', 400);
      }

      processedItems = items;
    }

    const updatedBundle = await ProductBundle.findByIdAndUpdate(
      req.params.id,
      {
        name,
        bundleCode,
        subcategory,
        description,
        items: processedItems,
        price,
        systemConfiguration,
        specifications,
        supportedBrands,
        imageUrls: uploadedImages,
        tags,
        isActive,
        termsAndConditions
      },
      { new: true, runValidators: true }
    ).populate({
      path: 'items.solarItem',
      select: 'name warranty'
    });

    res.json({
      success: true,
      data: updatedBundle
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Delete product bundle
// @route   DELETE /api/bundles/:id
// @access  Private (product_head, admin)
exports.deleteBundle = async (req, res) => {
  try {
    const bundle = await ProductBundle.findById(req.params.id);

    if (!bundle) {
      throw new AppError('Bundle not found', 404);
    }

    // Check if user owns this bundle or is admin
    if (bundle.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('Not authorized to delete this bundle', 403);
    }

    // Delete associated images from Cloudinary if they exist
    if (bundle.imageUrls && bundle.imageUrls.length > 0) {
      try {
        // Delete entire bundle folder from Cloudinary
        const folderPath = `bundles/${bundle.category.toLowerCase().replace(/\s+/g, '_')}/${bundle._id}`;
        
        // Delete all resources in the folder first
        await deleteResources(folderPath);
        
        // Then delete the folder
        await deleteFolder(folderPath);
      } catch (cloudinaryError) {
        console.warn('Failed to delete bundle images from Cloudinary:', cloudinaryError);
        // Continue with bundle deletion even if image deletion fails
      }
    }

    await ProductBundle.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Bundle and associated images deleted successfully'
    });
  } catch (error) {
    console.error('Delete bundle error:', error);
    errorHandler(res, error);
  }
};

// @desc    Get power plant configurations (standard KVA options)
// @route   GET /api/bundles/power-plants/configurations
// @access  Private
exports.getPowerPlantConfigurations = async (req, res) => {
  try {
    const { brand } = req.query;
    
    let query = {
      category: 'power_plants_system',
      isActive: true,
      subcategory: { $in: ['2kva', '4kva', '5kva', '10kva'] }
    };

    if (brand) {
      query.supportedBrands = brand;
    }

    const configurations = await ProductBundle.find(query)
      .populate({
        path: 'items.solarItem',
        select: 'name warranty'
      })
      .sort({ subcategory: 1 });

    // Group by subcategory
    const groupedConfigurations = configurations.reduce((acc, config) => {
      if (!acc[config.subcategory]) {
        acc[config.subcategory] = [];
      }
      acc[config.subcategory].push(config);
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedConfigurations
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get all solar bundle items for bundle creation
// @route   GET /api/bundles/compatible-products
// @access  Private
exports.getCompatibleProducts = async (req, res) => {
  try {
    // Ensure default solar bundle items exist before fetching
    await SolarBundleItem.ensureDefaultItems();
    
    const solarItems = await SolarBundleItem.getAllActiveItems();

    res.json({
      success: true,
      data: solarItems
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get default terms and conditions for bundles
// @route   GET /api/bundles/default-terms
// @access  Private
exports.getDefaultBundleTerms = async (req, res) => {
  try {
    const terms = getBundleTerms();
    
    res.json({
      success: true,
      data: {
        termsAndConditions: terms
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get all available bundle terms and conditions
// @route   GET /api/bundles/all-terms
// @access  Private
exports.getAllBundleTerms = async (req, res) => {
  try {
    const allTerms = getAllBundleTerms();
    
    res.json({
      success: true,
      data: allTerms
    });
  } catch (error) {
    errorHandler(res, error);
  }
}; 
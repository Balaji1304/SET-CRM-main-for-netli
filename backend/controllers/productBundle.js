const ProductBundle = require('../models/ProductBundle');
const Product = require('../models/Product');
const SolarBundleItem = require('../models/SolarBundleItem');
const { errorHandler, AppError } = require('../utils/errorHandler');
const { getBundleTerms, getAllBundleTerms } = require('../utils/termsAndConditions');

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
      specifications,
      supportedBrands,
      imageUrls,
      tags,
      termsAndConditions
    } = req.body;

    // Check if bundle code already exists
    const existingBundle = await ProductBundle.findOne({ bundleCode: bundleCode.toUpperCase() });
    if (existingBundle) {
      throw new AppError('Bundle code already exists. Please use a unique bundle code.', 400);
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

    const bundle = await ProductBundle.create({
      name,
      bundleCode,
      category: category || 'power_plants_system',
      subcategory,
      description,
      items: processedItems || [],
      price: price || 0,
      specifications,
      supportedBrands: supportedBrands || [],
      imageUrls: imageUrls || [],
      tags: tags || [],
      termsAndConditions: termsAndConditions || getBundleTerms(),
      createdBy: req.user.id
    });

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
      specifications,
      supportedBrands,
      imageUrls,
      tags,
      isActive,
      termsAndConditions
    } = req.body;

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
        specifications,
        supportedBrands,
        imageUrls,
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

    await ProductBundle.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Bundle deleted successfully'
    });
  } catch (error) {
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
    const solarItems = await SolarBundleItem.getAllActiveItems()
      .select('name warranty');

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
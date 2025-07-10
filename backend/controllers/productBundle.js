const ProductBundle = require('../models/ProductBundle');
const Product = require('../models/Product');
const { errorHandler, AppError } = require('../utils/errorHandler');

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
        path: 'items.product',
        select: 'name modelNumber price brand category specifications'
      })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // Filter by brand if specified
    let filteredBundles = bundles;
    if (brand) {
      filteredBundles = bundles.filter(bundle => 
        bundle.supportedBrands.includes(brand) ||
        bundle.items.some(item => item.product.brand === brand)
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
        path: 'items.product',
        select: 'name modelNumber price brand category specifications imageUrls'
      })
      .populate({
        path: 'items.alternativeProducts.product',
        select: 'name modelNumber price brand category specifications'
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
      basePrice,
      discountPercentage,
      specifications,
      supportedBrands,
      imageUrls,
      tags
    } = req.body;

    // Validate that all products exist
    const productIds = items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    
    if (products.length !== productIds.length) {
      throw new AppError('One or more products not found', 400);
    }

    // Calculate base price if not provided
    let calculatedBasePrice = basePrice;
    if (!basePrice) {
      calculatedBasePrice = 0;
      for (const item of items) {
        const product = products.find(p => p._id.toString() === item.product.toString());
        if (product) {
          calculatedBasePrice += product.price * item.quantity;
        }
      }
    }

    const bundle = await ProductBundle.create({
      name,
      bundleCode,
      category: category || 'power_plants_system',
      subcategory,
      description,
      items,
      basePrice: calculatedBasePrice,
      discountPercentage: discountPercentage || 0,
      specifications,
      supportedBrands,
      imageUrls,
      tags,
      createdBy: req.user.id
    });

    const populatedBundle = await ProductBundle.findById(bundle._id)
      .populate({
        path: 'items.product',
        select: 'name modelNumber price brand category specifications'
      });

    res.status(201).json({
      success: true,
      data: populatedBundle
    });
  } catch (error) {
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
      basePrice,
      discountPercentage,
      specifications,
      supportedBrands,
      imageUrls,
      tags,
      isActive
    } = req.body;

    // Validate products if items are being updated
    if (items) {
      const productIds = items.map(item => item.product);
      const products = await Product.find({ _id: { $in: productIds } });
      
      if (products.length !== productIds.length) {
        throw new AppError('One or more products not found', 400);
      }
    }

    const updatedBundle = await ProductBundle.findByIdAndUpdate(
      req.params.id,
      {
        name,
        bundleCode,
        subcategory,
        description,
        items,
        basePrice,
        discountPercentage,
        specifications,
        supportedBrands,
        imageUrls,
        tags,
        isActive
      },
      { new: true, runValidators: true }
    ).populate({
      path: 'items.product',
      select: 'name modelNumber price brand category specifications'
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
        path: 'items.product',
        select: 'name modelNumber price brand category specifications'
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

// @desc    Get compatible products for bundle creation
// @route   GET /api/bundles/compatible-products
// @access  Private
exports.getCompatibleProducts = async (req, res) => {
  try {
    const { category, brand } = req.query;
    
    let query = { isBundleCompatible: true };
    
    if (category) query.category = category;
    if (brand) query.brand = brand;

    const products = await Product.find(query)
      .select('name modelNumber price brand category specifications')
      .sort({ category: 1, brand: 1, name: 1 });

    // Group by category for easier selection
    const groupedProducts = products.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = [];
      }
      acc[product.category].push(product);
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedProducts
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Calculate bundle pricing with different brands
// @route   POST /api/bundles/calculate-pricing
// @access  Private
exports.calculateBundlePricing = async (req, res) => {
  try {
    const { items, discountPercentage = 0, brandFilter } = req.body;

    if (!items || !Array.isArray(items)) {
      throw new AppError('Items array is required', 400);
    }

    let totalPrice = 0;
    const calculatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new AppError(`Product with ID ${item.product} not found`, 400);
      }

      // Filter by brand if specified
      if (brandFilter && product.brand !== brandFilter) {
        continue;
      }

      const itemTotal = product.price * item.quantity;
      totalPrice += itemTotal;

      calculatedItems.push({
        product: {
          _id: product._id,
          name: product.name,
          modelNumber: product.modelNumber,
          brand: product.brand,
          price: product.price
        },
        quantity: item.quantity,
        itemTotal
      });
    }

    const discountAmount = totalPrice * (discountPercentage / 100);
    const finalPrice = totalPrice - discountAmount;

    res.json({
      success: true,
      data: {
        items: calculatedItems,
        basePrice: totalPrice,
        discountPercentage,
        discountAmount,
        finalPrice,
        savings: discountAmount
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
}; 
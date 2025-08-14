const SolarBundleItem = require('../models/SolarBundleItem');
const { errorHandler, AppError } = require('../utils/errorHandler');

// @desc    Get all solar bundle items
// @route   GET /api/solar-bundle-items
// @access  Private
exports.getSolarBundleItems = async (req, res) => {
  try {
    // Ensure default items exist before fetching
    await SolarBundleItem.ensureDefaultItems();
    
    const items = await SolarBundleItem.getAllActiveItems();

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get single solar bundle item
// @route   GET /api/solar-bundle-items/:id
// @access  Private
exports.getSolarBundleItem = async (req, res) => {
  try {
    const item = await SolarBundleItem.findById(req.params.id);

    if (!item) {
      throw new AppError('Solar bundle item not found', 404);
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Create new solar bundle item
// @route   POST /api/solar-bundle-items
// @access  Private (product_head, admin)
exports.createSolarBundleItem = async (req, res) => {
  try {
    const { name, componentType, warranty } = req.body;

    // Check if name already exists
    const existingName = await SolarBundleItem.findOne({ name: name.trim() });
    if (existingName) {
      throw new AppError('Item name already exists. Please use a unique item name.', 400);
    }

    const item = await SolarBundleItem.create({
      name,
      componentType,
      warranty
    });

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Solar bundle item creation error:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation details:', error.errors);
    }
    errorHandler(res, error);
  }
};

// @desc    Update solar bundle item
// @route   PUT /api/solar-bundle-items/:id
// @access  Private (product_head, admin)
exports.updateSolarBundleItem = async (req, res) => {
  try {
    const item = await SolarBundleItem.findById(req.params.id);

    if (!item) {
      throw new AppError('Solar bundle item not found', 404);
    }

    const { name, componentType, warranty } = req.body;

    // Check if name is being changed and if it conflicts
    if (name && name.trim() !== item.name) {
      const existingName = await SolarBundleItem.findOne({ 
        name: name.trim(),
        _id: { $ne: req.params.id }
      });
      if (existingName) {
        throw new AppError('Item name already exists. Please use a unique item name.', 400);
      }
    }

    const updatedItem = await SolarBundleItem.findByIdAndUpdate(
      req.params.id,
      { name, componentType, warranty },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Delete solar bundle item
// @route   DELETE /api/solar-bundle-items/:id
// @access  Private (product_head, admin)
exports.deleteSolarBundleItem = async (req, res) => {
  try {
    const item = await SolarBundleItem.findById(req.params.id);

    if (!item) {
      throw new AppError('Solar bundle item not found', 404);
    }

    await SolarBundleItem.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Solar bundle item deleted successfully'
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Initialize default solar bundle items
// @route   POST /api/solar-bundle-items/init-defaults
// @access  Private (admin only)
exports.initializeDefaultItems = async (req, res) => {
  try {
    await SolarBundleItem.ensureDefaultItems();
    
    const items = await SolarBundleItem.getAllActiveItems();
    
    res.json({
      success: true,
      message: 'Default solar bundle items initialized successfully',
      count: items.length,
      data: items
    });
  } catch (error) {
    errorHandler(res, error);
  }
}; 
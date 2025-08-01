const CustomizedProduct = require('../models/CustomizedProduct');
const Lead = require('../models/Lead');
const { errorHandler, AppError } = require('../utils/errorHandler');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

// @desc    Create customized product during lead creation
// @route   POST /api/customized-products
// @access  Private
exports.createCustomizedProduct = async (req, res) => {
  try {
    const { name, unitPrice, leadId } = req.body;

    // Validate required fields
    if (!name || !unitPrice || !leadId) {
      throw new AppError('Name, unit price, and lead ID are required', 400);
    }

    // Check if lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    // Create customized product
    const customizedProduct = await CustomizedProduct.create({
      name,
      unitPrice: parseFloat(unitPrice),
      leadId,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: customizedProduct
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get all customized products for the authenticated user
// @route   GET /api/customized-products
// @access  Private
exports.getAllCustomizedProducts = async (req, res) => {
  try {
    const customizedProducts = await CustomizedProduct.find({ createdBy: req.user.id })
      .populate({
        path: 'leadId',
        select: 'firstName lastName businessName'
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: customizedProducts
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get customized products by lead ID
// @route   GET /api/customized-products/lead/:leadId
// @access  Private
exports.getCustomizedProductsByLead = async (req, res) => {
  try {
    const { leadId } = req.params;

    const customizedProducts = await CustomizedProduct.find({ leadId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: customizedProducts
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get single customized product
// @route   GET /api/customized-products/:id
// @access  Private
exports.getCustomizedProduct = async (req, res) => {
  try {
    const customizedProduct = await CustomizedProduct.findById(req.params.id)
      .populate('leadId')
      .populate('createdBy', 'name');

    if (!customizedProduct) {
      throw new AppError('Customized product not found', 404);
    }

    res.json({
      success: true,
      data: customizedProduct
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Update customized product (for quotation details)
// @route   PUT /api/customized-products/:id
// @access  Private
exports.updateCustomizedProduct = async (req, res) => {
  try {
    const { 
      modelNumber, 
      description, 
      specifications, 
      termsAndConditions 
    } = req.body;

    const customizedProduct = await CustomizedProduct.findById(req.params.id);
    
    if (!customizedProduct) {
      throw new AppError('Customized product not found', 404);
    }

    // Update fields
    if (modelNumber !== undefined) customizedProduct.modelNumber = modelNumber;
    if (description !== undefined) customizedProduct.description = description;
    if (specifications !== undefined) customizedProduct.specifications = specifications;
    if (termsAndConditions !== undefined) customizedProduct.termsAndConditions = termsAndConditions;
    
    // Mark as completed when quotation details are added
    if (modelNumber || description || specifications) {
      customizedProduct.isCompleted = true;
    }

    await customizedProduct.save();

    res.json({
      success: true,
      data: customizedProduct
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Upload images for customized product
// @route   POST /api/customized-products/:id/images
// @access  Private
exports.uploadCustomizedProductImages = async (req, res) => {
  try {
    const customizedProduct = await CustomizedProduct.findById(req.params.id);
    
    if (!customizedProduct) {
      throw new AppError('Customized product not found', 404);
    }

    if (!req.files || req.files.length === 0) {
      throw new AppError('No images uploaded', 400);
    }

    const imageUrls = [];

    // Upload each image to Cloudinary
    for (const file of req.files) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'customized-products',
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        });

        imageUrls.push(result.secure_url);

        // Delete the temporary file
        fs.unlinkSync(file.path);
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        // Delete the temporary file even if upload fails
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    if (imageUrls.length === 0) {
      throw new AppError('Failed to upload any images', 500);
    }

    // Add new image URLs to existing ones
    customizedProduct.imageUrls = [...(customizedProduct.imageUrls || []), ...imageUrls];
    await customizedProduct.save();

    res.json({
      success: true,
      data: customizedProduct,
      message: `${imageUrls.length} image(s) uploaded successfully`
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Delete customized product
// @route   DELETE /api/customized-products/:id
// @access  Private
exports.deleteCustomizedProduct = async (req, res) => {
  try {
    const customizedProduct = await CustomizedProduct.findById(req.params.id);
    
    if (!customizedProduct) {
      throw new AppError('Customized product not found', 404);
    }

    // Check if user has permission to delete
    if (req.user.role !== 'admin' && req.user.role !== 'product_head' && 
        customizedProduct.createdBy.toString() !== req.user.id) {
      throw new AppError('Not authorized to delete this customized product', 403);
    }

    await customizedProduct.deleteOne();

    res.json({
      success: true,
      message: 'Customized product deleted successfully'
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

module.exports = {
  createCustomizedProduct: exports.createCustomizedProduct,
  getAllCustomizedProducts: exports.getAllCustomizedProducts,
  getCustomizedProductsByLead: exports.getCustomizedProductsByLead,
  getCustomizedProduct: exports.getCustomizedProduct,
  updateCustomizedProduct: exports.updateCustomizedProduct,
  uploadCustomizedProductImages: exports.uploadCustomizedProductImages,
  deleteCustomizedProduct: exports.deleteCustomizedProduct
};

const Product = require('../models/Product');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const { optimizeImage } = require('../utils/imageOptimizer');
const { promisify } = require('util');
const { getProductTerms, getAllProductTerms } = require('../utils/termsAndConditions');

// Promisify cloudinary API methods
const deleteFolder = promisify(cloudinary.api.delete_folder.bind(cloudinary.api));
const deleteResources = promisify(cloudinary.api.delete_resources_by_prefix.bind(cloudinary.api));
const searchFolders = promisify(cloudinary.api.sub_folders.bind(cloudinary.api));

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error fetching products'
    });
  }
};

// Create new product
exports.createProduct = async (req, res) => {
  try {
    const { images, brochure, ...productData } = req.body;
    
    // Auto-fill terms and conditions if not provided
    if (!productData.termsAndConditions && productData.category) {
      productData.termsAndConditions = getProductTerms(productData.category);
    }
    
    // Create product first to get the ID
    const product = await Product.create(productData);
    
    // Handle brochure upload
    if (req.file && req.file.path) {
      const brochureResult = await cloudinary.uploader.upload(req.file.path, {
        folder: `${product.category.toLowerCase().replace(/\s+/g, '_')}/${product._id}/brochures`,
        resource_type: 'auto'
      });
      product.brochureUrl = brochureResult.secure_url;
    }
    
    // Create folder path based on category and product ID
    const folderPath = `${product.category.toLowerCase().replace(/\s+/g, '_')}/${product._id}/images`;
    
    // Upload and optimize images
    const uploadedImages = await Promise.all(
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
    
    // Update product with image URLs
    product.imageUrls = uploadedImages;
    await product.save();

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error fetching product'
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { images, brochure, ...productData } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Handle brochure update
    if (req.file && req.file.path) {
      // If there's an old brochure, delete it
      if (product.brochureUrl) {
        const publicId = product.brochureUrl.split('/').pop().split('.')[0];
        const folder = `${product.category.toLowerCase().replace(/\s+/g, '_')}/${product._id}/brochures`;
        await cloudinary.uploader.destroy(`${folder}/${publicId}`);
      }
      
      const brochureResult = await cloudinary.uploader.upload(req.file.path, {
        folder: `${product.category.toLowerCase().replace(/\s+/g, '_')}/${product._id}/brochures`,
        resource_type: 'auto'
      });
      productData.brochureUrl = brochureResult.secure_url;
    }

    // Handle image updates if there are images
    if (images && images.length > 0) {
      // Create folder path
      const folderPath = `${product.category.toLowerCase().replace(/\s+/g, '_')}/${product._id}/images`;
      
      // Process each image - could be existing URLs or new base64 images
      const uploadedImages = await Promise.all(
        images.map(async (imageData) => {
          // If it's an existing image URL, keep it
          if (imageData.startsWith('http') || imageData.startsWith('https')) {
            return imageData;
          }

          // Handle new image upload
          const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const optimizedBuffer = await optimizeImage(buffer);

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

      // If we're removing images, delete them from Cloudinary
      const removedImages = product.imageUrls.filter(url => !uploadedImages.includes(url));
      if (removedImages.length > 0) {
        try {
          // Extract public_ids from the URLs
          const publicIds = removedImages.map(url => {
            const urlParts = url.split('/');
            const filenameWithExtension = urlParts[urlParts.length - 1];
            const filename = filenameWithExtension.split('.')[0];
            return `${product.category.toLowerCase().replace(/\s+/g, '_')}/${product._id}/images/${filename}`;
          });
          
          // Delete removed images from Cloudinary
          await Promise.all(publicIds.map(publicId => 
            new Promise((resolve, reject) => {
              cloudinary.uploader.destroy(publicId, (error, result) => {
                if (error) reject(error);
                else resolve(result);
              });
            })
          ));
        } catch (error) {
          console.error('Error deleting old images:', error);
          // Continue with update even if image deletion fails
        }
      }

      productData.imageUrls = uploadedImages;
    }

    // Ensure specifications is an object
    productData.specifications = productData.specifications || {};
    
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id, 
      productData,
      { new: true }
    );

    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    // First find the product to get its category
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Only attempt to delete Cloudinary folder if the product has images
    if (product.imageUrls && product.imageUrls.length > 0) {
      try {
        // Construct the folder path
        const folderPath = `${product.category.toLowerCase().replace(/\s+/g, '_')}/${product._id}`;
        
        // Check if the folder exists in Cloudinary
        const categoryPath = product.category.toLowerCase().replace(/\s+/g, '_');
        const folders = await searchFolders(categoryPath);
        const folderExists = folders.folders.some(folder => folder.path === folderPath);
        
        if (folderExists) {
          // Delete all resources in the folder and its subfolders
          await deleteResources(`${folderPath}`);
          
          // Then delete the empty folder
          await deleteFolder(folderPath);
        }
      } catch (cloudinaryError) {
        console.error('Error deleting Cloudinary folder:', cloudinaryError);
        // Continue with product deletion even if Cloudinary deletion fails
      }
    }

    // Delete the product from database
    await Product.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true,
      message: 'Product and associated images deleted successfully' 
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Error deleting product'
    });
  }
};

// Upload brochure
exports.uploadBrochure = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const brochureUrl = `/uploads/brochures/${req.file.filename}`;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { brochureUrl },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get default terms and conditions for a category
exports.getDefaultTerms = async (req, res) => {
  try {
    const { category } = req.query;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    const terms = getProductTerms(category);
    
    res.json({
      success: true,
      data: {
        category,
        termsAndConditions: terms
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching default terms and conditions'
    });
  }
};

// Get all available terms and conditions
exports.getAllTerms = async (req, res) => {
  try {
    const allTerms = getAllProductTerms();
    
    res.json({
      success: true,
      data: allTerms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching terms and conditions'
    });
  }
};
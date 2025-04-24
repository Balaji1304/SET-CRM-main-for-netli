// Function to get product images from Cloudinary
const getProductImages = async (category, productId) => {
  try {
    const folderPath = `${category.toLowerCase().replace(/\s+/g, '_')}/${productId}`;
    
    // Get list of images in the folder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 10
    });

    // Return array of image URLs
    return result.resources.map(resource => resource.secure_url);
  } catch (error) {
    console.error('Error fetching images from Cloudinary:', error);
    return [];
  }
};

module.exports = { getProductImages }; 
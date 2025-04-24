const sharp = require('sharp');

const optimizeImage = async (buffer) => {
  try {
    const optimizedBuffer = await sharp(buffer)
      .jpeg({
        quality: 80,
        chromaSubsampling: '4:4:4',
        force: false
      })
      .resize({
        width: 1920,
        height: 1080,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();

    return optimizedBuffer;
  } catch (error) {
    console.error('Image optimization error:', error);
    return buffer; // Return original buffer if optimization fails
  }
};

module.exports = {
  optimizeImage
}; 
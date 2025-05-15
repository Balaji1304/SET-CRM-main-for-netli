const sharp = require('sharp');

const optimizeImage = async (buffer) => {
  try {
    return await sharp(buffer)
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
  } catch (error) {
    return buffer; // Return original buffer if optimization fails
  }
};

module.exports = {
  optimizeImage
}; 
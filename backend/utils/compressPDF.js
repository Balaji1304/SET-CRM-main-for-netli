const { PDFDocument } = require('pdf-lib');

async function compressPDF(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    
    // Compress PDF
    const compressedPdfBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      useCompression: true
    });
    
    return Buffer.from(compressedPdfBytes);
  } catch (error) {
    console.error('PDF compression failed:', error);
    return buffer;
  }
}

module.exports = compressPDF; 
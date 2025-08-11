const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const pdf = require('html-pdf');

const generatePDF = async (template, data) => {
  try {
    // Read template file
    const templateHtml = fs.readFileSync(
      path.join(__dirname, '..', 'templates', `${template}.handlebars`),
      'utf8'
    );

    // Compile template
    const compiledTemplate = handlebars.compile(templateHtml);
    const html = compiledTemplate(data);

    // PDF generation options
    const options = {
      format: 'A4',
      orientation: 'portrait',
      border: {
        top: '8mm',
        right: '8mm',
        bottom: '8mm',
        left: '8mm'
      },
      header: {
        height: '10mm'
      },
      footer: {
        height: '10mm'
      },
      type: 'pdf',
      quality: '100',
      timeout: 30000,
      renderDelay: 1000,
      zoomFactor: '0.58',
      base: `file://${path.resolve(__dirname, '..')}/`,
      localUrlAccess: true,
      printBackground: true
    };

    // Generate PDF
    return new Promise((resolve, reject) => {
      pdf.create(html, options).toBuffer((err, buffer) => {
        if (err) {
          console.error('PDF Generation Error:', err);
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });
  } catch (error) {
    console.error('Template Processing Error:', error);
    throw error;
  }
};

module.exports = generatePDF; 
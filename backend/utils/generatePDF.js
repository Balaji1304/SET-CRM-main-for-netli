const htmlPdf = require('html-pdf-node');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const NodeCache = require('node-cache');

// Cache for compiled templates (30 mins expiry)
const templateCache = new NodeCache({ stdTTL: 1800 });

const generatePDF = async (template, data) => {
  try {
    const cacheKey = `template_${template}`;
    
    // Try to get compiled template from cache
    let compiledTemplate = templateCache.get(cacheKey);
    
    if (!compiledTemplate) {
      // If not in cache, read and compile template
      const templatePath = path.join(__dirname, '..', 'templates', `${template}.handlebars`);
      const templateHtml = await readFile(templatePath, 'utf8');
      compiledTemplate = handlebars.compile(templateHtml);
      templateCache.set(cacheKey, compiledTemplate);
    }

    // Generate HTML from template and data
    const html = compiledTemplate(data);

    // PDF generation options optimized for html-pdf-node
    const options = {
      format: 'A4',
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      printBackground: true,
      preferCSSPageSize: true,
      scale: 0.7
    };

    // Generate PDF using html-pdf-node
    const file = { content: html };
    try {
      const buffer = await htmlPdf.generatePdf(file, options);
      return buffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  } catch (error) {
    console.error('Template processing error:', error);
    throw new Error(`Failed to process template: ${error.message}`);
  }
};

module.exports = generatePDF; 
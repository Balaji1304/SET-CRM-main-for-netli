const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);
const NodeCache = require('node-cache');

// Cache for compiled templates (30 mins expiry)
const templateCache = new NodeCache({ stdTTL: 1800 });

// Helper function to wait for all images to load
const waitForImages = async (page) => {
  await page.evaluate(async () => {
    const selectors = Array.from(document.getElementsByTagName('img'));
    await Promise.all(selectors.map(img => {
      if (img.complete) return;
      return new Promise((resolve, reject) => {
        img.addEventListener('load', resolve);
        img.addEventListener('error', reject);
      });
    }));
  });
};

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

    // Launch browser once and reuse it
    if (!global.browser) {
      global.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--js-flags=--max-old-space-size=512'
        ]
      });
    }

    // Generate HTML from template and data
    const html = compiledTemplate(data);

    try {
      const page = await global.browser.newPage();
      
      // Optimize memory usage
      await page.setCacheEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (request.resourceType() === 'image') {
          request.continue();
        } else {
          request.abort();
        }
      });

      await page.setContent(html, {
        waitUntil: ['domcontentloaded'],
        timeout: 5000
      });

      // Only wait for critical resources
      await Promise.race([
        waitForImages(page),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);

      const buffer = await page.pdf({
        format: 'A4',
        scale: 0.7,
        compress: true,
        printBackground: true,
        preferCSSPageSize: true,
        omitBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
      });

      await page.close();
      return buffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Template compilation error:', error);
    throw new Error('Error generating PDF: ' + error.message);
  }
};

// Cleanup browser on process exit
process.on('SIGINT', async () => {
  if (global.browser) {
    await global.browser.close();
  }
  process.exit();
});

module.exports = generatePDF; 
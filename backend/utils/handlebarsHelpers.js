const handlebars = require('handlebars');

function getImageRowLayout(imageCount) {
  if (imageCount <= 6) {
    const predefinedLayouts = {
      1: [1],
      2: [2],
      3: [3],
      4: [2, 2],
      5: [3, 2],
      6: [3, 3]
    };
    return predefinedLayouts[imageCount];
  }
  
  // For 7+ images, use (4,3) pattern
  let rows = [];
  let remaining = imageCount;
  let toggle = true;
  
  while (remaining > 0) {
    if (toggle) {
      let rowSize = Math.min(4, remaining);
      rows.push(rowSize);
      remaining -= rowSize;
    } else {
      let rowSize = Math.min(3, remaining);
      rows.push(rowSize);
      remaining -= rowSize;
    }
    toggle = !toggle;
  }
  
  return rows;
}

const registerHelpers = () => {
  // Enhanced formatNumber helper for general numbers
  handlebars.registerHelper('formatNumber', function(number) {
    try {
      if (typeof number !== 'number') {
        number = parseFloat(number);
      }
      if (isNaN(number)) return '0.00'; // Handle NaN after parseFloat
      
      return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(number);
    } catch (error) {
      console.error('Error formatting number:', error);
      return '0.00'; // Fallback
    }
  });

  // New formatCurrency helper
  handlebars.registerHelper('formatCurrency', function(amount) {
    try {
      if (typeof amount !== 'number') {
        amount = parseFloat(amount);
      }
      if (isNaN(amount)) return '₹0.00'; // Handle NaN and provide currency symbol

      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return '₹0.00'; // Fallback with currency symbol
    }
  });

  // Format date helper
  handlebars.registerHelper('formatDate', function(date) {
    try {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  });

  // Helper for division
  handlebars.registerHelper('divide', function(a, b) {
    return a / b;
  });

  // Helper for multiplication
  handlebars.registerHelper('multiply', function(a, b) {
    return a * b;
  });

  // Helper to get image height based on count
  handlebars.registerHelper('getImageHeight', function(totalImages) {
    if (totalImages <= 6) return 250;
    if (totalImages <= 9) return 200;
    if (totalImages <= 12) return 180;
    return 160;
  });
  
  // Helper to split images into rows
  handlebars.registerHelper('imageRows', function(images, options) {
    if (!images || !images.length) return '';
    
    // For 1-3 images, show in one row
    if (images.length <= 3) {
      return options.fn({
        images: images,
        rowSize: images.length,
        totalImages: images.length
      });
    }
    
    // For 4-6 images, show in two rows
    if (images.length <= 6) {
      const rows = [];
      const firstRowSize = Math.ceil(images.length / 2);
      rows.push(images.slice(0, firstRowSize));
      rows.push(images.slice(firstRowSize));
      
      let result = '';
      rows.forEach(rowImages => {
        result += options.fn({
          images: rowImages,
          rowSize: rowImages.length,
          totalImages: images.length
        });
      });
      return result;
    }
    
    // For 7+ images, show in rows of 3
    const rows = [];
    let currentIndex = 0;
    
    while (currentIndex < images.length) {
      const rowImages = images.slice(currentIndex, currentIndex + 3);
      rows.push(rowImages);
      currentIndex += 3;
    }
    
    let result = '';
    rows.forEach(rowImages => {
      result += options.fn({ 
        images: rowImages,
        rowSize: rowImages.length,
        totalImages: images.length
      });
    });
    
    return result;
  });

  // Helper for logical OR operation
  handlebars.registerHelper('or', function() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  });

  // Helper to check equality
  handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  // New helper to check known payment statuses
  handlebars.registerHelper('isPaymentStatusKnown', function (status) {
    const knownStatuses = ['PAID', 'PARTIALLY_PAID', 'PENDING'];
    return knownStatuses.includes(status);
  });

  // New helper for addition (for @index_1)
  handlebars.registerHelper('add', function (a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
      return a + b;
    }
    return ''; // Or handle error appropriately
  });
};

module.exports = {
  handlebars,
  registerHelpers
}; 
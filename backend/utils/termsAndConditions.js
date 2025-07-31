// Default Terms and Conditions for different product categories

const PRODUCT_TERMS = {
  'SOLAR WATER HEATER': `- Prices quoted are firm and valid for 10 days from the date of the quote
- Taxes GST 12 % included
- Payment Terms: 50 % advance along with confirmation and balance against delivery
- Process time two or three days from the date of work order received with advance payment
- Warranty: One Year for SS Model; Two Years for Glass Lined and One year for Pressurised Model; Three Years for Copper Tank Only
- Installation - Inclusive
- Transportation - Inclusive (above 25 kms it will be charged extra)`,

  'SOLAR STREET LIGHTS': `- Prices are quoted are firm and valid for 20 days from the date of the offer
- GST @12 % Include
- Transportation Extra as per actual
- Installation - Inclusive
- Payment Terms: 100% Advance alone with purchase order.
- Delivery: 1 week from the date of technically and commercially clear order with advance.
- Warranty: 5 Years for module 2 years for battery 1 year for fitting.
(NOTE: Civil works to be done at site will be the responsibility of the purchaser)`,

  'SOLAR DRYERS': `- GST @12 % Include
- Transportation Extra as per actual`
};

const BUNDLE_TERMS = `- Prices are quoted are firm and valid for 10 days from the date of the offer.
- Payment Terms: 50% advance along with purchase order and balance 50 % before delivery.
- Delivery within 20 Days from the date of technically and commercially clear order with TANGEDCO Feasibility Approval with advance.
- Warranty: 5 Years for module and inverter.
- Transportation & Installation charges inclusive.
- EB NET Metering Cost Customer scope.
- Any major structural works, electrical wiring and civil work should be done by the customer.`;

/**
 * Get default terms and conditions for a product category
 * @param {string} category - Product category
 * @returns {string} - Default terms and conditions
 */
const getProductTerms = (category) => {
  if (!category) return '';
  
  // Normalize category for lookup (uppercase and handle variations)
  const normalizedCategory = category.toUpperCase().trim();
  
  // Check for exact match first
  if (PRODUCT_TERMS[normalizedCategory]) {
    return PRODUCT_TERMS[normalizedCategory];
  }
  
  // Check for partial matches
  for (const [key, terms] of Object.entries(PRODUCT_TERMS)) {
    if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
      return terms;
    }
  }
  
  return '';
};

/**
 * Get default terms and conditions for product bundles
 * @returns {string} - Default terms and conditions for bundles
 */
const getBundleTerms = () => {
  return BUNDLE_TERMS;
};

/**
 * Get all available product categories with their terms
 * @returns {Object} - Object with categories as keys and terms as values
 */
const getAllProductTerms = () => {
  return { ...PRODUCT_TERMS };
};

/**
 * Get all available bundle terms and conditions
 * @returns {string} - Bundle terms and conditions
 */
const getAllBundleTerms = () => {
  return BUNDLE_TERMS;
};

module.exports = {
  getProductTerms,
  getBundleTerms,
  getAllProductTerms,
  getAllBundleTerms,
  PRODUCT_TERMS,
  BUNDLE_TERMS
};

/**
 * Generates a unique ID combining timestamp and random string
 * This prevents duplicate keys that can occur when Date.now() is called rapidly
 * @returns {string} Unique ID
 */
export const generateUniqueId = () => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substr(2, 9);
  return `${timestamp}_${randomPart}`;
};

/**
 * Creates default form state for products/bundles
 * Each call generates a new object with unique IDs
 * @returns {Object} Default form state
 */
export const createDefaultFormState = () => ({
  leadType: '',
  status: 'pending',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  countryCode: '+91',
  whatsapp: '',
  address: '',
  businessName: '',
  customerType: '',
  products: [
    { 
      id: generateUniqueId(), 
      category: '', 
      name: '', 
      quantity: '1', 
      price: '0', 
      productId: '',
      type: 'individual' // 'individual' or 'bundle'
    }
  ],
  bundles: [], // For power plant system bundles
  productRequirements: '',
  dateCollected: new Date().toISOString().split('T')[0],
  followUpRequired: false,
  followUpDateTime: '',
  notes: ''
});

/**
 * Ensures all products/bundles in an array have unique IDs
 * @param {Array} items - Array of products or bundles
 * @returns {Array} Items with guaranteed unique IDs
 */
export const ensureUniqueIds = (items) => {
  return items.map(item => ({
    ...item,
    id: item.id || generateUniqueId()
  }));
}; 
/**
 * Formats a number for display with proper comma separation
 * @param {number|string} num - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
  if (num === 'N/A' || num === undefined || num === null) return 'N/A';
  if (typeof num !== 'number') {
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return 'N/A';
    num = parsed;
  }
  return num.toLocaleString('en-IN');
};

/**
 * Formats currency with Indian Rupee symbol
 * @param {number|string} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  const formattedAmount = formatNumber(amount);
  if (formattedAmount === 'N/A') return 'N/A';
  return `₹${formattedAmount}`;
};

/**
 * Formats percentage with % symbol
 * @param {number|string} value - The percentage value
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value) => {
  const formattedValue = formatNumber(value);
  if (formattedValue === 'N/A') return 'N/A';
  return `${formattedValue}%`;
};



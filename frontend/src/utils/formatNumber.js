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
  if (amount == null || amount === 'N/A') return 'N/A';
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return 'N/A';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Formats a date for display in Indian locale
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string (e.g. "31 Oct 2026")
 */
export const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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



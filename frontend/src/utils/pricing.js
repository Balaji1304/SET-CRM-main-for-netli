// Mirrors backend/utils/pricing.js (issue #67).
// New quotation items carry the discount in rupees as `discountAmount`; older items only
// have `discount`, which was a percentage.

export const ONLINE_CHARGE_PERCENT = 2;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const gross = (item) => (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
const hasAmount = (item) => item.discountAmount !== undefined && item.discountAmount !== null && item.discountAmount !== '';

export const itemDiscount = (item) => hasAmount(item)
  ? round2(item.discountAmount)
  : Number((gross(item) * (Number(item.discount) || 0) / 100).toFixed(2));

export const itemTotal = (item) => round2(gross(item) - itemDiscount(item));

export const onlineCharge = (amount) => round2((Number(amount) || 0) * ONLINE_CHARGE_PERCENT / 100);
export const withOnlineCharge = (amount) => round2(round2(amount) + onlineCharge(amount));

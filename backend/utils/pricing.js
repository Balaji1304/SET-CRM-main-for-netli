// Quotation item pricing (issue #67).
// New items store the discount in rupees as `discountAmount`. Items created before #67
// only have `discount`, which was a percentage, so they are still priced that way.

const { AppError } = require('./errorHandler');

const ONLINE_CHARGE_RATE = 0.02;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const gross = (item) => (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
const hasAmount = (item) => item.discountAmount !== undefined && item.discountAmount !== null && item.discountAmount !== '';

const itemDiscount = (item) => hasAmount(item)
  ? round2(item.discountAmount)
  : Number((gross(item) * (Number(item.discount) || 0) / 100).toFixed(2));

const itemTotal = (item) => hasAmount(item)
  ? round2(gross(item) - round2(item.discountAmount))
  : Number((gross(item) * (1 - (Number(item.discount) || 0) / 100)).toFixed(2));

// Validates a request item and returns its rupee discount.
const parseItemDiscount = (item) => {
  if (hasAmount(item) && isNaN(Number(item.discountAmount))) throw new AppError('Discount must be a number', 400);
  const discount = itemDiscount(item);
  if (discount < 0) throw new AppError('Discount cannot be negative', 400);
  if (discount > gross(item) + 0.001) throw new AppError('Discount cannot be more than the item total (quantity × unit price)', 400);
  return discount;
};

// Online (Razorpay) payments cost the amount due plus 2%; the 2% never reduces what is owed.
const onlineCharge = (amount) => round2(amount * ONLINE_CHARGE_RATE);
const withOnlineCharge = (amount) => round2(round2(amount) + onlineCharge(amount));

// Discount and online-charge figures the quotation template needs. `items` are formatted items with discountAmount.
const quotationSummary = (items, total, advanceAmount) => {
  const totalDiscount = round2(items.reduce((s, i) => s + (Number(i.discountAmount) || 0), 0));
  return {
    hasDiscount: totalDiscount > 0,
    totalDiscount,
    subTotal: round2(total + totalDiscount),
    onlineChargePercent: ONLINE_CHARGE_RATE * 100,
    advanceOnlineCharge: onlineCharge(advanceAmount || 0),
    advancePayableOnline: withOnlineCharge(advanceAmount || 0)
  };
};

module.exports = { ONLINE_CHARGE_RATE, round2, itemDiscount, itemTotal, parseItemDiscount, onlineCharge, withOnlineCharge, quotationSummary };

const { itemDiscount, itemTotal, parseItemDiscount, onlineCharge, withOnlineCharge, quotationSummary } = require('../utils/pricing');

describe('rupee discounts (issue #67)', () => {
  test('line total subtracts the rupee discount', () => {
    expect(itemTotal({ quantity: 2, unitPrice: 50000, discountAmount: 5000 })).toBe(95000);
    expect(itemDiscount({ quantity: 2, unitPrice: 50000, discountAmount: 5000 })).toBe(5000);
  });

  test('a discount of 0 leaves the line total unchanged', () => {
    expect(itemTotal({ quantity: 3, unitPrice: 1000, discountAmount: 0 })).toBe(3000);
  });

  test('older items with a percentage discount keep their totals', () => {
    const legacy = { quantity: 1, unitPrice: 100000, discount: 5 };
    expect(itemDiscount(legacy)).toBe(5000);
    expect(itemTotal(legacy)).toBe(95000);
  });

  test('no maximum discount: the full line total is allowed', () => {
    expect(parseItemDiscount({ quantity: 1, unitPrice: 20000, discountAmount: 20000 })).toBe(20000);
  });

  test.each([
    ['more than the line total', { quantity: 1, unitPrice: 1000, discountAmount: 1000.5 }, /more than the item total/],
    ['negative', { quantity: 1, unitPrice: 1000, discountAmount: -1 }, /negative/],
    ['not a number', { quantity: 1, unitPrice: 1000, discountAmount: 'abc' }, /number/]
  ])('a discount that is %s is rejected with 400', (_label, item, message) => {
    expect(() => parseItemDiscount(item)).toThrow(message);
    try { parseItemDiscount(item); } catch (e) { expect(e.statusCode).toBe(400); }
  });
});

describe('2% online payment charge', () => {
  test('is added on top of the amount due', () => {
    expect(onlineCharge(50000)).toBe(1000);
    expect(withOnlineCharge(50000)).toBe(51000);
  });

  test('rounds to paise', () => {
    expect(onlineCharge(333.33)).toBe(6.67);
    expect(withOnlineCharge(333.33)).toBe(340);
  });
});

describe('quotationSummary', () => {
  test('flags no discount when every item discount is 0', () => {
    const s = quotationSummary([{ discountAmount: 0 }, { discountAmount: 0 }], 100000, 50000);
    expect(s.hasDiscount).toBe(false);
    expect(s.subTotal).toBe(100000);
    expect(s.advanceOnlineCharge).toBe(1000);
    expect(s.advancePayableOnline).toBe(51000);
    expect(s.onlineChargePercent).toBe(2);
  });

  test('totals the rupee discounts', () => {
    const s = quotationSummary([{ discountAmount: 2500 }, { discountAmount: 0 }], 97500, 48750);
    expect(s).toEqual(expect.objectContaining({ hasDiscount: true, totalDiscount: 2500, subTotal: 100000 }));
  });
});

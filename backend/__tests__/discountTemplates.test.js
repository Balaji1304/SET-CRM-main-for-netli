const fs = require('fs');
const path = require('path');
const { handlebars, registerHelpers } = require('../utils/handlebarsHelpers');
const { quotationSummary } = require('../utils/pricing');

registerHelpers();
const render = (name, data) => handlebars.compile(
  fs.readFileSync(path.join(__dirname, '..', 'templates', `${name}.handlebars`), 'utf8')
)(data, { allowProtoPropertiesByDefault: true });

// The items table only, so product descriptions elsewhere in the page cannot match
const itemsTable = (html) => html.slice(html.indexOf('class="items-table"'), html.indexOf('</table>', html.indexOf('class="items-table"')));

const quotation = (items, total) => ({
  quotationNumber: 'Q-TEST', lead: { firstName: 'Asha', lastName: 'R' }, items, total,
  advanceAmount: total / 2, advancePercentage: 50,
  ...quotationSummary(items, total, total / 2)
});

describe('quotation PDF', () => {
  test('no Discount column or 0% when nothing is discounted', () => {
    const html = render('quotation', quotation([{ product: { name: 'Panel' }, quantity: 1, unitPrice: 100000, discountAmount: 0, total: 100000 }], 100000));
    const table = itemsTable(html);
    expect(table).not.toMatch(/Discount/);
    expect(table).not.toMatch(/>\s*\d+%/); // no percentage cell text (CSS widths use % too)
    expect(table).toMatch(/colspan="3"[^>]*><strong>TOTAL AMOUNT/);
  });

  test('discount shown in rupees only, with a dash for undiscounted items', () => {
    const items = [
      { product: { name: 'Panel' }, quantity: 1, unitPrice: 100000, discountAmount: 5000, total: 95000 },
      { product: { name: 'Inverter' }, quantity: 1, unitPrice: 20000, discountAmount: 0, total: 20000 }
    ];
    const table = itemsTable(render('quotation', quotation(items, 115000)));
    expect(table).toMatch(/>Discount</);
    expect(table).toMatch(/5,000/);
    expect(table).toMatch(/>-</);
    expect(table).not.toMatch(/>\s*\d+%/);
    expect(table).toMatch(/Total Discount/);
  });

  test('cost breakdown carries the 2% online payment note and payable amount', () => {
    const html = render('quotation', quotation([{ product: { name: 'Panel' }, quantity: 1, unitPrice: 100000, discountAmount: 0, total: 100000 }], 100000));
    expect(html).toMatch(/Online payment will be 2% of the amount included\./);
    expect(html).toMatch(/1,000/);  // 2% of the ₹50,000 advance
    expect(html).toMatch(/51,000/); // payable online
  });
});

describe('invoice PDF', () => {
  const invoice = (over) => ({
    invoiceNumber: 'INV-1', companyDetails: {}, customerDetails: {}, quotation: {}, customerPurchase: {},
    items: [{ name: 'Panel', quantity: 1, unitPrice: 100000, discountAmount: 0, itemTotal: 100000 }],
    totalAmount: 100000, paidAmount: 100000, onlinePaymentCharges: 0, amountPaidTotal: 100000, paymentStatus: 'PAID',
    ...over
  });

  test('online payment charges get their own line', () => {
    const html = render('invoice', invoice({ onlinePaymentCharges: 2000, amountPaidTotal: 102000 }));
    expect(html).toMatch(/Online Payment Charges \(2%\)/);
    expect(html).toMatch(/2,000/);
    expect(html).toMatch(/1,02,000/);
  });

  test('no online charge line for offline payments, no Discount column at 0', () => {
    const html = render('invoice', invoice());
    expect(html).not.toMatch(/Online Payment Charges/);
    expect(html).not.toMatch(/>Discount</);
  });
});

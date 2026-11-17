jest.mock('../models/CustomerPurchase');
jest.mock('../models/Payment');
jest.mock('../models/User');
jest.mock('../utils/notificationService', () => ({
  createPaymentNotification: jest.fn().mockResolvedValue(),
  createAccountsNotification: jest.fn().mockResolvedValue()
}));
jest.mock('../utils/accessControl', () => ({
  assertCanAccessPurchase: jest.fn().mockResolvedValue(),
  findCustomerForUser: jest.fn().mockResolvedValue({ firstName: 'Asha', phone: '9876543210' })
}));
jest.mock('../config/razorpay', () => ({
  paymentLink: { create: jest.fn() },
  verifyPaymentLinkStatus: jest.fn()
}));

const CustomerPurchase = require('../models/CustomerPurchase');
const Payment = require('../models/Payment');
const User = require('../models/User');
const razorpay = require('../config/razorpay');
const { createRemainingPaymentLink, verifyRazorpayPayment } = require('../controllers/paymentController');

const fakeRes = () => { const res = { json: jest.fn() }; res.status = jest.fn(() => res); return res; };
const purchaseDoc = (over = {}) => ({
  _id: 'p1234567890', remainingAmount: 50000, isFullyPaid: false, quotationId: { _id: 'q1', quotationNumber: 'Q-1' },
  save: jest.fn().mockResolvedValue(), ...over
});

beforeEach(() => jest.clearAllMocks());

test('remaining payment link charges the balance plus 2% and remembers the charge', async () => {
  const purchase = purchaseDoc();
  CustomerPurchase.findById = jest.fn(() => ({ populate: jest.fn().mockResolvedValue(purchase) }));
  User.findById = jest.fn().mockResolvedValue({ name: 'Asha', email: 'a@example.com' });
  razorpay.paymentLink.create.mockResolvedValue({ id: 'plink_1', short_url: 'https://rzp.io/x' });

  const res = fakeRes();
  await createRemainingPaymentLink({ params: { purchaseId: 'p1' }, user: { id: 'u1' } }, res);

  expect(razorpay.paymentLink.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 5100000 })); // ₹51,000 in paise
  expect(purchase.onlineChargeAmount).toBe(1000);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ paymentLink: 'https://rzp.io/x' })
  }));
});

test('paying online clears only the balance; the 2% is stored separately', async () => {
  const purchase = purchaseDoc({ razorpayPaymentId: 'plink_1', onlineChargeAmount: 1000 });
  CustomerPurchase.findById = jest.fn().mockResolvedValue(purchase);
  Payment.findOne = jest.fn().mockResolvedValue(null);
  Payment.create = jest.fn(async (doc) => doc);
  razorpay.verifyPaymentLinkStatus.mockResolvedValue({ verified: true, paymentLink: { amount: 51000 } });

  const res = fakeRes();
  await verifyRazorpayPayment({ params: { purchaseId: 'p1', paymentLinkId: 'plink_1' }, user: { id: 'u1' } }, res);

  expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({ amountPaid: 50000, onlineCharge: 1000, paymentMethod: 'razorpay' }));
  expect(purchase.remainingAmount).toBe(0);
  expect(purchase.isFullyPaid).toBe(true);
});

test('a paid amount missing the 2% does not settle the balance', async () => {
  const purchase = purchaseDoc({ razorpayPaymentId: 'plink_1', onlineChargeAmount: 1000 });
  CustomerPurchase.findById = jest.fn().mockResolvedValue(purchase);
  Payment.findOne = jest.fn().mockResolvedValue(null);
  Payment.create = jest.fn();
  razorpay.verifyPaymentLinkStatus.mockResolvedValue({ verified: true, paymentLink: { amount: 50000 } });

  await verifyRazorpayPayment({ params: { purchaseId: 'p1', paymentLinkId: 'plink_1' }, user: { id: 'u1' } }, fakeRes());

  expect(Payment.create).not.toHaveBeenCalled();
  expect(purchase.remainingAmount).toBe(50000);
});

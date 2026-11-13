jest.mock('../config/cloudinary', () => ({}));
jest.mock('../utils/sendNotification', () => ({
  sendCustomerWhatsApp: jest.fn().mockResolvedValue({ success: true })
}));
jest.mock('../utils/notificationService', () => ({
  createTicketNotification: jest.fn().mockResolvedValue(),
  createAccountsNotification: jest.fn().mockResolvedValue()
}));
jest.mock('../utils/installationReminders', () => ({ sendDailyInstallationReminders: jest.fn() }));

const mongoose = require('mongoose');
const { sendCustomerWhatsApp } = require('../utils/sendNotification');
const tickets = require('../controllers/tickets');
const { runPaymentOverdueCheck } = require('../utils/reminderScheduler');
const { handleOptChange } = require('../routes/whatsappWebhook');

const PHONE = '9999912345';
let db;
const flush = () => new Promise(r => setTimeout(r, 100));
const fakeRes = () => { const res = { json: jest.fn() }; res.status = jest.fn(() => res); return res; };

beforeAll(async () => {
  await mongoose.connect(require('./testDb'));
  db = mongoose.connection.db;
});

afterEach(() => jest.clearAllMocks());

afterAll(async () => {
  await Promise.all(['users', 'customers', 'leads'].map(c => db.collection(c).deleteMany({ phone: PHONE })));
  await db.collection('tickets').deleteMany({ title: 'lifecycle-test' });
  await db.collection('customerpurchases').deleteMany({ purchaseID: 'LIFECYCLE-TEST' });
  await mongoose.disconnect();
});

describe('ticket status triggers', () => {
  let ticketId, engineerId;

  beforeAll(async () => {
    const { insertedId: userId } = await db.collection('users').insertOne({ name: 'Ticket Customer', phone: PHONE, role: 'customer' });
    engineerId = new mongoose.Types.ObjectId();
    ({ insertedId: ticketId } = await db.collection('tickets').insertOne({
      user: userId, title: 'lifecycle-test', description: 'd', category: 'service',
      status: 'assigned', priority: 'medium', assignedEngineerId: engineerId, comments: [], attachments: []
    }));
  });

  const setStatus = async (status) => {
    const res = fakeRes();
    await tickets.updateTicketStatus({ params: { id: String(ticketId) }, body: { status }, user: { id: String(engineerId) } }, res);
    await flush();
    return res;
  };

  test('a status change sends ticket_updated with readable status text', async () => {
    const res = await setStatus('in_progress');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(sendCustomerWhatsApp).toHaveBeenCalledWith('ticket_updated',
      expect.objectContaining({ name: 'Ticket Customer', phone: PHONE }),
      expect.objectContaining({ status: 'In progress', ticketNumber: expect.stringMatching(/^TKT-[0-9A-F]{6}$/) }));
  });

  test('setting the same status again sends nothing', async () => {
    await setStatus('in_progress');
    expect(sendCustomerWhatsApp).not.toHaveBeenCalled();
  });

  test('resolving sends ticket_resolved', async () => {
    await setStatus('resolved');
    expect(sendCustomerWhatsApp).toHaveBeenCalledWith('ticket_resolved', expect.anything(), expect.objectContaining({ ticketNumber: expect.any(String) }));
  });
});

describe('payment reminder', () => {
  let purchaseId;

  beforeAll(async () => {
    const { insertedId: customerId } = await db.collection('customers').insertOne({ firstName: 'Pay', lastName: 'Late', phone: PHONE, preferredContactMethod: 'whatsapp' });
    ({ insertedId: purchaseId } = await db.collection('customerpurchases').insertOne({
      purchaseID: 'LIFECYCLE-TEST', customerId, isFullyPaid: false, remainingAmount: 5000, totalAmount: 10000,
      purchaseDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    }));
  });

  test('sends once, then waits a week', async () => {
    await runPaymentOverdueCheck();
    await runPaymentOverdueCheck();
    const reminders = sendCustomerWhatsApp.mock.calls.filter(c => c[0] === 'payment_reminder');
    expect(reminders).toHaveLength(1);
    expect(reminders[0][1]).toEqual(expect.objectContaining({ firstName: 'Pay' }));
    expect(reminders[0][2]).toEqual(expect.objectContaining({ amount: '5,000', reference: 'order LIFECYCLE-TEST' }));
    const purchase = await db.collection('customerpurchases').findOne({ _id: purchaseId });
    expect(purchase.paymentReminderSentAt).toBeInstanceOf(Date);
  });
});

describe('STOP opt-out', () => {
  test('applies to the lead, customer and user with that number', async () => {
    await db.collection('leads').insertOne({ firstName: 'Opt', phone: PHONE });
    await handleOptChange(`91${PHONE}`, false);
    for (const c of ['leads', 'customers', 'users']) {
      const docs = await db.collection(c).find({ phone: PHONE }).toArray();
      expect(docs.length).toBeGreaterThan(0);
      docs.forEach(d => expect(d.whatsappOptIn).toBe(false));
    }
  });
});

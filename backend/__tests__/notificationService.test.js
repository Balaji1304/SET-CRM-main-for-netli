const NotificationService = require('../utils/notificationService');
const Notification = require('../models/Notification');
const User = require('../models/User');

jest.mock('../models/Notification');
jest.mock('../models/User');

describe('NotificationService - Accounts Department Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('quotation_approved includes accounts_department recipients', async () => {
    const quotation = { quotationNumber: 'Q-1001', customer: 'cust1' };
    User.find = jest.fn()
      .mockResolvedValueOnce([{ _id: 'sales1' }]) // sales team
      .mockResolvedValueOnce([{ _id: 'acc1' }, { _id: 'acc2' }]); // accounts
    Notification.createNotification = jest.fn().mockResolvedValue({ _id: 'n1' });

    await NotificationService.createQuotationNotification('quotation_approved', quotation);

    const calls = Notification.createNotification.mock.calls;
    const recipients = calls.map(c => c[0].recipient);
    expect(recipients).toEqual(expect.arrayContaining(['acc1', 'acc2']));
  });

  test('quotation_pending_approval notifies accounts_department', async () => {
    const data = { createdBy: 'creator1', quotationNumber: 'Q-2001', customerName: 'Acme', amount: 50000 };
    User.find = jest.fn()
      .mockResolvedValueOnce([{ _id: 'salesHead1' }]) // sales heads
      .mockResolvedValueOnce([{ _id: 'accA' }]); // accounts
    Notification.createNotification = jest.fn().mockResolvedValue({ _id: 'n2' });

    await NotificationService.createSalesNotification('quotation_pending_approval', data);

    const recipients = Notification.createNotification.mock.calls.map(c => c[0].recipient);
    expect(recipients).toEqual(expect.arrayContaining(['accA']));
  });

  test('createAccountsNotification supports payment_received, payment_overdue, invoice_due_soon', async () => {
    User.find = jest.fn().mockResolvedValue([{ _id: 'accX' }]);
    Notification.createNotification = jest.fn().mockResolvedValue({ _id: 'n3' });

    await NotificationService.createAccountsNotification('payment_received', { amount: 1000, customerName: 'Foo', invoiceNumber: 'INV-1' });
    await NotificationService.createAccountsNotification('payment_overdue', { amount: 2000, customerName: 'Bar', daysOverdue: 10, invoiceNumber: 'INV-2' });
    await NotificationService.createAccountsNotification('invoice_due_soon', { amount: 3000, customerName: 'Baz', daysUntilDue: 5, invoiceNumber: 'INV-3', dueDate: new Date().toISOString() });

    expect(Notification.createNotification).toHaveBeenCalledTimes(3);
  });

  test('payments count included in getNotificationCounts API response shape', async () => {
    // Mock Notification.countDocuments in sequence
    const counts = [10, 5, 1, 2, 3, 4, 0, 1, 6];
    Notification.countDocuments = jest.fn()
      .mockResolvedValueOnce(counts[0])
      .mockResolvedValueOnce(counts[1])
      .mockResolvedValueOnce(counts[2])
      .mockResolvedValueOnce(counts[3])
      .mockResolvedValueOnce(counts[4])
      .mockResolvedValueOnce(counts[5])
      .mockResolvedValueOnce(counts[6])
      .mockResolvedValueOnce(counts[7])
      .mockResolvedValueOnce(counts[8]);

    const req = { user: { id: 'u1', role: 'accounts_department', email: 'acc@x.com' } };
    const json = jest.fn();
    const res = { json };
    const { getNotificationCounts } = require('../controllers/notification');
    await getNotificationCounts(req, res);

    expect(json).toHaveBeenCalled();
    const payload = json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.byType).toHaveProperty('payments', counts[8]);
  });
});




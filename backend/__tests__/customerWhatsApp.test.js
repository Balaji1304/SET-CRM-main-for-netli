jest.mock('../utils/sendEmail', () => jest.fn());
jest.mock('../utils/sendWhatsApp', () => ({
  sendTicketCreatedWhatsApp: jest.fn().mockResolvedValue({ success: true }),
  sendPaymentReminderWhatsApp: jest.fn().mockRejectedValue(new Error('Meta down'))
}));

const { sendTicketCreatedWhatsApp } = require('../utils/sendWhatsApp');
const { sendCustomerWhatsApp } = require('../utils/sendNotification');

afterEach(() => jest.clearAllMocks());

test('User-shaped contact sends with its full name', async () => {
  await sendCustomerWhatsApp('ticket_created', { name: 'Ravi Kumar', phone: '9876543210' }, { ticketNumber: 'TKT-1' });
  expect(sendTicketCreatedWhatsApp).toHaveBeenCalledWith(expect.objectContaining({ customerName: 'Ravi Kumar', to: '9876543210', ticketNumber: 'TKT-1' }));
});

test('empty last name leaves no trailing space', async () => {
  await sendCustomerWhatsApp('ticket_created', { firstName: 'Dealer1', lastName: '', phone: '9876543210' }, { ticketNumber: 'TKT-1' });
  expect(sendTicketCreatedWhatsApp.mock.calls[0][0].customerName).toBe('Dealer1');
});

test('mongoose documents are read through toObject', async () => {
  const doc = { toObject: () => ({ firstName: 'Asha', lastName: 'R', phone: '9876543210' }) };
  await sendCustomerWhatsApp('ticket_created', doc, { ticketNumber: 'TKT-1' });
  expect(sendTicketCreatedWhatsApp.mock.calls[0][0].customerName).toBe('Asha R');
});

test.each([
  ['opted out', { whatsappOptIn: false }],
  ['no WhatsApp', { hasWhatsapp: false }],
  ['email-only preference', { preferredContactMethod: 'email' }]
])('%s is skipped', async (_label, over) => {
  const res = await sendCustomerWhatsApp('ticket_created', { firstName: 'A', phone: '9876543210', ...over }, { ticketNumber: 'TKT-1' });
  expect(res.skipped).toBe('not_whatsapp');
  expect(sendTicketCreatedWhatsApp).not.toHaveBeenCalled();
});

test('missing contact is skipped', async () => {
  expect(await sendCustomerWhatsApp('ticket_created', null, {})).toEqual({ skipped: 'no_contact' });
});

test('send errors are returned, never thrown', async () => {
  const res = await sendCustomerWhatsApp('payment_reminder', { firstName: 'A', phone: '9876543210' }, { amount: '1', reference: 'x', dueDate: 'y' });
  expect(res).toEqual({ error: 'Meta down' });
});

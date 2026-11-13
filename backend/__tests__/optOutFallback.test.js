jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue({ success: true }));
jest.mock('../utils/sendWhatsApp', () => ({
  sendAccountCreatedWhatsApp: jest.fn().mockResolvedValue({ success: true })
}));

const sendEmail = require('../utils/sendEmail');
const { sendAccountCreatedWhatsApp } = require('../utils/sendWhatsApp');
const { sendSmartNotification } = require('../utils/sendNotification');

const lead = (over) => ({ firstName: 'T', lastName: 'L', phone: '9876543210', hasWhatsapp: true, ...over });

afterEach(() => jest.clearAllMocks());

test('opted-out WhatsApp-only lead with email gets email instead', async () => {
  const res = await sendSmartNotification(
    lead({ preferredContactMethod: 'whatsapp', email: 'a@b.com', whatsappOptIn: false }), 'welcome', {});
  expect(sendAccountCreatedWhatsApp).not.toHaveBeenCalled();
  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(res.whatsapp.attempted).toBe(false);
  expect(res.email.success).toBe(true);
});

test('forced WhatsApp to opted-out lead falls back to email', async () => {
  const res = await sendSmartNotification(
    lead({ preferredContactMethod: 'both', email: 'a@b.com', whatsappOptIn: false }), 'welcome', {}, { forceMethod: 'whatsapp' });
  expect(sendAccountCreatedWhatsApp).not.toHaveBeenCalled();
  expect(res.email.success).toBe(true);
});

test('opted-out lead without email gets nothing and nothing is reported as sent', async () => {
  const res = await sendSmartNotification(
    lead({ preferredContactMethod: 'whatsapp', whatsappOptIn: false }), 'welcome', {});
  expect(sendAccountCreatedWhatsApp).not.toHaveBeenCalled();
  expect(sendEmail).not.toHaveBeenCalled();
  expect(res.whatsapp.success).toBe(false);
});

test('opted-in lead still gets WhatsApp', async () => {
  await sendSmartNotification(lead({ preferredContactMethod: 'whatsapp' }), 'welcome', {});
  expect(sendAccountCreatedWhatsApp).toHaveBeenCalledTimes(1);
});

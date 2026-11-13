const mongoose = require('mongoose');
const crypto = require('crypto');

jest.mock('axios');
jest.mock('../utils/whatsappTokenManager', () => ({
  getAccessToken: () => 'test-token',
  getValidAccessToken: async () => 'test-token',
  getTokenInfo: async () => null
}));
jest.mock('../config/whatsapp', () => ({
  accessToken: 'test-token',
  phoneNumberId: 'test-phone',
  wabaId: 'test-waba',
  appId: 'test-app',
  appSecret: 'test-secret',
  apiVersion: 'v19.0',
  baseUrl: 'https://graph.facebook.com/v19.0',
  devMode: false
}));

const axios = require('axios');
const { formatPhoneNumber, isWindowOpen } = require('../utils/sendWhatsApp');
const { buildWhatsAppComponents } = require('../utils/sendWhatsApp');
const WhatsAppMessage = require('../models/WhatsAppMessage');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/solar-crm-test');
});

afterAll(async () => {
  await WhatsAppMessage.deleteMany({ to: { $regex: /^test_/ } });
  await mongoose.disconnect();
});

describe('phone normalization', () => {
  test('10-digit local number gets country code', () => {
    expect(formatPhoneNumber('8925216675', '+91')).toBe('918925216675');
  });

  test('already has country code', () => {
    expect(formatPhoneNumber('918925216675', '+91')).toBe('918925216675');
  });

  test('strips leading zero', () => {
    expect(formatPhoneNumber('08925216675', '+91')).toBe('918925216675');
  });

  test('strips non-digits', () => {
    expect(formatPhoneNumber('+91-89252-16675', '+91')).toBe('918925216675');
  });

  test('different country code', () => {
    expect(formatPhoneNumber('1234567890', '+1')).toBe('11234567890');
  });
});

describe('isWindowOpen', () => {
  test('null returns false', () => {
    expect(isWindowOpen(null)).toBe(false);
  });

  test('recent timestamp returns true', () => {
    expect(isWindowOpen(new Date())).toBe(true);
  });

  test('25h ago returns false', () => {
    expect(isWindowOpen(new Date(Date.now() - 25 * 60 * 60 * 1000))).toBe(false);
  });
});

describe('webhook signature verification', () => {
  const appSecret = 'test-secret';

  test('valid signature matches', () => {
    const body = JSON.stringify({ entry: [] });
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(body).digest('hex');
    const receivedBuf = Buffer.from(expected, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    expect(receivedBuf.length).toBe(expectedBuf.length);
    expect(crypto.timingSafeEqual(receivedBuf, expectedBuf)).toBe(true);
  });

  test('tampered signature fails', () => {
    const body = JSON.stringify({ entry: [] });
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(body).digest('hex');
    const tampered = expected.slice(0, -1) + (expected.slice(-1) === 'a' ? 'b' : 'a');
    const receivedBuf = Buffer.from(tampered, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    expect(crypto.timingSafeEqual(receivedBuf, expectedBuf)).toBe(false);
  });
});

describe('status update idempotency', () => {
  test('duplicate status update does not create errors', async () => {
    const msg = await WhatsAppMessage.create({
      direction: 'outbound', to: 'test_idem_999', type: 'template',
      wamid: 'wamid.idem_test', status: 'sent', meta: { devMode: true }
    });

    // Apply delivered twice
    await WhatsAppMessage.findOneAndUpdate(
      { wamid: 'wamid.idem_test' },
      { $set: { status: 'delivered', 'statusTimestamps.delivered': new Date() } }
    );
    await WhatsAppMessage.findOneAndUpdate(
      { wamid: 'wamid.idem_test' },
      { $set: { status: 'delivered', 'statusTimestamps.delivered': new Date() } }
    );

    const updated = await WhatsAppMessage.findById(msg._id);
    expect(updated.status).toBe('delivered');
  });
});

describe('webhook status ordering', () => {
  const { applyStatus } = require('../routes/whatsappWebhook');
  const ts = Math.floor(Date.now() / 1000);

  test('a late delivered event does not move a read message back', async () => {
    await WhatsAppMessage.create({ direction: 'outbound', to: 'test_order_999', type: 'template', wamid: 'wamid.order_test', status: 'sent' });
    await applyStatus({ id: 'wamid.order_test', status: 'read', timestamp: ts });
    await applyStatus({ id: 'wamid.order_test', status: 'delivered', timestamp: ts });
    const row = await WhatsAppMessage.findOne({ wamid: 'wamid.order_test' });
    expect(row.status).toBe('read');
    expect(row.statusTimestamps.delivered).toBeDefined();
  });

  test('failed records its error', async () => {
    await WhatsAppMessage.create({ direction: 'outbound', to: 'test_order_999', type: 'template', wamid: 'wamid.order_fail', status: 'sent' });
    await applyStatus({ id: 'wamid.order_fail', status: 'failed', timestamp: ts, errors: [{ code: 131049, title: 'x', message: 'y' }] });
    const row = await WhatsAppMessage.findOne({ wamid: 'wamid.order_fail' });
    expect(row.status).toBe('failed');
    expect(row.error.code).toBe(131049);
  });
});

describe('sendWithRetry', () => {
  const { sendWithRetry } = require('../utils/whatsappQueue');
  const fast = { baseDelayMs: 1 };

  test('returns the first successful result without retrying', async () => {
    const send = jest.fn().mockResolvedValue({ messageId: 'wamid.ok' });
    await expect(sendWithRetry(send, { to: 'x' }, fast)).resolves.toEqual({ messageId: 'wamid.ok' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  test('retries after a failure, then succeeds', async () => {
    const send = jest.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue({ messageId: 'wamid.retry' });
    await expect(sendWithRetry(send, { to: 'x' }, fast)).resolves.toEqual({ messageId: 'wamid.retry' });
    expect(send).toHaveBeenCalledTimes(2);
  });

  test('throws the last error after the retry limit', async () => {
    const send = jest.fn().mockRejectedValue(new Error('down'));
    await expect(sendWithRetry(send, { to: 'x' }, { ...fast, retries: 3 })).rejects.toThrow('down');
    expect(send).toHaveBeenCalledTimes(4);
  });
});

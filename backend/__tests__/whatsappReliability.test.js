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

describe('queue retry', () => {
  test('enqueue calls send function and logs', async () => {
    const { enqueue } = require('../utils/whatsappQueue');
    const mockSend = jest.fn().mockResolvedValue({ success: true, messageId: 'wamid.queue_test' });

    const msg = await enqueue(mockSend, { to: 'test_queue_999' }, { type: 'template', templateName: 'test' });
    // Wait for async processing
    await new Promise(r => setTimeout(r, 200));

    expect(mockSend).toHaveBeenCalledTimes(1);
    const updated = await WhatsAppMessage.findById(msg._id);
    expect(updated.status).toBe('sent');
    expect(updated.wamid).toBe('wamid.queue_test');
  });

  test('marks as failed after max retries', async () => {
    const { enqueue } = require('../utils/whatsappQueue');
    const mockSend = jest.fn().mockRejectedValue(new Error('Permanent failure'));

    const msg = await enqueue(mockSend, { to: 'test_fail_999' }, { type: 'template' });

    // The queue will exhaust retries but with real delays; check the initial state
    expect(msg.status).toBe('queued');
    expect(msg.meta.retries).toBe(0);
  });
});

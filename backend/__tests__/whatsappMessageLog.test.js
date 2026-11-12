const mongoose = require('mongoose');
const WhatsAppMessage = require('../models/WhatsAppMessage');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/solar-crm-test');
});

afterAll(async () => {
  await WhatsAppMessage.deleteMany({ meta: { devMode: true }, to: '919999999999' });
  await mongoose.disconnect();
});

describe('WhatsAppMessage model', () => {
  test('creates an outbound log entry', async () => {
    const msg = await WhatsAppMessage.create({
      direction: 'outbound',
      to: '919999999999',
      from: 'test-phone-id',
      type: 'template',
      templateName: 'quotation_ready',
      wamid: 'wamid.test_123',
      status: 'sent',
      meta: { devMode: true }
    });
    expect(msg._id).toBeDefined();
    expect(msg.status).toBe('sent');
    expect(msg.direction).toBe('outbound');
  });

  test('updates status from webhook', async () => {
    const msg = await WhatsAppMessage.create({
      direction: 'outbound',
      to: '919999999999',
      from: 'test-phone-id',
      type: 'template',
      wamid: 'wamid.test_status_update',
      status: 'sent',
      meta: { devMode: true }
    });

    await WhatsAppMessage.findOneAndUpdate(
      { wamid: 'wamid.test_status_update' },
      { $set: { status: 'delivered', 'statusTimestamps.delivered': new Date() } }
    );

    const updated = await WhatsAppMessage.findById(msg._id);
    expect(updated.status).toBe('delivered');
    expect(updated.statusTimestamps.delivered).toBeDefined();
  });

  test('stores failed status with error', async () => {
    const msg = await WhatsAppMessage.create({
      direction: 'outbound',
      to: '919999999999',
      from: 'test-phone-id',
      type: 'template',
      wamid: 'wamid.test_fail',
      status: 'failed',
      error: { code: 131026, title: 'Message Undeliverable', message: 'Phone not on WhatsApp' },
      meta: { devMode: true }
    });
    expect(msg.error.code).toBe(131026);
    expect(msg.status).toBe('failed');
  });

  test('creates an inbound log entry', async () => {
    const msg = await WhatsAppMessage.create({
      direction: 'inbound',
      to: '919999999999',
      from: '918888888888',
      type: 'text',
      wamid: 'wamid.test_inbound',
      status: 'delivered',
      meta: { devMode: true, body: 'Hello' }
    });
    expect(msg.direction).toBe('inbound');
    expect(msg.type).toBe('text');
  });

  test('queries by status and direction', async () => {
    const sent = await WhatsAppMessage.find({ to: '919999999999', status: 'sent', direction: 'outbound' });
    expect(sent.length).toBeGreaterThan(0);
    sent.forEach(m => {
      expect(m.status).toBe('sent');
      expect(m.direction).toBe('outbound');
    });
  });
});

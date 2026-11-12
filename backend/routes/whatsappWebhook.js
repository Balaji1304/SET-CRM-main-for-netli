const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const WhatsAppMessage = require('../models/WhatsAppMessage');

// @desc    Webhook for WhatsApp Business API
// @route   POST /api/whatsapp/webhook
// @access  Public (verified by Meta)
router.post('/webhook', (req, res) => {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.error('WhatsApp webhook rejected: WHATSAPP_APP_SECRET is not configured');
    return res.sendStatus(403);
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !req.rawBody) {
    return res.sendStatus(403);
  }

  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
  const receivedBuf = Buffer.from(String(signature), 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (receivedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
    console.warn('WhatsApp webhook rejected: invalid signature');
    return res.sendStatus(403);
  }

  res.status(200).json({ status: 'success' });

  const body = req.body;
  if (body.entry && Array.isArray(body.entry)) {
    body.entry.forEach(entry => {
      if (!entry.changes) return;
      entry.changes.forEach(change => {
        if (change.field !== 'messages') return;
        const value = change.value;

        if (value.statuses) {
          value.statuses.forEach(s => {
            console.log(`Message ${s.id} status: ${s.status}`);
            const statusField = `statusTimestamps.${s.status}`;
            const update = { status: s.status, [statusField]: new Date(s.timestamp * 1000) };
            if (s.status === 'failed' && s.errors?.[0]) {
              update.error = { code: s.errors[0].code, title: s.errors[0].title, message: s.errors[0].message };
            }
            if (s.pricing) {
              update.pricing = { model: s.pricing.pricing_model, category: s.pricing.category };
            }
            WhatsAppMessage.findOneAndUpdate({ wamid: s.id }, { $set: update }).catch(e =>
              console.error('WA status update failed:', e.message)
            );
          });
        }

        if (value.messages) {
          value.messages.forEach(m => {
            console.log('Incoming message:', m.type, 'from', m.from);
            WhatsAppMessage.create({
              wamid: m.id,
              direction: 'inbound',
              to: value.metadata?.display_phone_number || '',
              from: m.from,
              type: m.type || 'text',
              status: 'delivered',
              meta: { body: m.text?.body, timestamp: m.timestamp }
            }).catch(e => console.error('WA inbound log failed:', e.message));
          });
        }
      });
    });
  }
});

// @desc    Verify webhook (for initial setup)
// @route   GET /api/whatsapp/webhook
// @access  Public
router.get('/webhook', (req, res) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (verifyToken && mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified');
    res.status(200).type('text/plain').send(String(challenge || ''));
  } else {
    res.status(403).send('Forbidden');
  }
});

module.exports = router;

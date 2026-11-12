const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const Lead = require('../models/Lead');

const OPT_OUT_KEYWORDS = ['stop', 'unsubscribe', 'opt out', 'optout'];
const OPT_IN_KEYWORDS = ['start', 'subscribe', 'opt in', 'optin'];

const findLeadByPhone = async (phone) => {
  const digits = phone.replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return Lead.findOne({ $or: [{ phone: local }, { whatsapp: local }, { phone: digits }, { whatsapp: digits }] });
};

const handleOptChange = async (phone, optIn) => {
  const lead = await findLeadByPhone(phone);
  if (lead) {
    lead.whatsappOptIn = optIn;
    await lead.save();
    console.log(`WhatsApp ${optIn ? 'opt-in' : 'opt-out'}: ${lead.firstName} (${phone})`);
  }
};

const handleInboundMessage = async (m, displayPhone) => {
  const lead = await findLeadByPhone(m.from);
  const msgDoc = {
    wamid: m.id,
    direction: 'inbound',
    to: displayPhone || '',
    from: m.from,
    type: m.type || 'text',
    status: 'delivered',
    meta: { body: m.text?.body, timestamp: m.timestamp }
  };
  if (lead) {
    msgDoc.lead = lead._id;
    lead.lastInboundAt = new Date();
    await lead.save();
  }
  await WhatsAppMessage.create(msgDoc);
};

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
            handleInboundMessage(m, value.metadata?.display_phone_number).catch(e =>
              console.error('WA inbound log failed:', e.message)
            );

            const body = (m.text?.body || '').trim().toLowerCase();
            if (OPT_OUT_KEYWORDS.includes(body)) {
              handleOptChange(m.from, false).catch(e => console.error('Opt-out failed:', e.message));
            } else if (OPT_IN_KEYWORDS.includes(body)) {
              handleOptChange(m.from, true).catch(e => console.error('Opt-in failed:', e.message));
            }
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

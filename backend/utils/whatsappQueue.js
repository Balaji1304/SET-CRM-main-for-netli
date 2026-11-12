const WhatsAppMessage = require('../models/WhatsAppMessage');

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5000;

const enqueue = async (sendFn, args, meta = {}) => {
  const msg = await WhatsAppMessage.create({
    direction: 'outbound',
    to: args.to || '',
    type: meta.type || 'template',
    templateName: meta.templateName,
    status: 'queued',
    meta: { retries: 0, args: { ...args, to: undefined }, queuedAt: new Date() }
  });

  processMessage(msg._id, sendFn, args, 0).catch(e =>
    console.error('Queue process error:', e.message)
  );

  return msg;
};

const processMessage = async (msgId, sendFn, args, attempt) => {
  try {
    const result = await sendFn(args);
    await WhatsAppMessage.findByIdAndUpdate(msgId, {
      $set: {
        status: 'sent',
        wamid: result.messageId,
        'meta.sentAt': new Date(),
        'meta.retries': attempt
      }
    });
    return result;
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      await WhatsAppMessage.findByIdAndUpdate(msgId, {
        $set: {
          status: 'failed',
          error: { message: error.message },
          'meta.retries': attempt,
          'meta.failedAt': new Date()
        }
      });
      throw error;
    }

    const delay = BASE_DELAY_MS * Math.pow(2, attempt);
    await WhatsAppMessage.findByIdAndUpdate(msgId, {
      $set: { 'meta.retries': attempt + 1, 'meta.nextRetryAt': new Date(Date.now() + delay) }
    });

    await new Promise(r => setTimeout(r, delay));
    return processMessage(msgId, sendFn, args, attempt + 1);
  }
};

module.exports = { enqueue, MAX_RETRIES, BASE_DELAY_MS };

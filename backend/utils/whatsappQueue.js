const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5000;

// Logging stays in the send functions (one WhatsAppMessage row per attempt), so this only retries.
// shortcut: retries live in process memory and are lost on restart; persist a job collection if sends must survive restarts
const sendWithRetry = async (sendFn, args, { retries = MAX_RETRIES, baseDelayMs = BASE_DELAY_MS } = {}) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await sendFn(args);
    } catch (error) {
      if (attempt >= retries) throw error;
      await new Promise(r => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
};

module.exports = { sendWithRetry, MAX_RETRIES, BASE_DELAY_MS };

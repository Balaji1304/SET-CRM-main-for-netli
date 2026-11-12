const axios = require('axios');
jest.mock('axios');
jest.mock('../utils/whatsappTokenManager', () => ({
  getAccessToken: () => 'test-token',
  getValidAccessToken: async () => 'test-token',
  getTokenInfo: async () => null
}));

const fakeTemplates = [
  { name: 'quotation_ready', language: 'en_US', status: 'APPROVED', components: [{ type: 'BODY', text: 'Hello {{1}}, quotation {{2}} is ready.' }] },
  { name: 'invoice_generated', language: 'en_US', status: 'APPROVED', components: [{ type: 'BODY', text: 'Hello {{1}}, invoice {{2}} for {{3}}, due {{4}}.' }] },
  { name: 'account_created', language: 'en_US', status: 'APPROVED', components: [{ type: 'BODY', text: 'Hello {{1}}, username {{2}}, portal {{3}}.' }] }
];

// DEV_MODE off so sendLibraryTemplate actually calls the API path (which is mocked)
// but WABA_ID set so getWhatsAppTemplates doesn't short-circuit
beforeAll(() => {
  delete process.env.WHATSAPP_DEV_MODE;
  process.env.WABA_ID = 'test-waba';
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone';
});

beforeEach(() => {
  axios.get.mockResolvedValue({ data: { data: fakeTemplates } });
  axios.post.mockResolvedValue({ data: { messages: [{ id: 'mock-msg-id' }] } });
});

afterEach(() => jest.clearAllMocks());

const {
  sendQuotationWhatsApp,
  sendInvoiceWhatsApp,
  sendAccountCreatedWhatsApp
} = require('../utils/sendWhatsApp');

describe('template param validation', () => {
  test('quotation_ready succeeds with 2 values', async () => {
    const r = await sendQuotationWhatsApp({ to: '9876543210', customerName: 'Test', quotationNumber: 'Q-001' });
    expect(r.success).toBe(true);
  });

  test('invoice_generated succeeds with 4 values (including dueDate)', async () => {
    const r = await sendInvoiceWhatsApp({ to: '9876543210', customerName: 'Test', invoiceNumber: 'INV-001', amount: '50000', dueDate: '2026-12-01' });
    expect(r.success).toBe(true);
  });

  test('account_created succeeds with 3 values', async () => {
    const r = await sendAccountCreatedWhatsApp({ to: '9876543210', customerName: 'Test', loginUsername: 'test@x.com', loginUrl: 'https://portal.example.com' });
    expect(r.success).toBe(true);
  });

  test('param count mismatch throws TEMPLATE_PARAM_MISMATCH', async () => {
    // Override to return a template with only 2 placeholders for invoice_generated
    axios.get.mockResolvedValue({ data: { data: [
      { name: 'invoice_generated', language: 'en_US', status: 'APPROVED', components: [{ type: 'BODY', text: 'Hello {{1}}, invoice {{2}}.' }] }
    ] } });
    // Clear the template cache so it re-fetches
    const NodeCache = require('node-cache');
    // The module-level cache instance needs flushing — require a fresh module would be complex,
    // so we call getWhatsAppTemplates (exported) which overwrites the cache
    const { getWhatsAppTemplates } = require('../utils/sendWhatsApp');
    await getWhatsAppTemplates();

    await expect(
      sendInvoiceWhatsApp({ to: '9876543210', customerName: 'Test', invoiceNumber: 'INV-001', amount: '50000', dueDate: '2026-12-01' })
    ).rejects.toThrow(/expects 2 parameter.*received 4/);
  });

  test('null/empty values are coerced to dash', async () => {
    // Restore good templates
    axios.get.mockResolvedValue({ data: { data: fakeTemplates } });
    const { getWhatsAppTemplates } = require('../utils/sendWhatsApp');
    await getWhatsAppTemplates();

    const r = await sendInvoiceWhatsApp({ to: '9876543210', customerName: 'Test', invoiceNumber: 'INV-001', amount: '', dueDate: null });
    expect(r.success).toBe(true);
    // Verify the post payload used '-' for empty/null values
    const postCall = axios.post.mock.calls[0];
    const bodyParams = postCall[1].template.components[0].parameters;
    expect(bodyParams[2].text).toBe('-');
    expect(bodyParams[3].text).toBe('-');
  });
});

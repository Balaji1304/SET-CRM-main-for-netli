const axios = require('axios');
jest.mock('axios');
jest.mock('../utils/whatsappTokenManager', () => ({
  getAccessToken: () => 'test-token',
  getValidAccessToken: async () => 'test-token',
  getTokenInfo: async () => null
}));

beforeAll(() => {
  delete process.env.WHATSAPP_DEV_MODE;
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone';
});

const { uploadWhatsAppMedia, sendWhatsAppDocument } = require('../utils/sendWhatsApp');

afterEach(() => jest.clearAllMocks());

describe('uploadWhatsAppMedia', () => {
  test('uploads buffer and returns mediaId', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 'media-123' } });

    const result = await uploadWhatsAppMedia(Buffer.from('fake-pdf'), 'test.pdf');
    expect(result.mediaId).toBe('media-123');
    expect(result.filename).toBe('test.pdf');
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post.mock.calls[0][0]).toMatch(/\/media$/);
  });

  test('accepts custom mimeType', async () => {
    axios.post.mockResolvedValueOnce({ data: { id: 'media-456' } });

    const result = await uploadWhatsAppMedia(Buffer.from('img'), 'photo.png', 'image/png');
    expect(result.mediaId).toBe('media-456');
  });
});

describe('sendWhatsAppDocument with mediaId', () => {
  test('sends document using mediaId instead of link', async () => {
    axios.post.mockResolvedValueOnce({ data: { messages: [{ id: 'msg-456' }] } });

    const result = await sendWhatsAppDocument({
      to: '9876543210',
      mediaId: 'media-123',
      filename: 'test.pdf',
      caption: 'Your document'
    });
    expect(result.success).toBe(true);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.document.id).toBe('media-123');
    expect(payload.document.link).toBeUndefined();
  });

  test('sends document using link when no mediaId', async () => {
    axios.post.mockResolvedValueOnce({ data: { messages: [{ id: 'msg-789' }] } });

    const result = await sendWhatsAppDocument({
      to: '9876543210',
      documentUrl: 'https://example.com/doc.pdf',
      filename: 'doc.pdf'
    });
    expect(result.success).toBe(true);
    const payload = axios.post.mock.calls[0][1];
    expect(payload.document.link).toBe('https://example.com/doc.pdf');
    expect(payload.document.id).toBeUndefined();
  });
});

describe('WhatsApp config (WA-3)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('defaults to v25.0 when WHATSAPP_API_VERSION is not set', () => {
    delete process.env.WHATSAPP_API_VERSION;
    const config = require('../config/whatsapp');
    expect(config.apiVersion).toBe('v25.0');
    expect(config.baseUrl).toBe('https://graph.facebook.com/v25.0');
  });

  test('respects WHATSAPP_API_VERSION env var', () => {
    process.env.WHATSAPP_API_VERSION = 'v22.0';
    const config = require('../config/whatsapp');
    expect(config.apiVersion).toBe('v22.0');
    expect(config.baseUrl).toBe('https://graph.facebook.com/v22.0');
  });

  test('devMode is true only when WHATSAPP_DEV_MODE=true', () => {
    process.env.WHATSAPP_DEV_MODE = 'true';
    const config = require('../config/whatsapp');
    expect(config.devMode).toBe(true);
  });

  test('devMode is false when WHATSAPP_DEV_MODE is not set', () => {
    delete process.env.WHATSAPP_DEV_MODE;
    const config = require('../config/whatsapp');
    expect(config.devMode).toBe(false);
  });

  test('exports all expected keys', () => {
    const config = require('../config/whatsapp');
    const keys = Object.keys(config);
    expect(keys).toEqual(expect.arrayContaining([
      'apiVersion', 'baseUrl', 'phoneNumberId', 'wabaId',
      'accessToken', 'appId', 'appSecret', 'verifyToken',
      'systemUserId', 'devMode'
    ]));
  });

  test('no v19.0 in sendWhatsApp.js source', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../utils/sendWhatsApp.js'), 'utf8');
    expect(src).not.toMatch(/v19\.0/);
  });

  test('no v19.0 in whatsappTokenManager.js source', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../utils/whatsappTokenManager.js'), 'utf8');
    expect(src).not.toMatch(/v19\.0/);
  });
});

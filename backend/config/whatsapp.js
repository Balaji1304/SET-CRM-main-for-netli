const apiVersion = process.env.WHATSAPP_API_VERSION || 'v25.0';
const baseUrl = `https://graph.facebook.com/${apiVersion}`;

module.exports = {
  apiVersion,
  baseUrl,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  wabaId: process.env.WABA_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  appId: process.env.WHATSAPP_APP_ID,
  appSecret: process.env.WHATSAPP_APP_SECRET,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  systemUserId: process.env.WHATSAPP_SYSTEM_USER_ID,
  devMode: process.env.WHATSAPP_DEV_MODE === 'true',
};

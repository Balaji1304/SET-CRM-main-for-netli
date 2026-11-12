const axios = require('axios');
const waConfig = require('../config/whatsapp');

class WhatsAppTokenManager {
  getAccessToken() {
    if (!waConfig.accessToken) {
      throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
    }
    return waConfig.accessToken;
  }

  // Backwards-compatible alias
  async getValidAccessToken() {
    return this.getAccessToken();
  }

  async getTokenInfo() {
    if (!waConfig.appId || !waConfig.appSecret) return null;
    try {
      const token = this.getAccessToken();
      const response = await axios.get(
        `${waConfig.baseUrl}/debug_token?input_token=${token}&access_token=${waConfig.appId}|${waConfig.appSecret}`,
        { timeout: 10000 }
      );
      return response.data.data;
    } catch (error) {
      console.error('Error getting token info:', error.response?.data || error.message);
      return null;
    }
  }
}

module.exports = new WhatsAppTokenManager();

const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for storing token information
const tokenCache = new NodeCache({ stdTTL: 86400 }); // 24 hours cache

class WhatsAppTokenManager {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.appId = process.env.WHATSAPP_APP_ID;
    this.appSecret = process.env.WHATSAPP_APP_SECRET;
    this.systemUserId = process.env.WHATSAPP_SYSTEM_USER_ID;
    this.businessAccountId = process.env.WABA_ID;
  }

  /**
   * Get current access token with validation
   */
  async getValidAccessToken() {
    try {
      // Check if token is still valid
      const isValid = await this.validateToken(this.accessToken);
      
      if (isValid) {
        console.log('Current WhatsApp token is valid');
        return this.accessToken;
      }

      // If token is invalid, try to refresh it
      console.log('WhatsApp token is invalid, attempting to refresh...');
      const newToken = await this.refreshToken();
      
      if (newToken) {
        this.accessToken = newToken;
        return newToken;
      }

      throw new Error('Unable to obtain valid WhatsApp access token');
    } catch (error) {
      console.error('Error getting valid access token:', error.message);
      throw error;
    }
  }

  /**
   * Validate if the current token is still active
   */
  async validateToken(token) {
    try {
      const response = await axios.get(`https://graph.facebook.com/v19.0/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      });

      return response.status === 200 && response.data.id;
    } catch (error) {
      console.error('Token validation failed:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Refresh the access token using app credentials
   */
  async refreshToken() {
    try {
      if (!this.appId || !this.appSecret) {
        throw new Error('App ID and App Secret are required for token refresh');
      }

      // Generate app access token first
      const appTokenResponse = await axios.get(
        `https://graph.facebook.com/oauth/access_token?client_id=${this.appId}&client_secret=${this.appSecret}&grant_type=client_credentials`
      );

      const appAccessToken = appTokenResponse.data.access_token;
      console.log('Generated app access token');

      // If we have a system user, generate token for system user
      if (this.systemUserId) {
        console.log(`Generating system user token for user: ${this.systemUserId}`);
        
        const systemUserTokenResponse = await axios.post(
          `https://graph.facebook.com/v19.0/${this.systemUserId}/access_tokens`,
          {
            business_app: this.appId,
            scope: ['whatsapp_business_messaging', 'whatsapp_business_management']
          },
          {
            headers: {
              'Authorization': `Bearer ${appAccessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const newToken = systemUserTokenResponse.data.access_token;
        console.log('Successfully refreshed WhatsApp token via system user');
        
        // Cache the new token
        tokenCache.set('whatsapp_token', newToken);
        
        // Update the instance variable
        this.accessToken = newToken;
        
        return newToken;
      }

      // Fallback: Try to generate a long-lived token using the WABA
      if (this.businessAccountId) {
        console.log('Attempting to generate token via WABA');
        
        try {
          const wabaTokenResponse = await axios.post(
            `https://graph.facebook.com/v19.0/${this.businessAccountId}/access_tokens`,
            {
              scope: 'whatsapp_business_messaging,whatsapp_business_management'
            },
            {
              headers: {
                'Authorization': `Bearer ${appAccessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          const newToken = wabaTokenResponse.data.access_token;
          console.log('Successfully generated token via WABA');
          
          tokenCache.set('whatsapp_token', newToken);
          this.accessToken = newToken;
          
          return newToken;
        } catch (wabaError) {
          console.log('WABA token generation failed, using app token as fallback');
        }
      }

      // Final fallback: Use app access token (temporary solution)
      console.log('Using app access token as fallback');
      tokenCache.set('whatsapp_token', appAccessToken);
      this.accessToken = appAccessToken;
      return appAccessToken;

    } catch (error) {
      console.error('Token refresh failed:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get token information and expiry
   */
  async getTokenInfo(token) {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v19.0/debug_token?input_token=${token}&access_token=${this.appId}|${this.appSecret}`
      );

      return response.data.data;
    } catch (error) {
      console.error('Error getting token info:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Setup automatic token refresh
   */
  setupAutoRefresh() {
    // Check token validity every hour
    setInterval(async () => {
      try {
        const isValid = await this.validateToken(this.accessToken);
        if (!isValid) {
          console.log('Auto-refresh: Token invalid, refreshing...');
          const newToken = await this.refreshToken();
          if (newToken) {
            this.accessToken = newToken;
            // Update environment variable if needed
            process.env.WHATSAPP_ACCESS_TOKEN = newToken;
            console.log('Auto-refresh: Token successfully refreshed');
          }
        }
      } catch (error) {
        console.error('Auto-refresh error:', error.message);
      }
    }, 3600000); // Check every hour (3600000 ms)
  }

  /**
   * Handle webhook events related to tokens
   */
  handleTokenWebhook(webhookData) {
    const { entry } = webhookData;
    
    if (!entry || !Array.isArray(entry)) return;

    entry.forEach(entryItem => {
      if (entryItem.changes) {
        entryItem.changes.forEach(change => {
          if (change.field === 'whatsapp_business_account') {
            const value = change.value;
            
            // Handle different webhook events
            if (value.errors) {
              value.errors.forEach(error => {
                if (error.code === 190 || error.error_subcode === 463) {
                  console.error('Token error detected via webhook:', error);
                  // Trigger token refresh
                  this.refreshToken().then(newToken => {
                    if (newToken) {
                      this.accessToken = newToken;
                      console.log('Token refreshed due to webhook error');
                    }
                  });
                }
              });
            }
          }
        });
      }
    });
  }
}

module.exports = new WhatsAppTokenManager();

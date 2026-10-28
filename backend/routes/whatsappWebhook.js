const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const tokenManager = require('../utils/whatsappTokenManager');
const { protect, authorize } = require('../middleware/auth');

// @desc    Webhook for WhatsApp Business API
// @route   POST /api/whatsapp/webhook
// @access  Public (verified by Meta)
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    // Verify Meta's X-Hub-Signature-256 (HMAC-SHA256 of the raw body with the app secret)
    const signature = req.headers['x-hub-signature-256'];
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!appSecret) {
      console.error('WhatsApp webhook rejected: WHATSAPP_APP_SECRET is not configured');
      return res.sendStatus(403);
    }
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

    // Handle webhook verification (Meta sends this during setup)
    if (verifyToken && req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
      console.log('WhatsApp webhook verified successfully');
      return res.status(200).type('text/plain').send(String(req.query['hub.challenge'] || ''));
    }
    
    // Process incoming messages and status updates
    if (body.entry && Array.isArray(body.entry)) {
      body.entry.forEach(entry => {
        // Handle message status updates
        if (entry.changes) {
          entry.changes.forEach(change => {
            if (change.field === 'messages') {
              const value = change.value;
              
              // Handle message status updates
              if (value.statuses) {
                value.statuses.forEach(status => {
                  console.log(`Message ${status.id} status: ${status.status}`);
                  // You can update your database here with delivery status
                });
              }
              
              // Handle incoming messages (for future chatbot functionality)
              if (value.messages) {
                value.messages.forEach(message => {
                  console.log('Incoming message:', message);
                  // Handle incoming messages if needed
                });
              }
              
              // Handle token-related errors
              if (value.errors) {
                tokenManager.handleTokenWebhook(body);
              }
            }
          });
        }
      });
    }
    
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
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
    // Plain text so the echoed challenge can never be rendered as HTML
    res.status(200).type('text/plain').send(String(challenge || ''));
  } else {
    res.status(403).send('Forbidden');
  }
});

// @desc    Test WhatsApp configuration (Public for development)
// @route   GET /api/whatsapp/test-config
// @access  Public (in development mode)
router.get('/test-config', protect, authorize('admin'), async (req, res) => {
  try {
    // Test token validity
    const validToken = await tokenManager.getValidAccessToken();
    const tokenInfo = await tokenManager.getTokenInfo(validToken);
    
    res.json({
      success: true,
      message: 'WhatsApp configuration is valid',
      data: {
        tokenValid: !!validToken,
        tokenInfo: tokenInfo,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 
          `${process.env.WHATSAPP_PHONE_NUMBER_ID.substring(0, 8)}...` : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing WhatsApp configuration',
      error: error.message
    });
  }
});

// @desc    Get WhatsApp integration status (Public for development)
// @route   GET /api/whatsapp/status
// @access  Public (in development mode)
router.get('/status', protect, authorize('admin'), async (req, res) => {
  try {
    const hasAccessToken = !!process.env.WHATSAPP_ACCESS_TOKEN;
    const hasPhoneNumberId = !!process.env.WHATSAPP_PHONE_NUMBER_ID;
    const hasWabaId = !!process.env.WABA_ID;
    const hasAppCredentials = !!(process.env.WHATSAPP_APP_ID && process.env.WHATSAPP_APP_SECRET);
    
    let tokenValid = false;
    try {
      const validToken = await tokenManager.getValidAccessToken();
      tokenValid = !!validToken;
    } catch (error) {
      console.log('Token validation failed in status check:', error.message);
    }
    
    const isConfigured = hasPhoneNumberId && tokenValid;
    
    res.json({
      success: true,
      data: {
        isConfigured,
        hasAccessToken,
        hasPhoneNumberId,
        hasWabaId,
        hasAppCredentials,
        tokenValid,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 
          `${process.env.WHATSAPP_PHONE_NUMBER_ID.substring(0, 8)}...` : null,
        configurationSteps: {
          step1: 'Create WhatsApp Business Account and App',
          step2: 'Generate permanent access token (System User recommended)',
          step3: 'Get phone number ID from Meta Business',
          step4: 'Add environment variables to .env file',
          step5: 'Create and approve message templates',
          step6: 'Setup webhook endpoint for status updates'
        },
        webhookInfo: {
          url: `${process.env.BACKEND_URL || 'your-backend-url'}/api/whatsapp/webhook`,
          verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ? 'Configured' : 'Not set'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking WhatsApp status',
      error: error.message
    });
  }
});

// @desc    Refresh WhatsApp token manually
// @route   POST /api/whatsapp/refresh-token
// @access  Private (admin only)
router.post('/refresh-token', protect, authorize('admin'), async (req, res) => {
  try {
    const newToken = await tokenManager.refreshToken();
    
    if (newToken) {
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        tokenPreview: `${newToken.substring(0, 20)}...`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error refreshing token',
      error: error.message
    });
  }
});

module.exports = router;

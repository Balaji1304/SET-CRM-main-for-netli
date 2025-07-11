const express = require('express');
const router = express.Router();
const { testWhatsAppConfig } = require('../utils/sendWhatsApp');
const { protect, authorize } = require('../middleware/auth');

// @desc    Test WhatsApp configuration (Public for development)
// @route   GET /api/whatsapp/test-config
// @access  Public (in development mode)
router.get('/test-config', async (req, res) => {
  try {
    const testResult = await testWhatsAppConfig();
    
    res.json({
      success: testResult.success,
      message: testResult.success ? 'WhatsApp configuration is valid' : 'WhatsApp configuration failed',
      data: testResult
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
router.get('/status', async (req, res) => {
  try {
    const hasAccessToken = !!process.env.WHATSAPP_ACCESS_TOKEN;
    const hasPhoneNumberId = !!process.env.WHATSAPP_PHONE_NUMBER_ID;
    const hasWabaId = !!process.env.WABA_ID;
    
    const isConfigured = hasAccessToken && hasPhoneNumberId;
    
    res.json({
      success: true,
      data: {
        isConfigured,
        hasAccessToken,
        hasPhoneNumberId,
        hasWabaId,
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ? 
          `${process.env.WHATSAPP_PHONE_NUMBER_ID.substring(0, 8)}...` : null,
        configurationSteps: {
          step1: 'Create WhatsApp Business Account',
          step2: 'Generate permanent access token',
          step3: 'Get phone number ID from Meta Business',
          step4: 'Add environment variables to .env file',
          step5: 'Create and approve message templates'
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

module.exports = router; 
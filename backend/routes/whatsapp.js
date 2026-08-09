const express = require('express');
const router = express.Router();
const { testWhatsAppConfig, getWhatsAppTemplates, createWhatsAppTemplate } = require('../utils/sendWhatsApp');
const { protect, authorize } = require('../middleware/auth');

// @desc    List message templates from the WhatsApp template library
// @route   GET /api/whatsapp/templates
// @access  Private
router.get('/templates', protect, authorize('admin'), async (req, res) => {
  try {
    const templates = await getWhatsAppTemplates();

    const formatted = templates.map((t) => ({
      name: t.name,
      status: t.status,
      category: t.category,
      language: t.language,
      components: t.components
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch WhatsApp template library',
      error: error.message
    });
  }
});

// @desc    Create a message template in the WhatsApp template library
// @route   POST /api/whatsapp/templates
// @access  Private (admin only)
router.post('/templates', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, language, category, components, allowCategoryChange } = req.body;

    if (!name || !components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Template name and components array are required'
      });
    }

    const result = await createWhatsAppTemplate({
      name,
      language: language || 'en_US',
      category: category || 'UTILITY',
      components,
      allowCategoryChange: allowCategoryChange ?? true
    });

    res.status(201).json({
      success: true,
      message: `WhatsApp template "${name}" submitted for approval`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create WhatsApp template',
      error: error.response?.data?.error?.message || error.message
    });
  }
});

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
const express = require('express');
const router = express.Router();
const waConfig = require('../config/whatsapp');
const { testWhatsAppConfig, getWhatsAppTemplates, createWhatsAppTemplate } = require('../utils/sendWhatsApp');
const WhatsAppMessage = require('../models/WhatsAppMessage');
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
router.get('/test-config', protect, authorize('admin'), async (req, res) => {
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
router.get('/status', protect, authorize('admin'), async (req, res) => {
  try {
    const hasAccessToken = !!waConfig.accessToken;
    const hasPhoneNumberId = !!waConfig.phoneNumberId;
    const hasWabaId = !!waConfig.wabaId;

    const isConfigured = hasAccessToken && hasPhoneNumberId;

    res.json({
      success: true,
      data: {
        isConfigured,
        hasAccessToken,
        hasPhoneNumberId,
        hasWabaId,
        phoneNumberId: waConfig.phoneNumberId ?
          `${waConfig.phoneNumberId.substring(0, 8)}...` : null,
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

// @desc    Get WhatsApp message logs
// @route   GET /api/whatsapp/messages
// @access  Private (admin only)
router.get('/messages', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, direction, templateName, phone, from, to } = req.query;
    const query = {};
    if (status) query.status = status;
    if (direction) query.direction = direction;
    if (templateName) query.templateName = templateName;
    if (phone) query.$or = [{ to: { $regex: phone } }, { from: { $regex: phone } }];
    if (from) query.createdAt = { ...query.createdAt, $gte: new Date(from) };
    if (to) query.createdAt = { ...query.createdAt, $lte: new Date(to) };

    const [messages, total] = await Promise.all([
      WhatsAppMessage.find(query).sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit)).lean(),
      WhatsAppMessage.countDocuments(query)
    ]);

    res.json({ success: true, data: messages, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch message logs', error: error.message });
  }
});

// @desc    Get WhatsApp message stats (counts by status, per day)
// @route   GET /api/whatsapp/messages/stats
// @access  Private (admin only)
router.get('/messages/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const days = Number(req.query.days) || 7;
    const since = new Date(Date.now() - days * 86400000);

    const [byStatus, byDay] = await Promise.all([
      WhatsAppMessage.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      WhatsAppMessage.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({ success: true, data: { byStatus, byDay } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
});

module.exports = router; 
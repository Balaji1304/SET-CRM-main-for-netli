const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { 
  sendDailyInstallationReminders, 
  sendUrgentCustomerContactNotification,
  testEngineerWhatsApp 
} = require('../utils/installationReminders');
const User = require('../models/User');
const { AppError, errorHandler } = require('../utils/errorHandler');

// @desc    Test WhatsApp notification for a specific engineer
// @route   POST /api/whatsapp-test/engineer/:engineerId
// @access  Private (Product Head)
router.post('/engineer/:engineerId', protect, authorize('product_head'), async (req, res) => {
  try {
    const { message } = req.body;
    const result = await testEngineerWhatsApp(req.params.engineerId, message);
    
    res.status(200).json({
      success: true,
      message: 'Test WhatsApp notification sent',
      data: result
    });
  } catch (error) {
    errorHandler(res, error);
  }
});

// @desc    Send daily installation reminders manually
// @route   POST /api/whatsapp-test/daily-reminders
// @access  Private (Product Head)
router.post('/daily-reminders', protect, authorize('product_head'), async (req, res) => {
  try {
    const result = await sendDailyInstallationReminders();
    
    res.status(200).json({
      success: true,
      message: 'Daily reminders process completed',
      data: result
    });
  } catch (error) {
    errorHandler(res, error);
  }
});

// @desc    Send urgent customer contact notification
// @route   POST /api/whatsapp-test/urgent-contact/:purchaseId
// @access  Private (Product Head, Front Office Executive)
router.post('/urgent-contact/:purchaseId', protect, authorize(['product_head', 'front_office_executive']), async (req, res) => {
  try {
    const { customerMessage } = req.body;
    const result = await sendUrgentCustomerContactNotification(req.params.purchaseId, customerMessage);
    
    res.status(200).json({
      success: true,
      message: 'Urgent contact notification sent',
      data: result
    });
  } catch (error) {
    errorHandler(res, error);
  }
});

// @desc    Get all service engineers with their WhatsApp status
// @route   GET /api/whatsapp-test/engineers
// @access  Private (Product Head)
router.get('/engineers', protect, authorize('product_head'), async (req, res) => {
  try {
    const engineers = await User.find({ role: 'service_engineer' })
      .select('name email phone whatsapp countryCode notificationPreferences createdAt')
      .sort({ name: 1 });

    const engineersWithStatus = engineers.map(engineer => ({
      ...engineer.toObject(),
      whatsappConfigured: !!(engineer.phone || engineer.whatsapp),
      whatsappEnabled: engineer.notificationPreferences?.whatsappEnabled !== false
    }));

    res.status(200).json({
      success: true,
      count: engineersWithStatus.length,
      data: engineersWithStatus
    });
  } catch (error) {
    errorHandler(res, error);
  }
});

// @desc    Update engineer's WhatsApp notification preferences
// @route   PUT /api/whatsapp-test/engineer/:engineerId/preferences
// @access  Private (Product Head)
router.put('/engineer/:engineerId/preferences', protect, authorize('product_head'), async (req, res) => {
  try {
    const { whatsappEnabled, phone, whatsapp, countryCode } = req.body;
    
    const engineer = await User.findById(req.params.engineerId);
    if (!engineer) {
      throw new AppError('Engineer not found', 404);
    }

    if (engineer.role !== 'service_engineer') {
      throw new AppError('User is not a service engineer', 400);
    }

    // Update contact information
    if (phone !== undefined) engineer.phone = phone;
    if (whatsapp !== undefined) engineer.whatsapp = whatsapp;
    if (countryCode !== undefined) engineer.countryCode = countryCode;

    // Update notification preferences
    if (!engineer.notificationPreferences) {
      engineer.notificationPreferences = {};
    }
    if (whatsappEnabled !== undefined) {
      engineer.notificationPreferences.whatsappEnabled = whatsappEnabled;
    }

    await engineer.save();

    res.status(200).json({
      success: true,
      message: 'Engineer preferences updated successfully',
      data: {
        id: engineer._id,
        name: engineer.name,
        phone: engineer.phone,
        whatsapp: engineer.whatsapp,
        countryCode: engineer.countryCode,
        notificationPreferences: engineer.notificationPreferences
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
});

module.exports = router;


const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const SystemSettings = require('../models/SystemSettings');

router.use(protect);

router.get('/', authorize(['admin']), async (req, res) => {
  try {
    const settings = await SystemSettings.get();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/', authorize(['admin']), async (req, res) => {
  try {
    const { gatewayChargeMode, gatewayChargePercent, gatewayChargeGstPercent } = req.body;
    const updates = {};
    if (gatewayChargeMode !== undefined) updates.gatewayChargeMode = gatewayChargeMode;
    if (gatewayChargePercent !== undefined) updates.gatewayChargePercent = gatewayChargePercent;
    if (gatewayChargeGstPercent !== undefined) updates.gatewayChargeGstPercent = gatewayChargeGstPercent;

    const settings = await SystemSettings.set(updates, req.user.id);
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;

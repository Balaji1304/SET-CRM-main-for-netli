const OrderTracking = require('../models/OrderTracking');
const CustomerPurchase = require('../models/CustomerPurchase');
const User = require('../models/User');
const { errorHandler, AppError } = require('../utils/errorHandler');
const NotificationService = require('../utils/notificationService');

// @desc    Create initial tracking record for a purchase
// @route   POST /api/tracking/create
// @access  Private (Internal system use)
exports.createTrackingRecord = async (req, res) => {
  try {
    const { purchaseId, initialStatus = 'order_placed' } = req.body;

    // Check if tracking already exists
    const existingTracking = await OrderTracking.findOne({ purchaseId });
    if (existingTracking) {
      return res.status(400).json({
        success: false,
        error: 'Tracking record already exists for this purchase'
      });
    }

    // Generate tracking number
    const trackingNumber = await OrderTracking.generateTrackingNumber();

    // Create tracking record
    const tracking = new OrderTracking({
      purchaseId,
      trackingNumber,
      currentStatus: initialStatus
    });

    // Add initial event
    await tracking.addEvent({
      status: initialStatus,
      title: 'Order Placed',
      description: 'Your order has been successfully placed and is being processed.',
      isVisible: true
    }, req.user._id);

    res.status(201).json({
      success: true,
      data: tracking
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get tracking details for customer
// @route   GET /api/tracking/customer/:purchaseId
// @access  Private (Customer)
exports.getCustomerTracking = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    // Find purchase and verify ownership
    const purchase = await CustomerPurchase.findById(purchaseId);
    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    // For customers, verify they own this purchase
    if (req.user.role === 'customer') {
      const Customer = require('../models/Customer');
      const customer = await Customer.findOne({ user: req.user._id });
      if (!customer) {
        throw new AppError('Customer record not found', 404);
      }
      if (purchase.customerId.toString() !== customer._id.toString()) {
        throw new AppError('Access denied', 403);
      }
    }

    const tracking = await OrderTracking.findOne({ purchaseId })
      .populate('events.updatedBy', 'name role')
      .populate('installationDetails.assignedEngineerId', 'name phone email')
      .populate('customerNotes.addedBy', 'name role');

    if (!tracking) {
      throw new AppError('Tracking information not found', 404);
    }

    // Filter events for customer visibility
    const customerTracking = {
      ...tracking.toObject(),
      events: tracking.customerEvents,
      customerNotes: tracking.customerNotes.filter(note => !note.isInternal)
    };

    res.status(200).json({
      success: true,
      data: customerTracking
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get all tracking details (internal)
// @route   GET /api/tracking/internal/:purchaseId
// @access  Private (Staff only)
exports.getInternalTracking = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const tracking = await OrderTracking.findOne({ purchaseId })
      .populate('events.updatedBy', 'name role')
      .populate('installationDetails.assignedEngineerId', 'name phone email')
      .populate('customerNotes.addedBy', 'name role')
      .populate('purchaseId', 'purchaseID customerId totalAmount');

    if (!tracking) {
      throw new AppError('Tracking information not found', 404);
    }

    res.status(200).json({
      success: true,
      data: tracking
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Update tracking status
// @route   PUT /api/tracking/:purchaseId/status
// @access  Private (Staff only)
exports.updateTrackingStatus = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { status, title, description, location, metadata, estimatedDate, isVisible = true } = req.body;

    const tracking = await OrderTracking.findOne({ purchaseId });
    if (!tracking) {
      throw new AppError('Tracking record not found', 404);
    }

    // Add new tracking event
    await tracking.addEvent({
      status,
      title,
      description,
      location,
      metadata,
      estimatedDate,
      isVisible
    }, req.user._id);

    // Send notification to customer if event is visible
    if (isVisible) {
      const purchase = await CustomerPurchase.findById(purchaseId).populate('customerId');
      if (purchase && purchase.customerId) {
        await NotificationService.createNotification({
          recipient: purchase.customerId._id,
          sender: req.user._id,
          title: `Order Update: ${title}`,
          message: description,
          type: 'order_update',
          priority: 'medium',
          data: {
            purchaseId: purchaseId,
            trackingNumber: tracking.trackingNumber,
            status: status
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      data: tracking
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Update shipping details
// @route   PUT /api/tracking/:purchaseId/shipping
// @access  Private (Staff only)
exports.updateShippingDetails = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { carrier, trackingId, shippedDate } = req.body;

    const tracking = await OrderTracking.findOne({ purchaseId });
    if (!tracking) {
      throw new AppError('Tracking record not found', 404);
    }

    // Update shipping details
    tracking.shippingDetails = {
      carrier,
      trackingId,
      shippedDate: shippedDate ? new Date(shippedDate) : new Date()
    };

    // Add shipping event
    await tracking.addEvent({
      status: 'dispatched',
      title: 'Order Dispatched',
      description: `Your order has been dispatched via ${carrier}. Tracking ID: ${trackingId}`,
      metadata: { carrier, trackingId },
      isVisible: true
    }, req.user._id);

    res.status(200).json({
      success: true,
      data: tracking
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Update installation details
// @route   PUT /api/tracking/:purchaseId/installation
// @access  Private (Staff only)
exports.updateInstallationDetails = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { assignedEngineerId, scheduledDate, notes } = req.body;

    const tracking = await OrderTracking.findOne({ purchaseId });
    if (!tracking) {
      throw new AppError('Tracking record not found', 404);
    }

    // Update installation details
    tracking.installationDetails = {
      assignedEngineerId,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      notes
    };

    // Get engineer details
    const engineer = await User.findById(assignedEngineerId);

    // Add installation scheduled event
    await tracking.addEvent({
      status: 'installation_scheduled',
      title: 'Installation Scheduled',
      description: `Installation has been scheduled${scheduledDate ? ` for ${new Date(scheduledDate).toLocaleDateString()}` : ''}${engineer ? ` with ${engineer.name}` : ''}.`,
      metadata: { engineerId: assignedEngineerId, engineerName: engineer?.name },
      estimatedDate: scheduledDate ? new Date(scheduledDate) : null,
      isVisible: true
    }, req.user._id);

    res.status(200).json({
      success: true,
      data: tracking
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Add customer note
// @route   POST /api/tracking/:purchaseId/notes
// @access  Private (Customer and Staff)
exports.addCustomerNote = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { note, isInternal = false } = req.body;

    // Only staff can add internal notes
    if (isInternal && req.user.role === 'customer') {
      throw new AppError('Access denied', 403);
    }

    const tracking = await OrderTracking.findOne({ purchaseId });
    if (!tracking) {
      throw new AppError('Tracking record not found', 404);
    }

    // For customers, verify they own this purchase
    if (req.user.role === 'customer') {
      const purchase = await CustomerPurchase.findById(purchaseId);
      const Customer = require('../models/Customer');
      const customer = await Customer.findOne({ user: req.user._id });
      if (!customer) {
        throw new AppError('Customer record not found', 404);
      }
      if (purchase.customerId.toString() !== customer._id.toString()) {
        throw new AppError('Access denied', 403);
      }
    }

    tracking.customerNotes.push({
      note,
      addedBy: req.user._id,
      isInternal
    });

    await tracking.save();

    res.status(200).json({
      success: true,
      data: tracking
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get tracking summary for dashboard
// @route   GET /api/tracking/summary
// @access  Private (Staff only)
exports.getTrackingSummary = async (req, res) => {
  try {
    const summary = await OrderTracking.aggregate([
      {
        $group: {
          _id: '$currentPhase',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusSummary = await OrderTracking.aggregate([
      {
        $group: {
          _id: '$currentStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byPhase: summary,
        byStatus: statusSummary
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get customer's order tracking list
// @route   GET /api/tracking/my-orders
// @access  Private (Customer only)
exports.getMyOrderTracking = async (req, res) => {
  try {
    let customerId;
    
    if (req.user.role === 'customer') {
      // For customer users, find the Customer record associated with this user
      const Customer = require('../models/Customer');
      const customer = await Customer.findOne({ user: req.user._id });
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer record not found'
        });
      }
      customerId = customer._id;
    } else {
      // For other roles, use the user ID directly (shouldn't reach here due to auth)
      customerId = req.user._id;
    }

    // Get customer purchases
    const purchases = await CustomerPurchase.find({ customerId }).select('_id purchaseID totalAmount createdAt');
    const purchaseIds = purchases.map(p => p._id);

    // Ensure tracking records exist for all purchases (auto-backfill)
    const existingTrackings = await OrderTracking.find({ purchaseId: { $in: purchaseIds } }).select('purchaseId');
    const existingIds = new Set(existingTrackings.map(t => String(t.purchaseId)));
    const missingPurchaseIds = purchaseIds.filter(id => !existingIds.has(String(id)));

    if (missingPurchaseIds.length > 0) {
      const now = new Date();
      const toCreate = await Promise.all(missingPurchaseIds.map(async (pid) => {
        const trackingNumber = await OrderTracking.generateTrackingNumber();
        const tracking = new OrderTracking({
          purchaseId: pid,
          trackingNumber,
          currentStatus: 'order_placed',
          currentPhase: 'processing',
          progressPercentage: 5
        });
        await tracking.addEvent({
          status: 'order_placed',
          title: 'Order Placed',
          description: 'Your order has been created and is being processed.',
          isVisible: true,
          estimatedDate: null,
          metadata: { source: 'auto_backfill', createdAt: now }
        }, req.user._id);
        return tracking;
      }));
      // Optionally log count; avoided to keep logs clean
    }

    // Get tracking records for customer purchases (after backfill)
    const trackingRecords = await OrderTracking.find({ purchaseId: { $in: purchaseIds } })
      .populate('purchaseId', 'purchaseID totalAmount createdAt')
      .select('purchaseId trackingNumber currentStatus currentPhase progressPercentage estimatedDelivery estimatedInstallation milestones createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: trackingRecords
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Update estimated dates
// @route   PUT /api/tracking/:purchaseId/estimates
// @access  Private (Staff only)
exports.updateEstimatedDates = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { estimatedDelivery, estimatedInstallation } = req.body;

    const tracking = await OrderTracking.findOne({ purchaseId });
    if (!tracking) {
      throw new AppError('Tracking record not found', 404);
    }

    await tracking.updateEstimates({
      delivery: estimatedDelivery,
      installation: estimatedInstallation
    });

    res.status(200).json({
      success: true,
      data: tracking
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

module.exports = {
  createTrackingRecord: exports.createTrackingRecord,
  getCustomerTracking: exports.getCustomerTracking,
  getInternalTracking: exports.getInternalTracking,
  updateTrackingStatus: exports.updateTrackingStatus,
  updateShippingDetails: exports.updateShippingDetails,
  updateInstallationDetails: exports.updateInstallationDetails,
  addCustomerNote: exports.addCustomerNote,
  getTrackingSummary: exports.getTrackingSummary,
  getMyOrderTracking: exports.getMyOrderTracking,
  updateEstimatedDates: exports.updateEstimatedDates
};

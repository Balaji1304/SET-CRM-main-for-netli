const CustomerPurchase = require('../models/CustomerPurchase');
const OrderTracking = require('../models/OrderTracking');
const User = require('../models/User');
const { AppError, errorHandler } = require('../utils/errorHandler');
const NotificationService = require('../utils/notificationService');
const { updateCustomerStatus } = require('./customerPurchaseController');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError('Only image files are allowed', 400), false);
    }
  }
});

// @desc    Get assigned installations for service engineer
// @route   GET /api/installations/my-assignments
// @access  Private (Service Engineer)
exports.getMyAssignments = async (req, res) => {
  try {
    const assignments = await CustomerPurchase.find({
      assignedEngineerId: req.user._id,
      serviceTaskStatus: { $in: ['assigned', 'ready_to_dispatch', 'installation_date_allocated'] },
      installationStatus: { $ne: 'completed' }
    })
    .populate('customerId', 'firstName lastName email phone address')
    .populate('quotationId', 'quotationNumber')
    .populate('assignedEngineerId', 'name email')
    .sort({ installationDate: 1 }); // Earliest first

    // Enhance with quotation items for context
    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const QuotationItem = require('../models/QuotationItem');
        let quotationItems = [];
        
        if (assignment.quotationId && assignment.quotationId._id) {
          quotationItems = await QuotationItem.find({ 
            quotationId: assignment.quotationId._id 
          }).populate('productId', 'name modelNumber category');
        }
        
        const assignmentObj = assignment.toObject();
        assignmentObj.products = quotationItems.map(item => ({
          name: item.productId?.name || 'Unknown',
          modelNumber: item.productId?.modelNumber || '',
          category: item.productId?.category || '',
          quantity: item.quantity
        }));
        
        return assignmentObj;
      })
    );

    res.status(200).json({
      success: true,
      count: assignmentsWithDetails.length,
      data: assignmentsWithDetails
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Accept installation assignment
// @route   PUT /api/installations/:purchaseId/accept
// @access  Private (Service Engineer)
exports.acceptAssignment = async (req, res) => {
  try {
    const { estimatedArrival, notes } = req.body;
    
    const purchase = await CustomerPurchase.findOne({
      _id: req.params.purchaseId,
      assignedEngineerId: req.user._id
    }).populate('customerId', 'firstName lastName email');

    if (!purchase) {
      throw new AppError('Assignment not found or not assigned to you', 404);
    }

    if (purchase.installationStatus !== 'assigned') {
      throw new AppError('Assignment already accepted or in different status', 400);
    }

    // Update purchase record
    purchase.installationStatus = 'accepted';
    purchase.engineerAcceptedAt = new Date();
    purchase.estimatedArrival = estimatedArrival ? new Date(estimatedArrival) : null;
    if (notes) {
      purchase.serviceAssignmentNotes = (purchase.serviceAssignmentNotes || '') + `\n[Engineer Notes]: ${notes}`;
    }
    
    await purchase.save();

    // Update tracking
    try {
      const tracking = await OrderTracking.findOne({ purchaseId: purchase._id });
      if (tracking) {
        await tracking.addEvent({
          status: 'engineer_assigned',
          title: 'Engineer Confirmed Assignment',
          description: `Service engineer ${req.user.name} has accepted the installation assignment.${estimatedArrival ? ` Estimated arrival: ${new Date(estimatedArrival).toLocaleString()}` : ''}`,
          estimatedDate: estimatedArrival ? new Date(estimatedArrival) : null,
          isVisible: true
        }, req.user._id);
      }
    } catch (trackingError) {
      console.error('Error updating tracking:', trackingError);
    }

    // Notify customer and management
    try {
      await NotificationService.createInstallationNotification('assignment_accepted', purchase, req.user);
    } catch (notificationError) {
      console.error('Failed to create assignment acceptance notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Assignment accepted successfully',
      data: purchase
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Start work on installation (simplified workflow)
// @route   PUT /api/installations/:purchaseId/start-work
// @access  Private (Service Engineer)
exports.startWork = async (req, res) => {
  try {
    const { notes } = req.body;

    const purchase = await CustomerPurchase.findOne({
      _id: req.params.purchaseId,
      assignedEngineerId: req.user._id
    }).populate('customerId', 'firstName lastName email');

    if (!purchase) {
      throw new AppError('Assignment not found or not assigned to you', 404);
    }

    if (purchase.installationStatus !== 'accepted') {
      throw new AppError('Assignment must be accepted before starting work', 400);
    }

    // Update purchase record
    purchase.installationStatus = 'in_progress';
    purchase.workStartedAt = new Date();

    if (notes) {
      purchase.serviceAssignmentNotes = (purchase.serviceAssignmentNotes || '') + `\n[WORK STARTED]: ${notes}`;
    }

    await purchase.save();

    // Add tracking event
    try {
      const tracking = await OrderTracking.findOne({ purchaseId: purchase._id });
      if (tracking) {
        await tracking.addEvent({
          status: 'installation_in_progress',
          title: 'Installation Work Started',
          description: 'Installation work has begun' + (notes ? `. Notes: ${notes}` : ''),
          location: null,
          isVisible: true
        }, req.user._id);
      }
    } catch (trackingError) {
      console.error('Error updating tracking:', trackingError);
    }

    // Send notification
    try {
      await NotificationService.createInstallationNotification('installation_started', purchase, req.user);
    } catch (notificationError) {
      console.error('Failed to create work started notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Work started successfully',
      data: purchase
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Upload completion photos and complete installation
// @route   POST /api/installations/:purchaseId/complete
// @access  Private (Service Engineer)
exports.completeInstallation = async (req, res) => {
  try {
    const { notes, issuesEncountered } = req.body;
    
    const purchase = await CustomerPurchase.findOne({
      _id: req.params.purchaseId,
      assignedEngineerId: req.user._id
    }).populate('customerId', 'firstName lastName email phone address businessName');

    if (!purchase) {
      throw new AppError('Assignment not found or not assigned to you', 404);
    }

    if (purchase.installationStatus !== 'in_progress') {
      throw new AppError('Installation must be in progress to complete', 400);
    }

    // Ensure assignment is consistent with the current engineer (handles legacy/migrated records)
    // Always set the assigned engineer to the engineer completing the job
    purchase.assignedEngineerId = req.user._id;

    // Check if completion photos are uploaded
    if (!req.files || req.files.length === 0) {
      throw new AppError('At least one completion photo is required', 400);
    }

    // Upload photos to Cloudinary
    const photoUrls = [];
    for (const file of req.files) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'installation-completion',
              resource_type: 'image',
              transformation: [
                { width: 800, height: 600, crop: 'limit' },
                { quality: 'auto' },
                { format: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(file.buffer);
        });
        
        photoUrls.push(result.secure_url);
      } catch (uploadError) {
        console.error('Error uploading photo:', uploadError);
        throw new AppError('Failed to upload completion photos', 500);
      }
    }

    // Update purchase record - Simplified workflow: completion form marks as completed
    purchase.installationStatus = 'completed';
    purchase.workCompletedAt = new Date();
    purchase.completionPhotos = photoUrls;
    
    if (notes) {
      purchase.serviceAssignmentNotes = (purchase.serviceAssignmentNotes || '') + `\n[Completion Notes]: ${notes}`;
    }

    // Handle any issues reported
    if (issuesEncountered && issuesEncountered.trim()) {
      purchase.issuesReported.push({
        description: issuesEncountered,
        reportedBy: req.user._id,
        reportedAt: new Date(),
        resolved: false
      });
    }

    await purchase.save();

    // Update tracking
    try {
      const tracking = await OrderTracking.findOne({ purchaseId: purchase._id });
      if (tracking) {
        await tracking.addEvent({
          status: 'installation_completed',
          title: 'Installation Completed',
          description: `Installation has been completed by ${req.user.name}.${notes ? ` Notes: ${notes}` : ''}`,
          isVisible: true
        }, req.user._id);
      }
    } catch (trackingError) {
      console.error('Error updating tracking:', trackingError);
    }

    // Notify customer for sign-off
    try {
      await NotificationService.createInstallationNotification('installation_completed', purchase, req.user);
    } catch (notificationError) {
      console.error('Failed to create completion notification:', notificationError);
    }

    // Build summary payload
    let products = [];
    try {
      const QuotationItem = require('../models/QuotationItem');
      if (purchase.quotationId) {
        const items = await QuotationItem.find({ quotationId: purchase.quotationId })
          .populate('productId', 'name modelNumber category');
        products = items.map(item => ({
          name: item.productId?.name || 'Unknown',
          modelNumber: item.productId?.modelNumber || '',
          category: item.productId?.category || '',
          quantity: item.quantity
        }));
      }
    } catch (_) {}

    res.status(200).json({
      success: true,
      message: 'Installation completed successfully. Awaiting customer sign-off.',
      data: {
        purchaseId: purchase._id,
        purchaseID: purchase.purchaseID,
        installationStatus: purchase.installationStatus,
        completionPhotos: purchase.completionPhotos,
        completedAt: purchase.workCompletedAt,
        serviceNotes: purchase.serviceAssignmentNotes || '',
        notes: notes || '',
        issuesEncountered: issuesEncountered || '',
        customer: purchase.customerId ? {
          name: `${purchase.customerId.firstName || ''} ${purchase.customerId.lastName || ''}`.trim(),
          email: purchase.customerId.email || '',
          phone: purchase.customerId.phone || '',
          address: purchase.customerId.address || '',
          businessName: purchase.customerId.businessName || ''
        } : null,
        engineer: req.user ? { name: req.user.name, email: req.user.email } : null,
        products
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get installation details for on-device sign-off
// @route   GET /api/installations/:purchaseId/signoff
// @access  Private (Service Engineer hands device to customer)
exports.getInstallationForSignoff = async (req, res) => {
  try {
    const purchase = await CustomerPurchase.findById(req.params.purchaseId)
      .populate('customerId', 'firstName lastName email')
      .populate('assignedEngineerId', 'name email')
      .populate('quotationId', 'quotationNumber');

    if (!purchase) {
      throw new AppError('Installation not found', 404);
    }

    // Access restricted: only the assigned engineer may open this on-device flow
    let assignedEngineerId = purchase.assignedEngineerId && purchase.assignedEngineerId._id
      ? purchase.assignedEngineerId._id
      : purchase.assignedEngineerId;
    if (!assignedEngineerId) {
      // Backfill assignment if missing to support legacy data
      purchase.assignedEngineerId = req.user._id;
      await purchase.save();
      assignedEngineerId = req.user._id;
    }
    if (String(assignedEngineerId) !== String(req.user._id)) {
      if (purchase.installationStatus === 'completed') {
        // Auto-reassign for on-device handover when installation is completed
        purchase.assignedEngineerId = req.user._id;
        await purchase.save();
      } else {
        throw new AppError('Not authorized to access this installation', 403);
      }
    }

    if (!['completed'].includes(purchase.installationStatus)) {
      throw new AppError('Installation must be completed before collecting feedback', 400);
    }

    // Get product details
    const QuotationItem = require('../models/QuotationItem');
    let quotationItems = [];
    if (purchase.quotationId && purchase.quotationId._id) {
      quotationItems = await QuotationItem.find({ 
        quotationId: purchase.quotationId._id 
      }).populate('productId', 'name modelNumber category');
    }

    const installationDetails = {
      purchaseId: purchase._id,
      purchaseID: purchase.purchaseID,
      quotationNumber: (purchase.quotationId && purchase.quotationId.quotationNumber) ? purchase.quotationId.quotationNumber : null,
      engineer: {
        name: purchase.assignedEngineerId.name,
        email: purchase.assignedEngineerId.email
      },
      installationDate: purchase.installationDate,
      startTime: purchase.installationStartTime,
      endTime: purchase.installationEndTime,
      completionPhotos: purchase.completionPhotos,
      serviceNotes: purchase.serviceAssignmentNotes,
      products: quotationItems.map(item => ({
        name: item.productId?.name || 'Unknown',
        modelNumber: item.productId?.modelNumber || '',
        category: item.productId?.category || '',
        quantity: item.quantity
      })),
      issuesReported: purchase.issuesReported || []
    };

    res.status(200).json({
      success: true,
      data: installationDetails
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    On-device sign-off with feedback (completed by customer but submitted under engineer session)
// @route   POST /api/installations/:purchaseId/signoff
// @access  Private (Service Engineer hands device to customer)
exports.customerSignoff = async (req, res) => {
  try {
    const {
      approved,
      customerFeedback,
      overallRating,
      serviceQualityRating,
      timelinessRating,
      professionalismRating
    } = req.body;

    const purchase = await CustomerPurchase.findById(req.params.purchaseId)
      .populate('customerId', 'firstName lastName email')
      .populate('assignedEngineerId', 'name email');

    if (!purchase) {
      throw new AppError('Installation not found', 404);
    }

    // Access restricted: only the assigned engineer may submit this
    let assignedEngineerIdForCheck = purchase.assignedEngineerId && purchase.assignedEngineerId._id
      ? purchase.assignedEngineerId._id
      : purchase.assignedEngineerId;
    console.log('[SIGNOFF] POST check', {
      purchaseId: String(purchase._id),
      assignedEngineerIdRaw: purchase.assignedEngineerId,
      assignedEngineerIdForCheck: assignedEngineerIdForCheck ? String(assignedEngineerIdForCheck) : null,
      currentUserId: String(req.user._id)
    });
    if (!assignedEngineerIdForCheck) {
      // Backfill assignment for legacy/migrated records
      purchase.assignedEngineerId = req.user._id;
      await purchase.save();
      assignedEngineerIdForCheck = req.user._id;
    }
    if (String(assignedEngineerIdForCheck) !== String(req.user._id)) {
      if (purchase.installationStatus === 'pending_signoff') {
        // Auto-reassign for on-device handover when installation is awaiting sign-off
        purchase.assignedEngineerId = req.user._id;
        await purchase.save();
        assignedEngineerIdForCheck = req.user._id;
      } else {
        throw new AppError('Not authorized to access this installation', 403);
      }
    }

    if (!['completed'].includes(purchase.installationStatus)) {
      throw new AppError('Installation must be completed before collecting feedback', 400);
    }

    // Validate ratings
    const ratings = [overallRating, serviceQualityRating, timelinessRating, professionalismRating];
    for (const rating of ratings) {
      if (rating && (rating < 1 || rating > 5)) {
        throw new AppError('Ratings must be between 1 and 5', 400);
      }
    }

    // Update customer sign-off data
    purchase.customerSignoffData = {
      approved: approved === true,
      signedAt: new Date(),
      customerFeedback: customerFeedback || '',
      overallRating: overallRating || null,
      serviceQualityRating: serviceQualityRating || null,
      timelinessRating: timelinessRating || null,
      professionalismRating: professionalismRating || null
    };

    // Note: In simplified workflow, installation is already completed via completion form
    // This sign-off is just for feedback collection, not status change
    if (!approved) {
      // Create an issue report for customer feedback
      purchase.issuesReported.push({
        description: `Customer feedback: ${customerFeedback || 'No feedback provided'}`,
        reportedBy: req.user._id,
        reportedAt: new Date(),
        resolved: false
      });
    }

    await purchase.save();

    // Update customer status based on their purchase orders
    await updateCustomerStatus(purchase.customerId);

    // Update tracking
    try {
      const tracking = await OrderTracking.findOne({ purchaseId: purchase._id });
      if (tracking) {
        await tracking.addEvent({
          status: 'customer_feedback_received',
          title: 'Customer Feedback Received',
          description: `Customer provided feedback on the installation. ${customerFeedback ? `Feedback: ${customerFeedback}` : 'No additional feedback.'}`,
          isVisible: true
        }, req.user._id);
      }
    } catch (trackingError) {
      console.error('Error updating tracking:', trackingError);
    }

    // Send notifications
    try {
      if (approved) {
        await NotificationService.createInstallationNotification('customer_approved', purchase, req.user);
      } else {
        await NotificationService.createInstallationNotification('customer_rejected', purchase, req.user);
      }
    } catch (notificationError) {
      console.error('Failed to create sign-off notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: approved ? 'Installation approved successfully!' : 'Issues reported. Our team will follow up.',
      data: {
        approved,
        signoffDate: purchase.customerSignoffData.signedAt,
        installationStatus: purchase.installationStatus
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Report installation issue
// @route   POST /api/installations/:purchaseId/report-issue
// @access  Private (Service Engineer)
exports.reportIssue = async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description || !description.trim()) {
      throw new AppError('Issue description is required', 400);
    }

    const purchase = await CustomerPurchase.findOne({
      _id: req.params.purchaseId,
      assignedEngineerId: req.user._id
    });

    if (!purchase) {
      throw new AppError('Assignment not found or not assigned to you', 404);
    }

    // Add issue to the list
    purchase.issuesReported.push({
      description: description.trim(),
      reportedBy: req.user._id,
      reportedAt: new Date(),
      resolved: false
    });

    // Update installation status to issues if not already completed
    if (!['completed', 'pending_signoff'].includes(purchase.installationStatus)) {
      purchase.installationStatus = 'issues';
    }

    await purchase.save();

    // Notify management about the issue
    try {
      await NotificationService.createInstallationNotification('issue_reported', purchase, req.user);
    } catch (notificationError) {
      console.error('Failed to create issue notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Issue reported successfully. Management has been notified.'
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Export multer middleware for file uploads
exports.uploadCompletionPhotos = upload.array('completionPhotos', 5);

module.exports = exports;

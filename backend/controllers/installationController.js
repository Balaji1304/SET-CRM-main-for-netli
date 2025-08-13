const CustomerPurchase = require('../models/CustomerPurchase');
const OrderTracking = require('../models/OrderTracking');
const User = require('../models/User');
const { AppError, errorHandler } = require('../utils/errorHandler');
const NotificationService = require('../utils/notificationService');
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

// @desc    Update installation status (check-in, start, progress updates)
// @route   PUT /api/installations/:purchaseId/status
// @access  Private (Service Engineer)
exports.updateInstallationStatus = async (req, res) => {
  try {
    const { status, location, notes } = req.body;
    
    const validStatuses = ['on_route', 'on_site', 'in_progress'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status update', 400);
    }

    const purchase = await CustomerPurchase.findOne({
      _id: req.params.purchaseId,
      assignedEngineerId: req.user._id
    });

    if (!purchase) {
      throw new AppError('Assignment not found or not assigned to you', 404);
    }

    // Status progression validation
    const statusOrder = ['assigned', 'accepted', 'on_route', 'on_site', 'in_progress', 'pending_signoff', 'completed'];
    const currentIndex = statusOrder.indexOf(purchase.installationStatus);
    const newIndex = statusOrder.indexOf(status);
    
    if (newIndex <= currentIndex && purchase.installationStatus !== 'accepted') {
      throw new AppError('Cannot move to an earlier or same status', 400);
    }

    // Update timestamps based on status
    const updateData = { installationStatus: status };
    
    if (status === 'on_site' && !purchase.actualArrival) {
      updateData.actualArrival = new Date();
    }
    if (status === 'in_progress' && !purchase.installationStartTime) {
      updateData.installationStartTime = new Date();
    }

    await CustomerPurchase.findByIdAndUpdate(req.params.purchaseId, updateData);

    // Update tracking with appropriate message
    const statusMessages = {
      'on_route': 'Engineer is on the way to your location',
      'on_site': 'Engineer has arrived at the installation site',
      'in_progress': 'Installation work has begun'
    };

    try {
      const tracking = await OrderTracking.findOne({ purchaseId: purchase._id });
      if (tracking) {
        await tracking.addEvent({
          status: 'installation_in_progress',
          title: `Installation ${status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
          description: statusMessages[status] + (notes ? `. Notes: ${notes}` : ''),
          location: location || null,
          isVisible: true
        }, req.user._id);
      }
    } catch (trackingError) {
      console.error('Error updating tracking:', trackingError);
    }

    res.status(200).json({
      success: true,
      message: 'Status updated successfully'
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
    });

    if (!purchase) {
      throw new AppError('Assignment not found or not assigned to you', 404);
    }

    if (purchase.installationStatus !== 'in_progress') {
      throw new AppError('Installation must be in progress to complete', 400);
    }

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

    // Update purchase record
    purchase.installationStatus = 'pending_signoff';
    purchase.installationEndTime = new Date();
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
          description: `Installation has been completed by ${req.user.name}. Awaiting customer sign-off.${notes ? ` Notes: ${notes}` : ''}`,
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

    res.status(200).json({
      success: true,
      message: 'Installation completed successfully. Awaiting customer sign-off.',
      data: {
        installationStatus: purchase.installationStatus,
        completionPhotos: purchase.completionPhotos,
        completedAt: purchase.installationEndTime
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get installation details for customer sign-off
// @route   GET /api/installations/:purchaseId/signoff
// @access  Private (Customer)
exports.getInstallationForSignoff = async (req, res) => {
  try {
    const purchase = await CustomerPurchase.findById(req.params.purchaseId)
      .populate('customerId', 'firstName lastName email')
      .populate('assignedEngineerId', 'name email')
      .populate('quotationId', 'quotationNumber');

    if (!purchase) {
      throw new AppError('Installation not found', 404);
    }

    // Verify customer ownership
    if (purchase.customerId.email !== req.user.email) {
      throw new AppError('Not authorized to access this installation', 403);
    }

    if (purchase.installationStatus !== 'pending_signoff') {
      throw new AppError('Installation is not ready for sign-off', 400);
    }

    // Get product details
    const QuotationItem = require('../models/QuotationItem');
    const quotationItems = await QuotationItem.find({ 
      quotationId: purchase.quotationId._id 
    }).populate('productId', 'name modelNumber category');

    const installationDetails = {
      purchaseId: purchase._id,
      purchaseID: purchase.purchaseID,
      quotationNumber: purchase.quotationId.quotationNumber,
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

// @desc    Customer sign-off with feedback
// @route   POST /api/installations/:purchaseId/signoff
// @access  Private (Customer)
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

    // Verify customer ownership
    if (purchase.customerId.email !== req.user.email) {
      throw new AppError('Not authorized to access this installation', 403);
    }

    if (purchase.installationStatus !== 'pending_signoff') {
      throw new AppError('Installation is not ready for sign-off', 400);
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

    if (approved) {
      purchase.installationStatus = 'completed';
      purchase.serviceTaskStatus = 'completed';
      purchase.status = 'completed';
    } else {
      purchase.installationStatus = 'issues';
      // Create an issue report for rejection
      purchase.issuesReported.push({
        description: `Customer rejected installation. Feedback: ${customerFeedback || 'No feedback provided'}`,
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
        if (approved) {
          await tracking.addEvent({
            status: 'service_activated',
            title: 'Service Activated',
            description: `Installation approved by customer. Service is now active.`,
            isVisible: true
          }, req.user._id);
          
          await tracking.addEvent({
            status: 'order_completed',
            title: 'Order Completed',
            description: `Order has been successfully completed with customer approval.`,
            isVisible: true
          }, req.user._id);
        } else {
          await tracking.addEvent({
            status: 'on_hold',
            title: 'Installation Issues Reported',
            description: `Customer reported issues with installation. Support team will follow up.`,
            isVisible: true
          }, req.user._id);
        }
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

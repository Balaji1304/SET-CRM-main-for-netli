const Enquiry = require('../models/Enquiry');
const Lead = require('../models/Lead');
const User = require('../models/User');
const NotificationService = require('../utils/notificationService');

// @desc    Create new enquiry
// @route   POST /api/enquiries
// @access  Private (Front Office Executive)
exports.createEnquiry = async (req, res) => {
  try {
    // Add the user ID to the enquiry data
    req.body.createdBy = req.user.id;

    const enquiry = await Enquiry.create(req.body);

    // Create notification for new enquiry
    try {
      await NotificationService.createEnquiryNotification('enquiry_created', enquiry, req.user);
    } catch (notificationError) {
      console.error('Failed to create enquiry notification:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.status(201).json({
      success: true,
      data: enquiry
    });
  } catch (error) {
    console.error('Error creating enquiry:', error);
    res.status(400).json({
      success: false,
      message: `Failed to create enquiry: ${error.message}`
    });
  }
};

// @desc    Get all enquiries (for assignment page)
// @route   GET /api/enquiries
// @access  Private
exports.getEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find()
      .populate({
        path: 'createdBy',
        select: 'name email'
      })
      .populate({
        path: 'assignedTo',
        select: 'name email'
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: enquiries.map(enquiry => ({
        ...enquiry.toObject(),
        id: enquiry._id.toString(),
        _id: enquiry._id.toString()
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get single enquiry
// @route   GET /api/enquiries/:id
// @access  Private
exports.getEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate({
        path: 'createdBy',
        select: 'name email'
      })
      .populate({
        path: 'assignedTo',
        select: 'name email'
      });

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...enquiry.toObject(),
        id: enquiry._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update enquiry
// @route   PUT /api/enquiries/:id
// @access  Private
exports.updateEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    res.json({
      success: true,
      data: enquiry
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Failed to update enquiry: ${error.message}`
    });
  }
};

// @desc    Delete enquiry
// @route   DELETE /api/enquiries/:id
// @access  Private
exports.deleteEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get available salespersons for assignment
// @route   GET /api/enquiries/salespersons
// @access  Private
exports.getSalespersons = async (req, res) => {
  try {
    const salespersons = await User.find({ 
      role: { $in: ['sales_person', 'sales_representative', 'sales_head'] }
    }).select('_id name email role');
    
    res.status(200).json({
      success: true,
      count: salespersons.length,
      data: salespersons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Assign enquiry to salesperson and create lead
// @route   POST /api/enquiries/:id/assign
// @access  Private
exports.assignEnquiryToSalesperson = async (req, res) => {
  try {
    const { id } = req.params;
    const { salespersonId, notes } = req.body;

    if (!salespersonId) {
      return res.status(400).json({
        success: false,
        message: 'Salesperson ID is required'
      });
    }

    // Verify salesperson exists
    const salesperson = await User.findById(salespersonId);
    if (!salesperson) {
      return res.status(404).json({
        success: false,
        message: 'Salesperson not found'
      });
    }

    // Get the enquiry
    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    if (enquiry.assignmentStatus === 'converted_to_lead') {
      return res.status(400).json({
        success: false,
        message: 'Enquiry has already been converted to a lead'
      });
    }

    // Handle email - leave undefined if not provided (will be completed by salesperson)
    let leadEmail = enquiry.email || undefined;

    // Create lead from enquiry data
    const leadData = {
      // Required fields with defaults or from enquiry
      leadType: enquiry.leadType,
      customLeadType: enquiry.customLeadType,
      status: 'pending',
      firstName: enquiry.firstName,
      lastName: enquiry.lastName || '',
      email: leadEmail,
      phone: enquiry.phone,
      countryCode: enquiry.countryCode || '+91',
      whatsapp: enquiry.whatsapp || enquiry.phone,
      billingAddress: enquiry.address || 'Address to be updated by salesperson',
      shippingAddress: '',
      businessName: '',
      customerType: 'end_user', // Default value
      customCustomerType: '',
      gstinUin: '',
      
      // Products - placeholder for incomplete leads
      selectedProductType: 'individual',
      products: [{
        name: 'Products to be specified by salesperson',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      }],
      productRequirements: enquiry.productRequirements || '',
      
      // Additional information
      dateCollected: new Date(),
      followUpRequired: false,
      followUpDateTime: '',
      notes: notes || 'Lead created from enquiry form. Please complete the missing information.',
      
      // Enquiry tracking fields
      createdFromEnquiry: true,
      enquiryId: enquiry._id,
      leadCompletionStatus: 'incomplete', // This makes validation more lenient
      
      // Assignment
      createdBy: salespersonId
    };

    // Create the lead
    const lead = await Lead.create(leadData);

    // Update enquiry with assignment info
    enquiry.assignedTo = salespersonId;
    enquiry.assignedAt = new Date();
    enquiry.assignmentStatus = 'converted_to_lead';
    enquiry.leadId = lead._id;
    enquiry.convertedAt = new Date();
    if (notes) {
      enquiry.notes = notes;
    }
    await enquiry.save();

    // Populate the updated enquiry for response
    await enquiry.populate('assignedTo', 'name email');

    // Create notifications for enquiry assignment and lead creation
    try {
      const assignedUser = await User.findById(salespersonId);
      
      // Notify the assigned salesperson
      await NotificationService.createEnquiryNotification('enquiry_assigned', enquiry, req.user);
      
      // Notify front office about successful conversion
      await NotificationService.createEnquiryNotification('enquiry_converted', enquiry, req.user, {
        assigneeName: assignedUser?.name || 'Sales Team',
        leadId: lead._id
      });

      // Notify about new lead creation
      await NotificationService.createLeadWorkflowNotification('lead_created', lead, req.user, {
        createdFromEnquiry: true,
        enquiryId: enquiry._id
      });
    } catch (notificationError) {
      console.error('Failed to create assignment notifications:', notificationError);
      // Don't fail the main operation if notification fails
    }

    res.status(200).json({
      success: true,
      data: {
        enquiry,
        lead: {
          id: lead._id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          status: lead.status,
          leadCompletionStatus: lead.leadCompletionStatus
        }
      },
      message: 'Enquiry successfully assigned and lead created'
    });
  } catch (error) {
    console.error('Error assigning enquiry to salesperson:', error);
    res.status(500).json({
      success: false,
      message: `Failed to assign enquiry: ${error.message}`
    });
  }
};

// @desc    Get enquiries pending assignment
// @route   GET /api/enquiries/pending-assignment
// @access  Private
exports.getPendingAssignmentEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find({
      assignmentStatus: 'pending_assignment'
    })
      .populate({
        path: 'createdBy',
        select: 'name email'
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: enquiries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get enquiries created by current user (for front office executives)
// @route   GET /api/enquiries/my-enquiries
// @access  Private
exports.getMyEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find({ createdBy: req.user.id })
      .populate({
        path: 'assignedTo',
        select: 'name email'
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: enquiries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
}; 
const Lead = require('../models/Lead');

// @desc    Create new lead
// @route   POST /api/leads
// @access  Private
exports.createLead = async (req, res) => {
  try {
    // Add the user ID to the lead data
    req.body.createdBy = req.user.id;

    const lead = await Lead.create(req.body);

    res.status(201).json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(400).json({
      success: false,
      message: `Failed to create lead: ${error.message}`
    });
  }
};

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
exports.getLeads = async (req, res) => {
  try {
    const leads = await Lead.find({ createdBy: req.user.id })
      .populate({
        path: 'products.productId',
        select: 'name category price specifications _id'
      });

    res.json({
      success: true,
      data: leads.map(lead => ({
        ...lead.toObject(),
        id: lead._id.toString(),
        _id: lead._id.toString()
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
exports.getLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    }).populate({
      path: 'products.productId',
      select: 'name category price specifications'
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...lead.toObject(),
        id: lead._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
exports.updateLead = async (req, res) => {
  try {
    console.log(`Updating lead ${req.params.id} with data:`, req.body);
    
    // Find the lead first
    const lead = await Lead.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    console.log(`Found lead - createdFromEnquiry: ${lead.createdFromEnquiry}, leadCompletionStatus: ${lead.leadCompletionStatus}`);

    // Update the lead fields
    Object.keys(req.body).forEach(key => {
      lead[key] = req.body[key];
    });

    // Save the lead (this will trigger pre-save middleware)
    const updatedLead = await lead.save();
    
    console.log(`Lead saved - new leadCompletionStatus: ${updatedLead.leadCompletionStatus}`);

    res.json({
      success: true,
      data: updatedLead
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(400).json({
      success: false,
      message: `Failed to update lead: ${error.message}`
    });
  }
};

// @desc    Delete lead
// @route   DELETE /api/leads/:id
// @access  Private
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
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
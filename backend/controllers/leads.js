const Lead = require('../models/Lead');
const CustomizedProduct = require('../models/CustomizedProduct');
const ProductBundle = require('../models/ProductBundle');
const NotificationService = require('../utils/notificationService');

// @desc    Check if email already exists
// @route   POST /api/leads/check-email
// @access  Private
exports.checkEmailExists = async (req, res) => {
  try {
    const { email, excludeId } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const query = { email: email.toLowerCase().trim() };
    
    // If updating an existing lead, exclude it from the check
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const existingLead = await Lead.findOne(query);
    
    res.json({
      success: true,
      exists: !!existingLead,
      lead: existingLead ? {
        id: existingLead._id,
        firstName: existingLead.firstName,
        lastName: existingLead.lastName,
        email: existingLead.email,
        phone: existingLead.phone,
        status: existingLead.status
      } : null
    });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check email'
    });
  }
};

// @desc    Create new lead
// @route   POST /api/leads
// @access  Private
exports.createLead = async (req, res) => {
  try {
    // Add the user ID to the lead data
    req.body.createdBy = req.user.id;

    const lead = await Lead.create(req.body);

    // Create notification for new lead (only if not created from enquiry)
    if (!req.body.createdFromEnquiry) {
      try {
        await NotificationService.createLeadWorkflowNotification('lead_created', lead, req.user);
      } catch (notificationError) {
        console.error('Failed to create lead notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }

    res.status(201).json({
      success: true,
      data: lead
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    
    // Handle duplicate email error specifically
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      const duplicateEmail = error.keyValue.email;
      return res.status(400).json({
        success: false,
        message: `A lead with the email address "${duplicateEmail}" already exists. Please use a different email address or update the existing lead.`,
        errorType: 'DUPLICATE_EMAIL',
        duplicateField: 'email',
        duplicateValue: duplicateEmail
      });
    }
    
    // Handle other validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: `Validation error: ${validationErrors.join(', ')}`,
        errorType: 'VALIDATION_ERROR',
        validationErrors: validationErrors
      });
    }
    
    // Generic error response
    res.status(400).json({
      success: false,
      message: `Failed to create lead: ${error.message}`,
      errorType: 'GENERAL_ERROR'
    });
  }
};

// @desc    Get all leads
// @route   GET /api/leads
// @access  Private
exports.getLeads = async (req, res) => {
  try {
    // Sales head can see all leads, others can only see their own leads
    const query = req.user.role === 'sales_head' ? {} : { createdBy: req.user.id };
    
    const leads = await Lead.find(query)
      .populate({
        path: 'products.productId',
        select: 'name category price specifications _id'
      })
      .populate({
        path: 'products.customizedProductId',
        select: 'name unitPrice modelNumber description specifications imageUrls _id'
      })
      .populate({
        path: 'createdBy',
        select: 'name email role _id'
      });

    // Post-process leads to add bundle information for bundle products
    const processedLeads = await Promise.all(
      leads.map(async (lead) => {
        const leadObj = lead.toObject();
        
        // Process each product to add bundle information if it's a bundle item
        const processedProducts = await Promise.all(
          leadObj.products.map(async (product) => {
            if (product.isBundleItem && product.bundleCode) {
              // Find the bundle by bundleCode or name
              const bundle = await ProductBundle.findOne({
                $or: [
                  { bundleCode: product.bundleCode },
                  { name: product.name }
                ]
              }).select('_id name bundleCode price termsAndConditions');
              
              if (bundle) {
                return {
                  ...product,
                  bundleId: bundle._id, // Add bundleId for quotation creation
                  bundleDetails: {
                    _id: bundle._id,
                    name: bundle.name,
                    bundleCode: bundle.bundleCode,
                    price: bundle.price,
                    termsAndConditions: bundle.termsAndConditions
                  }
                };
              }
            }
            return product;
          })
        );
        
        return {
          ...leadObj,
          products: processedProducts,
          id: leadObj._id.toString(),
          _id: leadObj._id.toString()
        };
      })
    );

    res.json({
      success: true,
      data: processedLeads
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
    // Sales head can view any lead, others can only view their own leads
    const query = req.user.role === 'sales_head' 
      ? { _id: req.params.id }
      : { _id: req.params.id, createdBy: req.user.id };
    
    const lead = await Lead.findOne(query)
      .populate({
        path: 'products.productId',
        select: 'name category price specifications'
      })
      .populate({
        path: 'products.customizedProductId',
        select: 'name unitPrice modelNumber description specifications imageUrls'
      })
      .populate({
        path: 'createdBy',
        select: 'name email role _id'
      });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const leadObj = lead.toObject();
    
    // Process products to add bundle information if it's a bundle item
    const processedProducts = await Promise.all(
      leadObj.products.map(async (product) => {
        if (product.isBundleItem && product.bundleCode) {
          // Find the bundle by bundleCode or name
          const bundle = await ProductBundle.findOne({
            $or: [
              { bundleCode: product.bundleCode },
              { name: product.name }
            ]
          }).select('_id name bundleCode price termsAndConditions');
          
          if (bundle) {
            return {
              ...product,
              bundleId: bundle._id, // Add bundleId for quotation creation
              bundleDetails: {
                _id: bundle._id,
                name: bundle.name,
                bundleCode: bundle.bundleCode,
                price: bundle.price,
                termsAndConditions: bundle.termsAndConditions
              }
            };
          }
        }
        return product;
      })
    );

    res.json({
      success: true,
      data: {
        ...leadObj,
        products: processedProducts,
        id: leadObj._id
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
    
    // Sales head can update any lead, others can only update their own leads
    const query = req.user.role === 'sales_head' 
      ? { _id: req.params.id }
      : { _id: req.params.id, createdBy: req.user.id };
    
    // Find the lead first
    const lead = await Lead.findOne(query);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    console.log(`Found lead - createdFromEnquiry: ${lead.createdFromEnquiry}, leadCompletionStatus: ${lead.leadCompletionStatus}`);

    // Handle customized products with global uniqueness
    if (req.body.products && Array.isArray(req.body.products)) {
      const processedProducts = [];
      
      for (const product of req.body.products) {
        if (product.isCustomizedProduct) {
          // If the product already has a customizedProductId, it's an existing product
          if (product.customizedProductId) {
            console.log(`Using existing customized product: ${product.name} - ID: ${product.customizedProductId}`);
            
            // Verify the customized product exists
            const existingCustomizedProduct = await CustomizedProduct.findById(product.customizedProductId);
            if (existingCustomizedProduct) {
              processedProducts.push({
                ...product,
                customizedProductId: existingCustomizedProduct._id,
                id: existingCustomizedProduct._id.toString()
              });
            } else {
              console.warn(`Customized product with ID ${product.customizedProductId} not found, creating new one`);
              // Fallback: create new if not found
              const newCustomizedProduct = await CustomizedProduct.create({
                name: product.name,
                unitPrice: parseFloat(product.unitPrice),
                leadId: req.params.id,
                createdBy: req.user.id
              });
              
              processedProducts.push({
                ...product,
                customizedProductId: newCustomizedProduct._id,
                id: newCustomizedProduct._id.toString()
              });
            }
          } else {
            // This is a new customized product, check if one with the same name already exists globally
            const existingCustomizedProduct = await CustomizedProduct.findOne({
              name: product.name
            });
            
            if (existingCustomizedProduct) {
              console.log(`Found existing global customized product: ${product.name} - Using existing ID: ${existingCustomizedProduct._id}`);
              // Use the existing global customized product
              processedProducts.push({
                ...product,
                customizedProductId: existingCustomizedProduct._id,
                id: existingCustomizedProduct._id.toString()
              });
            } else {
              console.log(`Creating new customized product: ${product.name}`);
              // Create new customized product
              const newCustomizedProduct = await CustomizedProduct.create({
                name: product.name,
                unitPrice: parseFloat(product.unitPrice),
                leadId: req.params.id,
                createdBy: req.user.id
              });
              
              processedProducts.push({
                ...product,
                customizedProductId: newCustomizedProduct._id,
                id: newCustomizedProduct._id.toString()
              });
            }
          }
        } else {
          // Regular product, no changes needed
          processedProducts.push(product);
        }
      }
      
      // Update the products array with processed products
      req.body.products = processedProducts;
    }

    // Update the lead fields
    Object.keys(req.body).forEach(key => {
      lead[key] = req.body[key];
    });

    // Save the lead (this will trigger pre-save middleware)
    const updatedLead = await lead.save();
    
    console.log(`Lead saved - new leadCompletionStatus: ${updatedLead.leadCompletionStatus}`);

    // Create notification for lead update (only for significant updates, not from enquiry conversions)
    if (!updatedLead.createdFromEnquiry) {
      try {
        await NotificationService.createLeadWorkflowNotification('lead_updated', updatedLead, req.user);
      } catch (notificationError) {
        console.error('Failed to create lead update notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    }

    res.json({
      success: true,
      data: updatedLead
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    
    // Handle duplicate email error specifically
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      const duplicateEmail = error.keyValue.email;
      return res.status(400).json({
        success: false,
        message: `A lead with the email address "${duplicateEmail}" already exists. Please use a different email address or update the existing lead.`,
        errorType: 'DUPLICATE_EMAIL',
        duplicateField: 'email',
        duplicateValue: duplicateEmail
      });
    }
    
    // Handle other validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: `Validation error: ${validationErrors.join(', ')}`,
        errorType: 'VALIDATION_ERROR',
        validationErrors: validationErrors
      });
    }
    
    // Generic error response
    res.status(400).json({
      success: false,
      message: `Failed to update lead: ${error.message}`,
      errorType: 'GENERAL_ERROR'
    });
  }
};

// @desc    Delete lead
// @route   DELETE /api/leads/:id
// @access  Private
exports.deleteLead = async (req, res) => {
  try {
    // Sales head can delete any lead, others can only delete their own leads
    const query = req.user.role === 'sales_head' 
      ? { _id: req.params.id }
      : { _id: req.params.id, createdBy: req.user.id };
      
    const lead = await Lead.findOneAndDelete(query);

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
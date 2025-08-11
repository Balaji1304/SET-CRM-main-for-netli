const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Quotation = require('../models/Quotation');
const CustomerPurchase = require('../models/CustomerPurchase');
const Payment = require('../models/Payment');
const QuotationItem = require('../models/QuotationItem');
const Product = require('../models/Product');
const { AppError, errorHandler } = require('../utils/errorHandler');
const User = require('../models/User');
const Package = require('../models/Package');

// Convert lead to customer when quotation is approved
exports.convertLeadToCustomer = async (req, res) => {
  try {
    const { quotationId } = req.params;
    const { advanceAmount, paymentMethod, transactionId } = req.body;

    // Find the quotation
    const quotation = await Quotation.findById(quotationId);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        error: 'Quotation not found'
      });
    }

    if (quotation.status !== 'sent') {
      return res.status(400).json({
        success: false,
        error: 'Only quotations with "sent" status can be approved'
      });
    }

    // Find quotation items
    const quotationItems = await QuotationItem.find({ quotationId: quotation._id })
      .populate('productId');

    if (quotationItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Quotation has no items'
      });
    }

    const lead = await Lead.findById(quotation.lead);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Check if customer already exists for this lead
    let customer = await Customer.findOne({ leadId: lead._id });

    // If customer doesn't exist, create one
    if (!customer) {
      customer = await Customer.create({
        leadId: lead._id,
        userId: req.user.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        businessName: lead.businessName,
        address: lead.address,
        customerType: lead.customerType
      });
    }

    // Financials from Quotation
    const purchaseSubtotal = quotation.subtotal; // Assumes quotation.subtotal is correct
    const purchaseTaxPercentage = 18; // Hardcoded 18% tax rate
    const purchaseTaxAmount = Number((purchaseSubtotal * (purchaseTaxPercentage / 100)).toFixed(2));
    // quotation.total should already reflect subtotal + 18% tax
    const purchaseTotalAmount = quotation.total; 

    // Validate if quotation.total matches our new calculation
    if (Math.abs(purchaseTotalAmount - (purchaseSubtotal + purchaseTaxAmount)) > 0.01) {
        console.warn(`Discrepancy in Quotation total vs. re-calculated total during lead conversion. Quotation ID: ${quotation._id}. Quotation.total: ${quotation.total}, Calculated: ${purchaseSubtotal + purchaseTaxAmount}`);
        // Consider using the re-calculated total if quotation.total is deemed unreliable.
    }

    const calculatedAdvanceAmount = advanceAmount || (purchaseTotalAmount * (quotation.advancePaymentPercentage / 100));
    const remainingAmount = purchaseTotalAmount - calculatedAdvanceAmount;

    // Generate a unique purchase ID
    const purchaseCount = await CustomerPurchase.countDocuments();
    const purchaseID = `PO-${String(purchaseCount + 1).padStart(5, '0')}`;

    // Create customer purchase
    const customerPurchase = await CustomerPurchase.create({
      purchaseID,
      customerId: customer._id,
      quotationId: quotation._id,
      subtotal: purchaseSubtotal,         // Store subtotal from quotation
      taxPercentage: purchaseTaxPercentage, // Store defined percentage (18%)
      taxAmount: purchaseTaxAmount,         // Store calculated tax amount
      advancePaid: calculatedAdvanceAmount,
      totalAmount: purchaseTotalAmount,     // Use quotation.total
      remainingAmount: remainingAmount,
      isFullyPaid: remainingAmount <= 0,
      paymentMethod: paymentMethod || 'cash',
      status: 'active' // purchaseDate will default to Date.now() via schema
    });

    // Create payment record for advance
    const payment = await Payment.create({
      customerPurchaseId: customerPurchase._id,
      amountPaid: calculatedAdvanceAmount,
      paymentMethod: paymentMethod || 'cash',
      transactionId: transactionId || '',
      isAdvancePayment: true,
      createdBy: req.user.id
    });

    // Update quotation status to approved
    quotation.status = 'approved';
    quotation.advancePaymentStatus = 'CONFIRMED';
    quotation.advancePaymentAmount = calculatedAdvanceAmount;
    quotation.advancePaymentConfirmedAt = Date.now();
    quotation.paymentMethod = paymentMethod || 'cash';
    quotation.paymentDate = Date.now();
    await quotation.save();

    // Update lead status
    lead.status = 'closed';
    await lead.save();

    res.status(200).json({
      success: true,
      data: {
        customer,
        customerPurchase,
        payment,
        quotationItems
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Get all purchases for a customer
exports.getCustomerPurchases = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const purchases = await CustomerPurchase.find({ customerId })
      .populate({
        path: 'quotationId',
        select: 'quotationNumber subtotal tax total validUntil'
      });

    // For each purchase, get the quotation items
    const purchasesWithItems = await Promise.all(
      purchases.map(async (purchase) => {
        const quotationItems = await QuotationItem.find({ quotationId: purchase.quotationId._id })
          .populate('productId', 'name modelNumber category');
        
        const purchaseObj = purchase.toObject();
        purchaseObj.quotationItems = quotationItems;
        return purchaseObj;
      })
    );

    res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchasesWithItems
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Get purchases for the current logged-in user
exports.getCustomerPurchasesByUser = async (req, res) => {
  try {
    // Find customer record for current user
    const customer = await Customer.findOne({ email: req.user.email });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer record not found'
      });
    }

    // Find all purchases for this customer
    const purchases = await CustomerPurchase.find({ customerId: customer._id })
      .populate({
        path: 'quotationId',
        select: 'quotationNumber subtotal tax total validUntil advancePaymentPercentage'
      })
      .sort({ purchaseDate: -1 }); // Newest first

    // For each purchase, get the quotation items
    const purchasesWithItems = await Promise.all(
      purchases.map(async (purchase) => {
        const quotationItems = await QuotationItem.find({ quotationId: purchase.quotationId._id })
          .populate('productId');
        
        const purchaseObj = purchase.toObject();
        purchaseObj.quotationItems = quotationItems;
        
        // Get payment history
        const payments = await Payment.find({ customerPurchaseId: purchase._id })
          .sort({ paidAt: -1 });
          
        purchaseObj.payments = payments;
        
        return purchaseObj;
      })
    );

    res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchasesWithItems
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Record additional payment for a purchase
exports.recordPayment = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { amountPaid, paymentMethod, transactionId, notes } = req.body;

    if (!amountPaid || amountPaid <= 0) {
      throw new AppError('Payment amount must be greater than 0', 400);
    }

    const purchase = await CustomerPurchase.findById(purchaseId)
      .populate('quotationId');
      
    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    // Validate payment amount
    if (amountPaid > purchase.remainingAmount) {
      throw new AppError(`Payment amount cannot exceed remaining amount of ${purchase.remainingAmount}`, 400);
    }

    // Create payment record
    const payment = await Payment.create({
      customerPurchaseId: purchase._id,
      amountPaid,
      paymentMethod: paymentMethod || 'cash',
      transactionId: transactionId || '',
      notes: notes || '',
      isAdvancePayment: false,
      createdBy: req.user.id
    });

    // Update customer purchase
    const newRemainingAmount = purchase.remainingAmount - amountPaid;
    purchase.remainingAmount = newRemainingAmount;
    purchase.isFullyPaid = newRemainingAmount <= 0;
    
    if (purchase.isFullyPaid) {
      purchase.status = 'completed';
    }
    
    await purchase.save();

    // If fully paid, update the quotation status
    if (purchase.isFullyPaid && purchase.quotationId) {
      const quotation = await Quotation.findById(purchase.quotationId._id);
      if (quotation) {
        quotation.fullPaymentStatus = 'CONFIRMED';
        quotation.fullPaymentAmount = quotation.total;
        quotation.fullPaymentConfirmedAt = Date.now();
        await quotation.save();
      }
    }

    res.status(200).json({
      success: true,
      data: {
        payment,
        purchase
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Get payment history for a purchase
exports.getPaymentHistory = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const purchase = await CustomerPurchase.findById(purchaseId);
    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    const payments = await Payment.find({ customerPurchaseId: purchaseId })
      .sort({ paidAt: -1 })
      .populate({
        path: 'createdBy',
        select: 'name email'
      });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Get all payment history for the current customer
exports.getAllPaymentHistory = async (req, res) => {
  try {
    // Find customer record for current user
    const customer = await Customer.findOne({ email: req.user.email });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer record not found'
      });
    }

    // Find all purchases for this customer
    const purchases = await CustomerPurchase.find({ customerId: customer._id });
    
    if (!purchases.length) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    // Get IDs of all purchases
    const purchaseIds = purchases.map(purchase => purchase._id);
    
    // Find all payments for these purchases
    const payments = await Payment.find({ 
      customerPurchaseId: { $in: purchaseIds } 
    })
    .sort({ paidAt: -1 })
    .populate({
      path: 'createdBy',
      select: 'name email'
    });
    
    // Enhance payment data with quotation information
    const enhancedPayments = await Promise.all(payments.map(async (payment) => {
      const purchase = purchases.find(p => p._id.toString() === payment.customerPurchaseId.toString());
      if (!purchase) return payment;
      
      const quotation = await Quotation.findById(purchase.quotationId);
      const paymentObj = payment.toObject();
      
      // Add purchase and quotation info to payment record for display
      if (purchase) {
        paymentObj.purchaseID = purchase.purchaseID;
      }
      
      if (quotation) {
        paymentObj.quotationNumber = quotation.quotationNumber;
      }
      
      return paymentObj;
    }));

    res.status(200).json({
      success: true,
      count: enhancedPayments.length,
      data: enhancedPayments
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Get customer purchase details with quotation items
exports.getPurchaseDetails = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const purchase = await CustomerPurchase.findById(purchaseId)
      .populate({
        path: 'customerId',
        select: 'firstName lastName email phone businessName address'
      })
      .populate({
        path: 'quotationId',
        select: 'quotationNumber subtotal tax total validUntil createdBy advancePaymentStatus',
        populate: {
            path: 'createdBy',
            select: 'name email'
        }
      })
      .populate({
        path: 'assignedEngineerId',
        select: 'name email role'
      });

    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    const quotationItems = await QuotationItem.find({ quotationId: purchase.quotationId._id })
      .populate({
        path: 'productId',
        select: 'name modelNumber category description imageUrls'
      });

    const payments = await Payment.find({ customerPurchaseId: purchase._id })
      .sort({ paidAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        purchase,
        quotationItems,
        payments
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Create a quotation with items based on lead's product interests
exports.createQuotationFromLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { quotationItems, subtotal, tax, total, validUntil, terms, notes } = req.body;

    // Find the lead
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    // Generate a unique quotation number
    const quotationCount = await Quotation.countDocuments();
    const quotationNumber = `QT-${String(quotationCount + 1).padStart(5, '0')}`;

    // Create the quotation
    const quotation = await Quotation.create({
      lead: lead._id,
      quotationNumber,
      subtotal,
      tax,
      total,
      validUntil: validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days validity
      terms,
      notes,
      status: 'draft',
      createdBy: req.user.id
    });

    // Create quotation items
    const createdQuotationItems = [];
    for (const item of quotationItems) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        throw new AppError(`Product with ID ${item.productId} not found`, 404);
      }

      const quotationItem = await QuotationItem.create({
        quotationId: quotation._id,
        productId: product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice || product.price,
        discount: item.discount || 0,
        subtotal: (item.quantity * (item.unitPrice || product.price)) - (item.discount || 0)
      });

      createdQuotationItems.push(quotationItem);
    }

    // Update lead status to active as quotation is being processed
    lead.status = 'active';
    await lead.save();

    // Return data with quotationItems
    const quotationWithItems = quotation.toObject();
    quotationWithItems.quotationItems = createdQuotationItems;

    res.status(201).json({
      success: true,
      data: quotationWithItems
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// New Controller Functions for Product Head Workflow

// @desc    Get all service engineers
// @route   GET /api/customer-purchases/service-engineers  (or better /api/users/service-engineers)
// @access  Private (Product Head)
exports.getServiceEngineers = async (req, res) => {
  try {
    const serviceEngineers = await User.find({ role: 'service_engineer' }).select('id name email');
    res.status(200).json({
      success: true,
      count: serviceEngineers.length,
      data: serviceEngineers
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get customer purchases that are assignable for service
// @route   GET /api/customer-purchases/assignable
// @access  Private (Product Head)
exports.getAssignablePurchases = async (req, res) => {
  try {
    const assignablePurchases = await CustomerPurchase.find({
      status: 'active', // Purchase itself is active
      serviceTaskStatus: 'pending_assignment' // Not yet assigned
    })
    .populate({
      path: 'quotationId',
      select: 'quotationNumber advancePaymentStatus createdBy', // Need advancePaymentStatus and createdBy for salesperson
      match: { advancePaymentStatus: 'CONFIRMED' }, // Only those where advance is confirmed
      populate: {
        path: 'createdBy', // Populate the salesperson from Quotation
        select: 'name email'
      }
    })
    .populate({
      path: 'customerId',
      select: 'firstName lastName email phone'
    })
    .sort({ purchaseDate: 1 }); // Oldest first

    // Filter out purchases where the quotationId did not match advancePaymentStatus: 'CONFIRMED'
    // (Mongoose returns the parent doc even if populated path doesn't match, so quotationId would be null)
    const filteredPurchases = assignablePurchases.filter(p => p.quotationId !== null);
    
    // For each assignable purchase, fetch quotation items (summary)
    const purchasesWithDetails = await Promise.all(
      filteredPurchases.map(async (purchase) => {
        const quotationItems = await QuotationItem.find({ quotationId: purchase.quotationId._id })
          .populate('productId', 'name'); // Just product name for summary
        
        const purchaseObj = purchase.toObject();
        purchaseObj.quotationItemsSummary = quotationItems.map(qi => ({
            productName: qi.productId ? qi.productId.name : 'N/A', 
            quantity: qi.quantity 
        }));
        // Extract salesperson details
        if (purchase.quotationId && purchase.quotationId.createdBy) {
            purchaseObj.salesperson = {
                name: purchase.quotationId.createdBy.name,
                email: purchase.quotationId.createdBy.email
            };
        }
        // Remove the full populated quotationId.createdBy from the final object if not needed directly by frontend table
        // or keep it if the full user object of salesperson is preferred
        if (purchaseObj.quotationId) {
           delete purchaseObj.quotationId.createdBy; 
        }


        return purchaseObj;
      })
    );


    res.status(200).json({
      success: true,
      count: purchasesWithDetails.length,
      data: purchasesWithDetails
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Assign a service task to an engineer
// @route   PUT /api/customer-purchases/:purchaseId/assign-task
// @access  Private (Product Head)
exports.assignTaskToEngineer = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { assignedEngineerId, serviceDueDate, serviceAssignmentNotes } = req.body;

    if (!assignedEngineerId || !serviceDueDate) {
      throw new AppError('Assigned engineer and service due date are required', 400);
    }

    // Validate serviceDueDate is in the future (optional, but good practice)
    if (new Date(serviceDueDate) < new Date()) {
        // throw new AppError('Service due date must be in the future', 400);
        // Allow same day assignment, but not past
        const today = new Date();
        today.setHours(0,0,0,0);
        if (new Date(serviceDueDate) < today) {
            throw new AppError('Service due date cannot be in the past', 400);
        }
    }

    const purchase = await CustomerPurchase.findById(purchaseId)
      .populate('quotationId', 'advancePaymentStatus');

    if (!purchase) {
      throw new AppError('Customer purchase not found', 404);
    }

    if (purchase.status !== 'active' || (purchase.quotationId && purchase.quotationId.advancePaymentStatus !== 'CONFIRMED')) {
      throw new AppError('Purchase is not active or advance payment not confirmed', 400);
    }

    if (purchase.serviceTaskStatus !== 'pending_assignment') {
      // Allow re-assignment if already assigned but not yet completed/cancelled
      if (!['assigned', 'scheduled', 'on_hold'].includes(purchase.serviceTaskStatus)) {
        throw new AppError(`Task is currently ${purchase.serviceTaskStatus} and cannot be assigned.`, 400);
      }
      console.log(`Re-assigning task for purchase ${purchaseId}. Previous status: ${purchase.serviceTaskStatus}`);
    }
    
    // Check if the assignedEngineerId is a valid service engineer
    const engineer = await User.findOne({ _id: assignedEngineerId, role: 'service_engineer' });
    if (!engineer) {
        throw new AppError('Invalid Service Engineer selected or user is not a service engineer.', 404);
    }

    purchase.assignedEngineerId = assignedEngineerId;
    purchase.serviceDueDate = serviceDueDate;
    purchase.serviceAssignmentNotes = serviceAssignmentNotes || purchase.serviceAssignmentNotes; // Keep old notes if new are not provided
    purchase.serviceTaskStatus = 'assigned'; // Set status to assigned
    
    await purchase.save();

    // TODO: Consider sending a notification to the service engineer here

    res.status(200).json({
      success: true,
      data: purchase
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get all tasks for Product Head (active, advance paid, various service statuses)
// @route   GET /api/customer-purchases/tasks/all-product-head
// @access  Private (Product Head)
exports.getProductHeadTasks = async (req, res) => {
  try {
    const productHeadTasks = await CustomerPurchase.find({
      status: 'active', // Purchase itself is active
      // No filter on serviceTaskStatus here to get all relevant tasks
      // We can add specific statuses to exclude if needed, e.g. 'cancelled_by_customer'
    })
    .populate({
      path: 'quotationId',
      select: 'quotationNumber advancePaymentStatus createdBy',
      match: { advancePaymentStatus: 'CONFIRMED' },
      populate: {
        path: 'createdBy', // Populate the salesperson from Quotation
        select: 'name email'
      }
    })
    .populate({
      path: 'customerId',
      select: 'firstName lastName email phone'
    })
    .populate({ // Populate assigned engineer details
      path: 'assignedEngineerId',
      select: 'name email'
    })
    .sort({ purchaseDate: -1 }); // Newest first, or by due date: serviceDueDate: 1 

    // Filter out purchases where the quotationId did not match advancePaymentStatus: 'CONFIRMED'
    const filteredTasks = productHeadTasks.filter(p => p.quotationId !== null);
    
    const tasksWithDetails = await Promise.all(
      filteredTasks.map(async (task) => {
        const quotationItems = await QuotationItem.find({ quotationId: task.quotationId._id })
          .populate('productId', 'name'); 
        
        const taskObj = task.toObject();
        taskObj.quotationItemsSummary = quotationItems.map(qi => ({
            productName: qi.productId ? qi.productId.name : 'N/A', 
            quantity: qi.quantity 
        }));
        
        if (task.quotationId && task.quotationId.createdBy) {
            taskObj.salesperson = {
                name: task.quotationId.createdBy.name,
                email: task.quotationId.createdBy.email
            };
        }
        
        // Clean up populated fields if they are not directly needed by the frontend table
        // For example, if salesperson object is created, no need to send task.quotationId.createdBy
        // if (taskObj.quotationId) {
        //    delete taskObj.quotationId.createdBy; 
        // }

        return taskObj;
      })
    );

    res.status(200).json({
      success: true,
      count: tasksWithDetails.length,
      data: tasksWithDetails
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get all approved purchases that are not yet packaged
// @route   GET /api/customer-purchases/approved
// @access  Private(sales_head)
exports.getApprovedPurchases = async (req, res) => {
  try {
    // Get all active purchases
    const allPurchases = await CustomerPurchase.find({ status: 'active' })
      .populate('customerId', 'firstName lastName email')
      .lean();

    // Get all sales order IDs that are already in a package
    const packagedOrders = await Package.find({}).select('salesOrder -_id');
    const packagedOrderIds = packagedOrders.map((p) =>
      p.salesOrder.toString()
    );

    // Filter out the purchases that are already packaged
    const unpackagedPurchases = allPurchases.filter(
      (p) => !packagedOrderIds.includes(p._id.toString())
    );

    res.status(200).json({
      success: true,
      count: unpackagedPurchases.length,
      data: unpackagedPurchases,
    });
  } catch (error) {
    errorHandler(res, error);
  }
}; 
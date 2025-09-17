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
const { notifyClient, notifyRole } = require('../utils/websocket');
const OrderTracking = require('../models/OrderTracking');
const TrackingService = require('../utils/trackingService');
const { generateOrderFormPDF, getOrderFormData } = require('../utils/generateOrderForm');

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
        customerType: lead.leadType || 'end_user'
      });
    }

    // Financials from Quotation
    const purchaseTotalAmount = quotation.total; 

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

    // Create initial tracking record
    try {
      const trackingNumber = await OrderTracking.generateTrackingNumber();
      const tracking = new OrderTracking({
        purchaseId: customerPurchase._id,
        trackingNumber,
        currentStatus: 'order_placed'
      });

      await tracking.addEvent({
        status: 'order_placed',
        title: 'Order Placed',
        description: 'Your order has been successfully placed and is being processed.',
        isVisible: true
      }, req.user.id);

      // Add payment confirmation event
      await tracking.addEvent({
        status: 'payment_confirmed',
        title: 'Payment Confirmed',
        description: `Advance payment of ₹${calculatedAdvanceAmount} has been confirmed.`,
        isVisible: true
      }, req.user.id);
    } catch (trackingError) {
      console.error('Error creating tracking record:', trackingError);
      // Don't fail the main operation if tracking creation fails
    }

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
        select: 'quotationNumber total validUntil'
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

// Get purchases for the current logged-in user (or all purchases for admin)
exports.getCustomerPurchasesByUser = async (req, res) => {
  try {
    let purchases;
    
    if (req.user.role === 'admin') {
      // Admin can see ALL purchases from ALL customers
      purchases = await CustomerPurchase.find({})
        .populate({
          path: 'quotationId',
          select: 'quotationNumber total validUntil advancePaymentPercentage'
        })
        .populate({
          path: 'customerId',
          select: 'firstName lastName email phone businessName'
        })
        .sort({ purchaseDate: -1 }); // Newest first
    } else {
      // For regular customers, find their customer record
      const customer = await Customer.findOne({ user: req.user._id });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer record not found'
        });
      }

      // Find all purchases for this customer
      purchases = await CustomerPurchase.find({ customerId: customer._id })
        .populate({
          path: 'quotationId',
          select: 'quotationNumber total validUntil advancePaymentPercentage'
        })
        .sort({ purchaseDate: -1 }); // Newest first
    }

    // For each purchase, get the quotation items
    const purchasesWithItems = await Promise.all(
      purchases.map(async (purchase) => {
        let quotationItems = [];
        if (purchase.quotationId && purchase.quotationId._id) {
          quotationItems = await QuotationItem.find({ quotationId: purchase.quotationId._id })
            .populate('productId');
        }
        
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

// Record additional payment for a purchase (legacy/internal)
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

    // Update customer status based on their purchase orders
    await updateCustomerStatus(purchase.customerId);

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

// Customer records a manual payment for a purchase
// POST /api/customer-purchases/:purchaseId/payments/manual
exports.recordManualPayment = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { amount, paymentMethod, reference, paymentDate, notes } = req.body;

    const purchase = await CustomerPurchase.findById(purchaseId).populate('customerId');
    if (!purchase) throw new AppError('Purchase not found', 404);

    if (!req.user || req.user.role !== 'customer') {
      throw new AppError('Only customers can record manual payments', 403);
    }
    if (purchase.customerId && purchase.customerId.email && req.user.email && purchase.customerId.email !== req.user.email) {
      throw new AppError('Not authorized to record payment for this purchase', 403);
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) throw new AppError('Invalid amount', 400);
    if (amt > purchase.remainingAmount + 1e-6) throw new AppError('Amount exceeds remaining balance', 400);

    const allowedMethods = ['cash', 'check', 'bank_transfer', 'other'];
    if (!allowedMethods.includes(paymentMethod)) throw new AppError('Invalid payment method', 400);
    
    // For cash payments, reference is optional and will be auto-generated if not provided
    // For other payment methods, reference is required
    if (paymentMethod !== 'cash' && (!reference || typeof reference !== 'string' || !reference.trim())) {
      throw new AppError('Reference number is required for non-cash payments', 400);
    }

    const paidAt = paymentDate ? new Date(paymentDate) : new Date();
    if (isNaN(paidAt.getTime())) throw new AppError('Invalid payment date', 400);
    if (paidAt.getTime() > Date.now() + 60 * 1000) throw new AppError('Payment date cannot be in the future', 400);

    // Generate unique transaction ID for cash payments or use provided reference
    let transactionId;
    if (paymentMethod === 'cash') {
      // Generate unique transaction ID for cash payments
      transactionId = reference && reference.trim() ? reference.trim() : `CASH-${Date.now()}-${purchase.purchaseID}`;
    } else {
      transactionId = reference.trim();
    }

    try {
      const payment = await Payment.create({
        customerPurchaseId: purchase._id,
        amountPaid: amt,
        paymentMethod,
        transactionId: transactionId,
        notes: notes || '',
        paidAt,
        isAdvancePayment: false,
        createdBy: req.user._id
      });

      const newRemaining = Number((purchase.remainingAmount - amt).toFixed(2));
      purchase.remainingAmount = Math.max(newRemaining, 0);
      purchase.isFullyPaid = purchase.remainingAmount <= 0.01;
      purchase.paymentReviewStatus = 'pending_verification';
      await purchase.save();

      return res.status(201).json({
        success: true,
        message: 'Payment recorded and pending verification',
        data: { paymentId: payment._id, remainingAmount: purchase.remainingAmount, isFullyPaid: purchase.isFullyPaid }
      });
    } catch (err) {
      if (err && err.code === 11000 && err.keyPattern && err.keyPattern.transactionId) {
        throw new AppError('This reference number is already used. Please enter a unique reference.', 400);
      }
      throw err;
    }
  } catch (error) {
    errorHandler(res, error);
  }
};

// Accounts verifies a manual payment
exports.verifyManualPayment = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'accounts_department') throw new AppError('Only Accounts can verify payments', 403);
    const { purchaseId, paymentId } = req.params;
    const purchase = await CustomerPurchase.findById(purchaseId);
    if (!purchase) throw new AppError('Purchase not found', 404);
    const payment = await Payment.findById(paymentId);
    if (!payment || String(payment.customerPurchaseId) !== String(purchase._id)) throw new AppError('Payment not found for this purchase', 404);

    purchase.paymentReviewStatus = 'verified';
    await purchase.save();

    // Send WebSocket notification to accounts department for real-time update
    try {
      if (typeof notifyRole === 'function') {
        notifyRole('accounts_department', purchaseId, 'payment_verification');
      }
    } catch (error) {
      console.error('Error sending payment verification notification:', error);
    }

    return res.json({ success: true, message: 'Payment verified' });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Accounts rejects a manual payment (restores remaining)
exports.rejectManualPayment = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'accounts_department') throw new AppError('Only Accounts can reject payments', 403);
    const { purchaseId, paymentId } = req.params;
    const { reason } = req.body;
    const purchase = await CustomerPurchase.findById(purchaseId);
    if (!purchase) throw new AppError('Purchase not found', 404);
    const payment = await Payment.findById(paymentId);
    if (!payment || String(payment.customerPurchaseId) !== String(purchase._id)) throw new AppError('Payment not found for this purchase', 404);

    purchase.remainingAmount = Number((purchase.remainingAmount + payment.amountPaid).toFixed(2));
    purchase.isFullyPaid = purchase.remainingAmount <= 0.01;
    purchase.paymentReviewStatus = 'rejected';
    await purchase.save();

    payment.notes = `${payment.notes || ''} [Rejected: ${reason || 'no reason provided'}]`;
    await payment.save();

    return res.json({ success: true, message: 'Payment rejected and amount restored' });
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

// Get all payment history for the current customer (or all payments for admin)
exports.getAllPaymentHistory = async (req, res) => {
  try {
    let purchases;

    if (req.user.role === 'admin') {
      // Admin can see ALL payments from ALL customers
      purchases = await CustomerPurchase.find({})
        .populate({
          path: 'customerId',
          select: 'firstName lastName email phone businessName'
        })
        .sort({ createdAt: -1 });
    } else {
      // For regular customers, find their customer record
      const customer = await Customer.findOne({ user: req.user._id });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer record not found'
        });
      }

      // Find all purchases for this customer
      purchases = await CustomerPurchase.find({ customerId: customer._id });
    }
    
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
    
    // Enhance payment data with quotation and customer information
    const enhancedPayments = await Promise.all(payments.map(async (payment) => {
      const purchase = purchases.find(p => p._id.toString() === payment.customerPurchaseId.toString());
      if (!purchase) return payment;
      
      const quotation = await Quotation.findById(purchase.quotationId);
      const paymentObj = payment.toObject();
      
      // Add purchase and quotation info to payment record for display
      if (purchase) {
        paymentObj.purchaseID = purchase.purchaseID;
        
        // Add customer details for admin users
        if (req.user.role === 'admin' && purchase.customerId) {
          paymentObj.customer = {
            firstName: purchase.customerId.firstName,
            lastName: purchase.customerId.lastName,
            email: purchase.customerId.email,
            phone: purchase.customerId.phone,
            businessName: purchase.customerId.businessName
          };
        }
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
        select: 'quotationNumber total validUntil createdBy advancePaymentStatus',
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

// @desc    Get all purchase orders for the management page
// @route   GET /api/customer-purchases
// @access  Private (product_head, marketing_coordinator)
exports.getPurchaseOrdersForManagement = async (req, res) => {
  try {
    // These are the statuses relevant for the PO Management page
    const relevantStatuses = [
      'pending_assignment',
      'order_accepted', 
      'ready_to_dispatch', 
      'installation_date_allocated', 
      'assigned'
    ];

    const purchaseOrders = await CustomerPurchase.find({
      serviceTaskStatus: { $in: relevantStatuses },
    })
      .populate('customerId', 'firstName lastName')
      .populate('assignedEngineerId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      data: purchaseOrders,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Create a quotation with items based on lead's product interests
exports.createQuotationFromLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { quotationItems, total, validUntil, terms, notes } = req.body;

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
        total: (item.quantity * (item.unitPrice || product.price)) - (item.discount || 0)
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
    const { assignedEngineerId, serviceDueDate, serviceAssignmentNotes, installationDate } = req.body;

    if (!assignedEngineerId) {
      throw new AppError('Assigned engineer is required', 400);
    }

    const purchase = await CustomerPurchase.findById(purchaseId)
      .populate('quotationId', 'advancePaymentStatus');

    if (!purchase) {
      throw new AppError('Customer purchase not found', 404);
    }

    if (purchase.status !== 'active' || (purchase.quotationId && purchase.quotationId.advancePaymentStatus !== 'CONFIRMED')) {
      throw new AppError('Purchase is not active or advance payment not confirmed', 400);
    }

    // Check if purchase is ready for engineer assignment
    // Allow both 'installation_date_allocated' (new workflow) and 'assigned' (existing data)
    const validStatusesForAssignment = ['installation_date_allocated', 'assigned', 'ready_to_dispatch'];
    if (!validStatusesForAssignment.includes(purchase.serviceTaskStatus)) {
      throw new AppError(`Purchase must be ready for dispatch or have allocated installation date before assigning an engineer. Current status: ${purchase.serviceTaskStatus}`, 400);
    }

    // Handle installation date - allow assignment even if date not allocated yet
    if (!purchase.installationDate) {
      if (installationDate) {
        // Set installation date if provided in request
        purchase.installationDate = installationDate;
        if (purchase.serviceTaskStatus === 'ready_to_dispatch') {
          purchase.serviceTaskStatus = 'installation_date_allocated';
        }
      } else if (serviceDueDate) {
        // Use serviceDueDate as fallback installation date
        purchase.installationDate = serviceDueDate;
        if (purchase.serviceTaskStatus === 'ready_to_dispatch') {
          purchase.serviceTaskStatus = 'installation_date_allocated';
        }
      } else {
        throw new AppError('Installation date must be set. Please provide either installationDate or serviceDueDate in the request.', 400);
      }
    }
    
    // Check if the assignedEngineerId is a valid service engineer
    const engineer = await User.findOne({ _id: assignedEngineerId, role: 'service_engineer' });
    if (!engineer) {
      throw new AppError('Invalid Service Engineer selected or user is not a service engineer.', 404);
    }

    purchase.assignedEngineerId = assignedEngineerId;
    // Use the installation date that was set by the marketing coordinator
    purchase.serviceDueDate = purchase.installationDate;
    purchase.serviceAssignmentNotes = serviceAssignmentNotes || purchase.serviceAssignmentNotes;
    purchase.serviceTaskStatus = 'assigned';
    purchase.installationStatus = 'assigned'; // Initialize installation status
    
    await purchase.save();

    // Update tracking using service
    try {
      await TrackingService.updateFromPurchaseStatus(
        purchase._id, 
        'assigned', 
        req.user._id,
        {
          estimatedDate: new Date(purchase.installationDate),
          description: `Service engineer ${engineer.name} has been assigned for installation on ${new Date(purchase.installationDate).toLocaleDateString()}.`,
          metadata: { engineerId: assignedEngineerId, engineerName: engineer.name }
        }
      );
    } catch (trackingError) {
      console.error('Error updating tracking:', trackingError);
    }

    // Notify the assigned engineer
    try {
      const NotificationService = require('../utils/notificationService');
      await NotificationService.createInstallationNotification('engineer_assigned', purchase, req.user);
    } catch (notificationError) {
      console.error('Failed to create assignment notification:', notificationError);
    }

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

// @desc    Get all purchase orders for the management page
// @route   GET /api/customer-purchases
// @access  Private (product_head, marketing_coordinator)
exports.getPurchaseOrdersForManagement = async (req, res) => {
  try {
    // These are the statuses relevant for the PO Management page
    const relevantStatuses = [
      'pending_assignment',
      'order_accepted', 
      'ready_to_dispatch', 
      'installation_date_allocated', 
      'assigned'
    ];

    const purchaseOrders = await CustomerPurchase.find({
      serviceTaskStatus: { $in: relevantStatuses },
    })
      .populate('customerId', 'firstName lastName')
      .populate('assignedEngineerId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      data: purchaseOrders,
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

// @desc    Accept order and set estimated dispatch date
// @route   PUT /api/customer-purchases/:purchaseId/accept-order
// @access  Private (Product Head)
exports.acceptOrder = async (req, res) => {
  try {
    const { estimatedDispatchDate } = req.body;
    const purchase = await CustomerPurchase.findById(req.params.purchaseId).populate('customerId', 'firstName lastName');

    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    // Validate estimated dispatch date
    if (!estimatedDispatchDate) {
      throw new AppError('Estimated dispatch date is required', 400);
    }

    const dispatchDate = new Date(estimatedDispatchDate);
    if (dispatchDate < new Date()) {
      throw new AppError('Estimated dispatch date cannot be in the past', 400);
    }

    // Idempotent: if already accepted, return OK
    if (purchase.serviceTaskStatus === 'order_accepted') {
      return res.status(200).json({ success: true, message: 'Order already accepted', data: purchase });
    }

    // Order can only be accepted from pending_assignment status
    if (purchase.serviceTaskStatus !== 'pending_assignment') {
      throw new AppError(`Order must be in 'pending_assignment' status to accept. Current status: ${purchase.serviceTaskStatus}`, 400);
    }

    purchase.serviceTaskStatus = 'order_accepted';
    purchase.estimatedDispatchDate = dispatchDate;
    purchase.updatedAt = new Date();
    await purchase.save();

    // Update tracking using service
    try {
      await TrackingService.updateFromPurchaseStatus(
        purchase._id, 
        'order_accepted', 
        req.user._id,
        {
          estimatedDate: dispatchDate,
          description: `Your order has been accepted by production. Estimated dispatch date: ${dispatchDate.toLocaleDateString()}.`
        }
      );
    } catch (trackingError) {
      console.error('Error updating tracking:', trackingError);
    }

    // Send notification
    try {
      const NotificationService = require('../utils/notificationService');
      await NotificationService.createPurchaseOrderNotification('order_accepted', purchase, req.user);
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
      data: purchase,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Update purchase status to 'Ready to Dispatch'
// @route   PUT /api/customer-purchases/:purchaseId/ready-to-dispatch
// @access  Private (Product Head)
exports.updateStatusToReadyToDispatch = async (req, res) => {
  try {
    const purchase = await CustomerPurchase.findById(req.params.purchaseId).populate('customerId', 'firstName lastName');

    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    // Idempotent: if already set, return OK
    if (purchase.serviceTaskStatus === 'ready_to_dispatch') {
      return res.status(200).json({ success: true, message: 'Already ready_to_dispatch', data: purchase });
    }

    // Updated: Order must be accepted before marking as ready to dispatch
    if (purchase.serviceTaskStatus !== 'order_accepted') {
      throw new AppError(`Purchase status must be 'order_accepted' to mark as ready to dispatch. Current status: ${purchase.serviceTaskStatus}`, 400);
    }

    purchase.serviceTaskStatus = 'ready_to_dispatch';
    purchase.updatedAt = new Date();
    await purchase.save();

    // Update tracking using service
    try {
      await TrackingService.updateFromPurchaseStatus(
        purchase._id, 
        'ready_to_dispatch', 
        req.user._id
      );
    } catch (trackingError) {
      console.error('Error updating tracking:', trackingError);
    }

    res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Allocate installation date for a purchase
// @route   PUT /api/customer-purchases/:purchaseId/allocate-installation-date
// @access  Private (Marketing Coordinator)
exports.allocateInstallationDate = async (req, res) => {
  try {
    const { installationDate } = req.body;
    if (!installationDate) {
      throw new AppError('Installation date is required', 400);
    }

    const purchase = await CustomerPurchase.findById(req.params.purchaseId);

    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    if (purchase.serviceTaskStatus !== 'ready_to_dispatch') {
      throw new AppError('Purchase is not yet ready for dispatch', 400);
    }

    purchase.installationDate = installationDate;
    purchase.serviceTaskStatus = 'installation_date_allocated';
    await purchase.save();

    // Update tracking
    try {
      const tracking = await OrderTracking.findOne({ purchaseId: purchase._id });
      if (tracking) {
        // Update estimated installation date
        tracking.estimatedInstallation = new Date(installationDate);
        await tracking.save();

        await tracking.addEvent({
          status: 'installation_scheduled',
          title: 'Installation Scheduled',
          description: `Installation has been scheduled for ${new Date(installationDate).toLocaleDateString()}.`,
          estimatedDate: new Date(installationDate),
          isVisible: true
        }, req.user.id);
      }
    } catch (trackingError) {
      console.error('Error updating tracking:', trackingError);
    }

    // Send WhatsApp notification to assigned engineer if already assigned
    if (purchase.assignedEngineerId) {
      try {
        const NotificationService = require('../utils/notificationService');
        await NotificationService.createInstallationNotification('installation_scheduled', purchase, req.user);
      } catch (notificationError) {
        console.error('Failed to create installation scheduled notification:', notificationError);
      }
    }

    res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get all customers for management
// @route   GET /api/customers
// @access  Private (sales_head, sales_person, marketing_coordinator)
exports.getAllCustomers = async (req, res) => {
  try {
    const userRole = req.user.role;
    let query = {};

    // Role-based filtering: sales_person can only see their own customers
    if (userRole === 'sales_person') {
      // Find leads created by this sales person, then find customers created from those leads
      const userLeads = await Lead.find({ createdBy: req.user.id });
      const leadIds = userLeads.map(lead => lead._id);
      query.leadId = { $in: leadIds };
    }

    const customers = await Customer.find(query)
      .populate({
        path: 'leadId',
        select: 'leadNumber source createdBy',
        populate: {
          path: 'createdBy',
          select: 'name email'
        }
      })
      .populate({
        path: 'user',
        select: 'name email'
      })
      .sort({ createdAt: -1 });

    // Get purchase data for each customer and update their status
    const customersWithPurchases = await Promise.all(
      customers.map(async (customer) => {
        const purchases = await CustomerPurchase.find({ customerId: customer._id })
          .populate('quotationId', 'quotationNumber total')
          .sort({ createdAt: -1 });

        const totalPurchases = purchases.length;
        const totalValue = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
        const fullyPaidCount = purchases.filter(purchase => purchase.isFullyPaid).length;
        const activeCount = purchases.filter(purchase => purchase.status === 'active').length;

        // Update customer status based on active purchases
        const hasActivePurchases = purchases.some(purchase => purchase.status === 'active');
        const newStatus = hasActivePurchases ? 'active' : 'inactive';
        
        // Update the customer status in database if it's different
        if (customer.status !== newStatus) {
          await Customer.findByIdAndUpdate(customer._id, { status: newStatus });
          customer.status = newStatus; // Update the local object as well
        }

        return {
          ...customer.toObject(),
          purchaseStats: {
            totalPurchases,
            totalValue,
            fullyPaidCount,
            activeCount,
            latestPurchase: purchases[0] || null
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      count: customersWithPurchases.length,
      data: customersWithPurchases
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Export new manual payment functions for routing
exports.recordManualPayment = exports.recordManualPayment;
exports.verifyManualPayment = exports.verifyManualPayment;
exports.rejectManualPayment = exports.rejectManualPayment;

// Utility function to update customer status based on purchase orders
const updateCustomerStatus = async (customerId) => {
  try {
    // Find all purchase orders for this customer
    const purchases = await CustomerPurchase.find({ customerId });
    
    // Check if customer has any active purchase orders
    const hasActivePurchases = purchases.some(purchase => purchase.status === 'active');
    
    // Update customer status
    const newStatus = hasActivePurchases ? 'active' : 'inactive';
    
    await Customer.findByIdAndUpdate(customerId, { status: newStatus });
    
    return newStatus;
  } catch (error) {
    console.error('Error updating customer status:', error);
    throw error;
  }
};

// Export the utility function
exports.updateCustomerStatus = updateCustomerStatus;

// @desc    Generate Order Form PDF
// @route   GET /api/customer-purchases/:id/order-form/pdf
// @access  Private (Customer or Internal)
exports.generateOrderFormPDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify access permissions
    const purchase = await CustomerPurchase.findById(id).populate('customerId');
    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    // Check if user has access to this purchase
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ user: req.user._id });
      if (!customer || customer._id.toString() !== purchase.customerId._id.toString()) {
        throw new AppError('Access denied', 403);
      }
    }

    const pdfBuffer = await generateOrderFormPDF(id);
    
    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Order_Form_${purchase.purchaseID}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating Order Form PDF:', error);
    errorHandler(res, error);
  }
};

// @desc    Get Order Form data
// @route   GET /api/customer-purchases/:id/order-form/data
// @access  Private (Customer or Internal)
exports.getOrderFormData = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify access permissions
    const purchase = await CustomerPurchase.findById(id).populate('customerId');
    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    // Check if user has access to this purchase
    if (req.user.role === 'customer') {
      const customer = await Customer.findOne({ user: req.user._id });
      if (!customer || customer._id.toString() !== purchase.customerId._id.toString()) {
        throw new AppError('Access denied', 403);
      }
    }

    const orderFormData = await getOrderFormData(id);
    
    res.json({
      success: true,
      data: orderFormData
    });
  } catch (error) {
    console.error('Error getting Order Form data:', error);
    errorHandler(res, error);
  }
};

// Get all pending approvals for accounts department (both quotation and remaining payment approvals)
exports.getAllPendingApprovals = async (req, res) => {
  try {
    // Only accounts department and admin can access this endpoint
    if (!req.user || (req.user.role !== 'accounts_department' && req.user.role !== 'admin')) {
      throw new AppError('Only accounts department and admin can view pending approvals', 403);
    }

    const approvals = [];

    // 1. Get quotation approvals (advance payment approvals)
    const Quotation = require('../models/Quotation');
    const quotationApprovals = await Quotation.find({ 
      status: 'pending_approval' 
    })
    .populate({
      path: 'lead',
      select: 'firstName lastName email phone'
    })
    .populate({
      path: 'createdBy',
      select: 'name email'
    })
    .sort({ updatedAt: -1 });

    // Format quotation approvals
    for (const quotation of quotationApprovals) {
      approvals.push({
        _id: quotation._id,
        type: 'quotation_approval', // Type identifier
        quotationNumber: quotation.quotationNumber,
        quotationId: quotation._id,
        lead: quotation.lead,
        createdBy: quotation.createdBy,
        total: quotation.total,
        advancePaymentAmount: quotation.advancePaymentAmount,
        advancePaymentStatus: quotation.advancePaymentStatus,
        advancePaymentConfirmedAt: quotation.advancePaymentConfirmedAt,
        paymentMethod: quotation.paymentMethod,
        paymentDate: quotation.paymentDate,
        offlineTransactionNo: quotation.offlineTransactionNo,
        razorpayPaymentId: quotation.razorpayPaymentId,
        paymentNotes: quotation.paymentNotes,
        createdAt: quotation.createdAt,
        updatedAt: quotation.updatedAt,
        // For compatibility with existing frontend
        status: quotation.status
      });
    }

    // 2. Get remaining payment approvals
    const remainingPaymentApprovals = await CustomerPurchase.find({
      paymentReviewStatus: 'pending_verification'
    })
    .populate({
      path: 'customerId',
      select: 'firstName lastName email phone'
    })
    .populate({
      path: 'quotationId',
      select: 'quotationNumber createdBy',
      populate: {
        path: 'createdBy',
        select: 'name email'
      }
    })
    .sort({ updatedAt: -1 });

    // Get the latest payment for each purchase that's pending verification
    for (const purchase of remainingPaymentApprovals) {
      const latestPayment = await Payment.findOne({
        customerPurchaseId: purchase._id,
        isAdvancePayment: false
      })
      .populate('createdBy', 'name email')
      .sort({ paidAt: -1 });

      if (latestPayment) {
        approvals.push({
          _id: purchase._id,
          type: 'remaining_payment_approval', // Type identifier
          quotationNumber: purchase.quotationId?.quotationNumber || 'N/A',
          quotationId: purchase.quotationId?._id,
          purchaseId: purchase._id,
          lead: {
            firstName: purchase.customerId?.firstName || 'N/A',
            lastName: purchase.customerId?.lastName || '',
            email: purchase.customerId?.email || 'N/A',
            phone: purchase.customerId?.phone || 'N/A'
          },
          createdBy: purchase.quotationId?.createdBy || { name: 'N/A' },
          total: purchase.totalAmount,
          // For remaining payments, show payment amount instead of advance
          advancePaymentAmount: latestPayment.amountPaid,
          advancePaymentStatus: purchase.paymentReviewStatus,
          advancePaymentConfirmedAt: null,
          paymentMethod: latestPayment.paymentMethod,
          paymentDate: latestPayment.paidAt,
          offlineTransactionNo: latestPayment.transactionId,
          razorpayPaymentId: null,
          paymentNotes: latestPayment.notes,
          createdAt: purchase.createdAt,
          updatedAt: purchase.updatedAt,
          // Additional fields for remaining payments
          remainingAmount: purchase.remainingAmount,
          paymentId: latestPayment._id,
          paymentCreatedBy: latestPayment.createdBy,
          // For compatibility with existing frontend
          status: 'pending_approval'
        });
      }
    }

    // Sort all approvals by updatedAt descending
    approvals.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({
      success: true,
      count: approvals.length,
      data: approvals
    });

  } catch (error) {
    console.error('Error getting pending approvals:', error);
    errorHandler(res, error);
  }
};

// Get all approved payments for accounts department (both quotation and remaining payment approvals)
exports.getAllApprovedPayments = async (req, res) => {
  try {
    // Only accounts department and admin can access this endpoint
    if (!req.user || (req.user.role !== 'accounts_department' && req.user.role !== 'admin')) {
      throw new AppError('Only accounts department and admin can view approved payments', 403);
    }

    const approvedPayments = [];

    // 1. Get approved quotations (advance payment approvals)
    const Quotation = require('../models/Quotation');
    const approvedQuotations = await Quotation.find({ 
      status: 'approved' 
    })
    .populate({
      path: 'lead',
      select: 'firstName lastName email phone'
    })
    .populate({
      path: 'createdBy',
      select: 'name email'
    })
    .sort({ updatedAt: -1 });

    // Format approved quotations
    for (const quotation of approvedQuotations) {
      approvedPayments.push({
        _id: quotation._id,
        type: 'quotation_approval', // Type identifier
        quotationNumber: quotation.quotationNumber,
        quotationId: quotation._id,
        lead: quotation.lead,
        createdBy: quotation.createdBy,
        total: quotation.total,
        advancePaymentAmount: quotation.advancePaymentAmount,
        advancePaymentStatus: quotation.advancePaymentStatus,
        advancePaymentConfirmedAt: quotation.advancePaymentConfirmedAt,
        paymentMethod: quotation.paymentMethod,
        paymentDate: quotation.paymentDate,
        offlineTransactionNo: quotation.offlineTransactionNo,
        razorpayPaymentId: quotation.razorpayPaymentId,
        paymentNotes: quotation.paymentNotes,
        createdAt: quotation.createdAt,
        updatedAt: quotation.updatedAt,
        // For compatibility with existing frontend
        status: quotation.status
      });
    }

    // 2. Get approved remaining payments
    const approvedRemainingPayments = await CustomerPurchase.find({
      paymentReviewStatus: 'verified'
    })
    .populate({
      path: 'customerId',
      select: 'firstName lastName email phone'
    })
    .populate({
      path: 'quotationId',
      select: 'quotationNumber createdBy',
      populate: {
        path: 'createdBy',
        select: 'name email'
      }
    })
    .sort({ updatedAt: -1 });

    // Get the latest verified payment for each purchase
    for (const purchase of approvedRemainingPayments) {
      const latestPayment = await Payment.findOne({
        customerPurchaseId: purchase._id,
        isAdvancePayment: false
      })
      .populate('createdBy', 'name email')
      .sort({ paidAt: -1 });

      if (latestPayment) {
        approvedPayments.push({
          _id: purchase._id,
          type: 'remaining_payment_approval', // Type identifier
          quotationNumber: purchase.quotationId?.quotationNumber || 'N/A',
          quotationId: purchase.quotationId?._id,
          purchaseId: purchase._id,
          lead: {
            firstName: purchase.customerId?.firstName || 'N/A',
            lastName: purchase.customerId?.lastName || '',
            email: purchase.customerId?.email || 'N/A',
            phone: purchase.customerId?.phone || 'N/A'
          },
          createdBy: purchase.quotationId?.createdBy || { name: 'N/A' },
          total: purchase.totalAmount,
          // For remaining payments, show payment amount instead of advance
          advancePaymentAmount: latestPayment.amountPaid,
          advancePaymentStatus: purchase.paymentReviewStatus,
          advancePaymentConfirmedAt: null,
          paymentMethod: latestPayment.paymentMethod,
          paymentDate: latestPayment.paidAt,
          offlineTransactionNo: latestPayment.transactionId,
          razorpayPaymentId: null,
          paymentNotes: latestPayment.notes,
          createdAt: purchase.createdAt,
          updatedAt: purchase.updatedAt,
          // Additional fields for remaining payments
          remainingAmount: purchase.remainingAmount,
          paymentId: latestPayment._id,
          paymentCreatedBy: latestPayment.createdBy,
          // For compatibility with existing frontend
          status: 'approved'
        });
      }
    }

    // Sort all approved payments by updatedAt descending
    approvedPayments.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({
      success: true,
      count: approvedPayments.length,
      data: approvedPayments
    });

  } catch (error) {
    console.error('Error getting approved payments:', error);
    errorHandler(res, error);
  }
};
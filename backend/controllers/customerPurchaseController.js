const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Quotation = require('../models/Quotation');
const CustomerPurchase = require('../models/CustomerPurchase');
const Payment = require('../models/Payment');
const QuotationItem = require('../models/QuotationItem');
const Product = require('../models/Product');
const { AppError, errorHandler } = require('../utils/errorHandler');

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

    // Calculate values
    const calculatedAdvanceAmount = advanceAmount || (quotation.total * (quotation.advancePaymentPercentage / 100));
    const remainingAmount = quotation.total - calculatedAdvanceAmount;

    // Generate a unique purchase ID
    const purchaseCount = await CustomerPurchase.countDocuments();
    const purchaseID = `PO-${String(purchaseCount + 1).padStart(5, '0')}`;

    // Create customer purchase
    const customerPurchase = await CustomerPurchase.create({
      purchaseID,
      customerId: customer._id,
      quotationId: quotation._id,
      advancePaid: calculatedAdvanceAmount,
      totalAmount: quotation.total,
      remainingAmount: remainingAmount,
      isFullyPaid: remainingAmount <= 0,
      paymentMethod: paymentMethod || 'cash',
      status: 'active'
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
    lead.interestStage = 'quotation_sent';
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
        select: 'firstName lastName email phone businessName'
      })
      .populate({
        path: 'quotationId',
        select: 'quotationNumber subtotal tax total validUntil'
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

    // Update lead status
    lead.interestStage = 'in_negotiation';
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
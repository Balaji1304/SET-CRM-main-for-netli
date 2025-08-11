const Payment = require('../models/Payment');
const CustomerPurchase = require('../models/CustomerPurchase');
const { AppError, errorHandler } = require('../utils/errorHandler');

// @desc    Initiate a new payment for approval
// @route   POST /api/payments
// @access  Private (Salesperson)
exports.initiatePayment = async (req, res, next) => {
  try {
    const {
      customerPurchaseId,
      amountPaid,
      paymentDate,
      paymentMethod,
      referenceNumber,
      remarks
    } = req.body;

    if (!customerPurchaseId || !amountPaid || !paymentDate || !paymentMethod) {
      throw new AppError('Missing required payment details', 400);
    }

    const purchase = await CustomerPurchase.findById(customerPurchaseId);
    if (!purchase) {
      throw new AppError('Customer purchase not found', 404);
    }

    if (amountPaid > purchase.remainingAmount) {
      throw new AppError('Paid amount cannot be greater than the remaining amount', 400);
    }

    const payment = await Payment.create({
      customerPurchaseId,
      amountPaid,
      paymentDate,
      paymentMethod,
      referenceNumber,
      remarks,
      initiatedBy: req.user.id,
      status: 'pending_approval'
    });
    
    // Optionally, trigger a notification to the Accounts Department here

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments pending approval
// @route   GET /api/payments/pending
// @access  Private (Accounts Department)
exports.getPendingPayments = async (req, res, next) => {
  try {
    const pendingPayments = await Payment.find({ status: 'pending_approval' })
      .populate({
        path: 'customerPurchaseId',
        select: 'purchaseID totalAmount remainingAmount customerId',
        populate: {
          path: 'customerId',
          select: 'firstName lastName email'
        }
      })
      .populate('initiatedBy', 'name email');

    res.status(200).json({
      success: true,
      count: pendingPayments.length,
      data: pendingPayments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments for a specific purchase
// @route   GET /api/payments/purchase/:purchaseId
// @access  Private (Salesperson, Accounts Department)
exports.getPaymentsByPurchase = async (req, res, next) => {
  try {
    const { purchaseId } = req.params;
    const payments = await Payment.find({ customerPurchaseId: purchaseId })
      .populate('initiatedBy', 'name')
      .populate('approvedBy', 'name');

    if (!payments) {
      throw new AppError('No payments found for this purchase', 404);
    }

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a payment
// @route   PUT /api/payments/:id/approve
// @access  Private (Accounts Department)
exports.approvePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (payment.status !== 'pending_approval') {
      throw new AppError('Payment is not pending approval', 400);
    }

    const purchase = await CustomerPurchase.findById(payment.customerPurchaseId);
    if (!purchase) {
      throw new AppError('Associated customer purchase not found', 404);
    }
    
    // Update payment status
    payment.status = 'approved';
    payment.approvedBy = req.user.id;
    payment.approvedAt = Date.now();
    payment.updatedBy = req.user.id;
    await payment.save();

    // Update purchase amounts
    const newRemainingAmount = purchase.remainingAmount - payment.amountPaid;
    purchase.remainingAmount = newRemainingAmount;
    purchase.isFullyPaid = newRemainingAmount <= 0;
    await purchase.save();

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a payment
// @route   PUT /api/payments/:id/reject
// @access  Private (Accounts Department)
exports.rejectPayment = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
      throw new AppError('Rejection reason is required', 400);
    }

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    if (payment.status !== 'pending_approval') {
      throw new AppError('Payment is not pending approval', 400);
    }

    payment.status = 'rejected';
    payment.rejectionReason = rejectionReason;
    payment.approvedBy = req.user.id; // Or a separate 'rejectedBy' field
    payment.approvedAt = Date.now();   // Or a separate 'rejectedAt' field
    payment.updatedBy = req.user.id;
    await payment.save();

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Helper function to create an invoice if the purchase is fully paid
async function createInvoiceIfFullyPaid(purchaseId, userId) {
  const Invoice = require('../models/Invoice');
  const CustomerPurchase = require('../models/CustomerPurchase');
  const QuotationItem = require('../models/QuotationItem');
  const Product = require('../models/Product');

  const purchase = await CustomerPurchase.findById(purchaseId)
    .populate('customerId')
    .populate('quotationId', 'lead');

  if (!purchase) {
    console.error(`createInvoiceIfFullyPaid: Purchase not found for ID ${purchaseId}`);
    return;
  }

  if (!purchase.isFullyPaid) {
    console.log(`createInvoiceIfFullyPaid: Purchase ${purchaseId} is not fully paid. Invoice not generated.`);
    return;
  }

  const existingInvoice = await Invoice.findOne({ customerPurchase: purchaseId });
  if (existingInvoice) {
    console.log(`createInvoiceIfFullyPaid: Invoice already exists for purchase ${purchaseId}.`);
    return;
  }

  const quotationItems = await QuotationItem.find({ quotationId: purchase.quotationId._id })
    .populate('productId', 'name description');

  if (!quotationItems || quotationItems.length === 0) {
    console.error(`createInvoiceIfFullyPaid: No quotation items found for quotation ${purchase.quotationId._id}. Cannot generate invoice items.`);
    return;
  }

  const invoiceNumber = await Invoice.generateInvoiceNumber();

  const itemsForInvoice = quotationItems.map(qItem => ({
    product: qItem.productId._id,
    name: qItem.productId.name,
    description: qItem.productId.description,
    quantity: qItem.quantity,
    unitPrice: qItem.unitPrice,
    discountPercentage: qItem.discount || 0,
    itemTotal: qItem.total
  }));

  const invoiceTotalAmount = purchase.totalAmount;
  
  const sumOfItemTotals = itemsForInvoice.reduce((sum, item) => sum + (item.itemTotal || 0), 0);
  if (Math.abs(sumOfItemTotals - invoiceTotalAmount) > 0.01) {
      console.warn(`Discrepancy: Sum of invoice item totals (${sumOfItemTotals}) does not match CustomerPurchase total (${invoiceTotalAmount}) for CP ID ${purchaseId}.`);
  }

  const companyDetails = {
    name: process.env.COMPANY_NAME || "Sunlit Systems",
    address: process.env.COMPANY_ADDRESS || "#27, Dr. Jaganatha Nagar, Near CIT, Opp. to CMC, Coimbatore - 641 014",
    phone: process.env.COMPANY_PHONE || " +919842291069",
    email: process.env.COMPANY_EMAIL || "info@sunlitsolarindia.com",
    logoUrl: process.env.COMPANY_LOGO_URL || "https://res.cloudinary.com/dcua87ney/image/upload/v1746715647/logo2_kmndu4.png",
    taxId: process.env.COMPANY_TAX_ID || "GSTIN1234567890"
  };

  let customerDetails = {
    name: purchase.customerId?.name || `${purchase.customerId?.firstName} ${purchase.customerId?.lastName}`.trim() || 'N/A',
    email: purchase.customerId?.email || 'N/A',
    phone: purchase.customerId?.phone || 'N/A',
    billingAddress: purchase.customerId?.billingAddress || purchase.customerId?.address || (purchase.quotationId?.lead ? purchase.quotationId.lead.address : 'N/A'),
    shippingAddress: purchase.customerId?.shippingAddress || purchase.customerId?.billingAddress || purchase.customerId?.address || (purchase.quotationId?.lead ? purchase.quotationId.lead.address : 'N/A')
  };
  
  if (purchase.customerId && purchase.quotationId && purchase.quotationId.lead && customerDetails.name === 'N/A') {
    const lead = purchase.quotationId.lead;
    customerDetails.name = `${lead.firstName} ${lead.lastName}`.trim();
    customerDetails.email = lead.email;
    customerDetails.phone = lead.phone;
    customerDetails.billingAddress = lead.address;
  }

  const newInvoice = new Invoice({
    invoiceNumber,
    customer: purchase.customerId._id,
    quotation: purchase.quotationId._id,
    customerPurchase: purchaseId,
    items: itemsForInvoice,
    totalAmount: invoiceTotalAmount,
    paidAmount: invoiceTotalAmount,
    paymentStatus: 'PAID',
    issueDate: new Date(),
    companyDetails,
    customerDetails,
    createdBy: userId
  });

  await newInvoice.save();
  console.log(`Invoice ${invoiceNumber} generated successfully for purchase ${purchaseId} using CustomerPurchase financials.`);
} 

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
    next(error);
  }
}; 
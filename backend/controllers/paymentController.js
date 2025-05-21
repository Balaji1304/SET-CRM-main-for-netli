const User = require('../models/User');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const CustomerPurchase = require('../models/CustomerPurchase');
const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');
const Payment = require('../models/Payment');
const { errorHandler, AppError } = require('../utils/errorHandler');
const razorpay = require('../config/razorpay');
const shortid = require('shortid');

// Get customer's products and purchases
exports.getCustomerProducts = async (req, res) => {
  try {
    // Verify user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find customer record associated with this user's email
    const customer = await Customer.findOne({ email: user.email });
    
    if (!customer) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Find all purchases made by this customer
    const customerPurchases = await CustomerPurchase.find({ 
      customerId: customer._id 
    }).populate({
      path: 'quotationId',
      select: 'quotationNumber advancePaymentPercentage advancePaymentConfirmedAt advancePaymentAmount'
    });
    
    if (!customerPurchases || customerPurchases.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Get quotation IDs to fetch quotation items
    const quotationIds = customerPurchases.map(purchase => purchase.quotationId._id);
    
    // Get all quotation items with product details
    const quotationItems = await QuotationItem.find({
      quotationId: { $in: quotationIds }
    }).populate('productId');
    
    // Format and return the data
    const products = customerPurchases.map(purchase => {
      const items = quotationItems.filter(item => 
        item.quotationId.toString() === purchase.quotationId._id.toString()
      );
      
      return {
        purchaseId: purchase._id,
        quotationNumber: purchase.quotationId.quotationNumber,
        purchaseDate: purchase.purchaseDate,
        totalAmount: purchase.totalAmount,
        advancePaid: purchase.advancePaid,
        remainingAmount: purchase.remainingAmount,
        isFullyPaid: purchase.isFullyPaid,
        items: items.map(item => ({
          product: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice
        }))
      };
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Get customer's pending payments
exports.getPendingPayments = async (req, res) => {
  try {
    // Verify user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find customer record
    const customer = await Customer.findOne({ email: user.email });
    if (!customer) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get all purchases that aren't fully paid
    const pendingPurchases = await CustomerPurchase.find({
      customerId: customer._id,
      isFullyPaid: false
    }).populate({
      path: 'quotationId',
      select: 'quotationNumber total advancePaymentAmount advancePaymentConfirmedAt razorpayPaymentLink razorpayPaymentId'
    });

    // Format the response
    const formattedPurchases = pendingPurchases.map(purchase => ({
      _id: purchase._id,
      quotationNumber: purchase.quotationId.quotationNumber,
      total: purchase.totalAmount,
      advancePaid: purchase.advancePaid,
      remainingAmount: purchase.remainingAmount,
      purchaseDate: purchase.purchaseDate,
      razorpayPaymentLink: purchase.quotationId.razorpayPaymentLink,
      razorpayPaymentId: purchase.quotationId.razorpayPaymentId
    }));

    res.json({
      success: true,
      data: formattedPurchases
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// Record a new payment
exports.recordPayment = async (req, res) => {
  try {
    const { purchaseId, amount, paymentMethod, transactionId, notes } = req.body;

    // Validate input
    if (!purchaseId || !amount || amount <= 0) {
      throw new AppError('Invalid payment details', 400);
    }

    // Find the purchase
    const purchase = await CustomerPurchase.findById(purchaseId);
    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    // Verify this purchase belongs to the customer
    const customer = await Customer.findOne({ email: req.user.email });
    if (!customer || purchase.customerId.toString() !== customer._id.toString()) {
      throw new AppError('Not authorized to make payment for this purchase', 403);
    }

    // Validate payment amount
    if (amount > purchase.remainingAmount) {
      throw new AppError('Payment amount cannot exceed remaining balance', 400);
    }

    // Create payment record
    const payment = await Payment.create({
      customerPurchaseId: purchaseId,
      amountPaid: amount,
      paymentMethod: paymentMethod || 'online',
      transactionId: transactionId || '',
      notes: notes || '',
      createdBy: req.user.id
    });

    // Update purchase
    const newRemainingAmount = purchase.remainingAmount - amount;
    purchase.remainingAmount = newRemainingAmount;
    purchase.isFullyPaid = newRemainingAmount <= 0;
    await purchase.save();

    // If fully paid, attempt to generate an invoice
    if (purchase.isFullyPaid) {
      try {
        await createInvoiceIfFullyPaid(purchase._id, req.user.id);
      } catch (invoiceError) {
        console.error(`Failed to generate invoice for purchase ${purchase._id}:`, invoiceError);
        // Decide if this error should be sent to the client or just logged
        // For now, we'll just log it and not interrupt the payment success response
      }
    }

    res.json({
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

// Create a Razorpay payment link for remaining payment
exports.createRemainingPaymentLink = async (req, res) => {
  try {
    const { purchaseId } = req.params;
    
    if (!purchaseId) {
      throw new AppError('Purchase ID is required', 400);
    }

    // Find the purchase
    const purchase = await CustomerPurchase.findById(purchaseId).populate({
      path: 'quotationId',
      select: 'quotationNumber customerId'
    });
    
    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }

    // Verify this purchase belongs to the customer
    const customer = await Customer.findOne({ email: req.user.email });
    if (!customer || purchase.customerId.toString() !== customer._id.toString()) {
      throw new AppError('Not authorized to make payment for this purchase', 403);
    }

    // Verify that there is a remaining amount to pay
    if (purchase.remainingAmount <= 0 || purchase.isFullyPaid) {
      throw new AppError('This purchase is already fully paid', 400);
    }

    // Get customer details
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Create a unique reference ID (shortened to avoid Razorpay's 40 char limit)
    // Use only the last 8 chars of the purchase ID to keep it short
    const purchaseIdShort = purchase._id.toString().slice(-8);
    const referenceId = `rem_${purchaseIdShort}_${shortid.generate().substring(0, 8)}`;
    
    // Convert amount to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(purchase.remainingAmount * 100);
    
    // Validate the amount is above Razorpay minimum
    if (amountInPaise < 100) {
      throw new AppError('Payment amount is below the minimum threshold (₹1)', 400);
    }
    
    try {
      // Create payment link
      const paymentLink = await razorpay.paymentLink.create({
        amount: amountInPaise,
        currency: "INR",
        accept_partial: false,
        description: `Remaining payment for Order #${purchase.quotationId.quotationNumber}`,
        customer: {
          name: user.name,
          email: user.email,
          contact: customer.phone || ''
        },
        notify: {
          sms: true,
          email: true
        },
        reminder_enable: true,
        notes: {
          purchaseId: purchase._id.toString(),
          quotationId: purchase.quotationId._id.toString(),
          paymentType: 'remaining'
        },
        callback_url: `${process.env.FRONTEND_URL}/dashboard/payment-success?purchase=${purchase._id}`,
        callback_method: 'get',
        reference_id: referenceId
      });
      
      // Update purchase with payment link details
      purchase.razorpayPaymentLink = paymentLink.short_url;
      purchase.razorpayPaymentId = paymentLink.id;
      await purchase.save();
      
      res.json({
        success: true,
        data: {
          paymentLink: paymentLink.short_url,
          paymentLinkId: paymentLink.id,
          purchase: {
            id: purchase._id,
            remainingAmount: purchase.remainingAmount,
            quotationNumber: purchase.quotationId.quotationNumber
          }
        }
      });
    } catch (error) {
      console.error('Razorpay payment link creation error:', error);
      
      // Handle different Razorpay error scenarios
      if (error.statusCode === 401) {
        throw new AppError('Razorpay authentication failed. Please contact support.', 500);
      } else if (error.statusCode === 400) {
        throw new AppError(`Razorpay error: ${error.error.description || 'Invalid request parameters'}`, 400);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new AppError('Cannot connect to payment service. Please try again later.', 503);
      } else {
        throw new AppError(`Failed to create payment link: ${error.message}`, 500);
      }
    }
  } catch (error) {
    errorHandler(res, error);
  }
};

// Verify Razorpay payment status and record the payment
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { purchaseId, paymentLinkId } = req.params;
    
    if (!purchaseId || !paymentLinkId) {
      throw new AppError('Purchase ID and Payment Link ID are required', 400);
    }
    
    // Find the purchase
    const purchase = await CustomerPurchase.findById(purchaseId);
    if (!purchase) {
      throw new AppError('Purchase not found', 404);
    }
    
    // Verify this purchase belongs to the customer
    const customer = await Customer.findOne({ email: req.user.email });
    if (!customer || purchase.customerId.toString() !== customer._id.toString()) {
      throw new AppError('Not authorized to verify payment for this purchase', 403);
    }
    
    // Check if payment has already been verified and recorded
    const existingPayment = await Payment.findOne({
      customerPurchaseId: purchaseId,
      transactionId: paymentLinkId,
      paymentMethod: 'razorpay'
    });
    
    if (existingPayment) {
      return res.json({
        success: true,
        data: {
          verified: true,
          payment: existingPayment,
          purchase,
          alreadyVerified: true
        }
      });
    }
    
    try {
      // Verify payment status with Razorpay
      const verification = await razorpay.verifyPaymentLinkStatus(paymentLinkId);
      
      if (verification.verified) {
        // Payment was successful, record it in our database
        try {
          const payment = await Payment.create({
            customerPurchaseId: purchaseId,
            amountPaid: purchase.remainingAmount,
            paymentMethod: 'razorpay',
            transactionId: paymentLinkId,
            notes: `Razorpay payment for remaining amount of order #${purchase.quotationId}`,
            createdBy: req.user.id
          });
          
          // Update purchase
          purchase.remainingAmount = 0;
          purchase.isFullyPaid = true;
          purchase.paymentMethod = 'razorpay';
          await purchase.save();

          // If fully paid, attempt to generate an invoice
          if (purchase.isFullyPaid) {
            try {
              await createInvoiceIfFullyPaid(purchase._id, req.user.id);
            } catch (invoiceError) {
              console.error(`Failed to generate invoice for purchase ${purchase._id} after Razorpay verification:`, invoiceError);
              // Log the error, but don't let it break the payment success flow
            }
          }

          return res.json({
            success: true,
            data: {
              verified: true,
              payment,
              purchase
            }
          });
        } catch (dbError) {
          console.error('Database error while recording payment:', dbError);
          throw new AppError(`Error recording payment: ${dbError.message}`, 500);
        }
      } else {
        // Payment was not successful
        return res.json({
          success: true,
          data: {
            verified: false,
            paymentStatus: verification.paymentLink.status
          }
        });
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      
      // Handle different error scenarios
      if (error.statusCode === 401) {
        throw new AppError('Razorpay authentication failed. Please contact support.', 500);
      } else if (error.statusCode === 404) {
        throw new AppError('Payment link not found or has expired', 404);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new AppError('Cannot connect to payment service. Please try again later.', 503);
      } else {
        throw new AppError(`Failed to verify payment status: ${error.message}`, 500);
      }
    }
  } catch (error) {
    errorHandler(res, error);
  }
};

// Helper function to create an invoice if the purchase is fully paid
async function createInvoiceIfFullyPaid(purchaseId, userId) {
  // Implementation as described in the problem description
  // Fetch CustomerPurchase, Quotation, QuotationItems
  // Generate Invoice Number
  // Construct itemsForInvoice
  // Calculate totals
  // Populate company/customer details
  // Create and save Invoice
  // (This function's body was detailed in the initial problem description)
  // For now, I'll assume it's correctly implemented as per the description.

  const Invoice = require('../models/Invoice'); // Ensure Invoice model is required

  const purchase = await CustomerPurchase.findById(purchaseId)
    .populate('customerId')
    .populate({
      path: 'quotationId',
      populate: { path: 'lead' } // Populate lead within quotationId
    });

  if (!purchase) {
    console.error(`createInvoiceIfFullyPaid: Purchase not found for ID ${purchaseId}`);
    return; // Or throw an error
  }

  if (!purchase.isFullyPaid) {
    console.log(`createInvoiceIfFullyPaid: Purchase ${purchaseId} is not fully paid. Invoice not generated.`);
    return;
  }

  // Check if an invoice already exists
  const existingInvoice = await Invoice.findOne({ customerPurchase: purchaseId });
  if (existingInvoice) {
    console.log(`createInvoiceIfFullyPaid: Invoice already exists for purchase ${purchaseId}.`);
    return;
  }

  const quotationItems = await QuotationItem.find({ quotationId: purchase.quotationId._id })
    .populate('productId');

  if (!quotationItems || quotationItems.length === 0) {
    console.error(`createInvoiceIfFullyPaid: No quotation items found for quotation ${purchase.quotationId._id}`);
    // Potentially throw an error or handle as a critical issue
    // For now, returning to prevent invoice creation without items
    return; 
  }

  const invoiceNumber = await Invoice.generateInvoiceNumber();

  const itemsForInvoice = quotationItems.map(item => ({
    product: item.productId._id,
    name: item.productId.name, // Denormalized
    description: item.productId.description, // Denormalized
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountPercentage: item.discountPercentage || 0,
    itemTotal: item.subtotal // Use subtotal from QuotationItem
  }));

  const subtotal = itemsForInvoice.reduce((sum, item) => sum + (item.itemTotal || 0), 0);
  
  // Assuming tax is calculated based on quotation's tax percentage if available
  // or a default/global setting. For simplicity, let's use quotation's tax.
  const taxPercentage = purchase.quotationId.taxPercentage || 0; // Assuming taxPercentage is on Quotation model
  const taxAmount = subtotal * (taxPercentage / 100);
  const finalTotalAmount = subtotal + taxAmount;

  // Validate calculated total against purchase total amount for consistency
  if (Math.abs(finalTotalAmount - purchase.totalAmount) > 0.01) { // Using a small tolerance for float comparison
    console.warn(
      `Discrepancy in calculated total for invoice vs purchase total. Purchase: ${purchase.totalAmount}, Calculated: ${finalTotalAmount}. Purchase ID: ${purchaseId}`
    );
    // Depending on business rules, this might be a critical error.
    // For now, we'll proceed but log a warning.
  }
  
  const companyDetails = {
    name: process.env.COMPANY_NAME || "Sunlit Systems",
    address: process.env.COMPANY_ADDRESS || "#27, Dr. Jaganatha Nagar, Near CIT, Opp. to CMC, Coimbatore - 641 014",
    phone: process.env.COMPANY_PHONE || " +919842291069",
    email: process.env.COMPANY_EMAIL || "info@sunlitsolarindia.com",
    logoUrl: process.env.COMPANY_LOGO_URL || "https://res.cloudinary.com/dcua87ney/image/upload/v1746715647/logo2_kmndu4.png", // Make sure this logo is accessible
    taxId: process.env.COMPANY_TAX_ID || "GSTIN1234567890"
  };

  // Populate customer details
  let customerDetails = {
    name: '',
    email: '',
    phone: '',
    billingAddress: '',
    shippingAddress: ''
  };

  if (purchase.customerId) {
    customerDetails.name = `${purchase.customerId.firstName} ${purchase.customerId.lastName}`.trim();
    customerDetails.email = purchase.customerId.email;
    customerDetails.phone = purchase.customerId.phone;
    customerDetails.billingAddress = purchase.customerId.billingAddress || purchase.customerId.address || (purchase.quotationId.lead ? purchase.quotationId.lead.address : '');
    customerDetails.shippingAddress = purchase.customerId.shippingAddress || customerDetails.billingAddress; // Default shipping to billing
  } else if (purchase.quotationId && purchase.quotationId.lead) {
    // Fallback to lead details if direct customer details are not fully populated
    // This case should be rare if customerId is always populated correctly on purchase
    const lead = purchase.quotationId.lead;
    customerDetails.name = `${lead.firstName} ${lead.lastName}`;
    customerDetails.email = lead.email;
    customerDetails.phone = lead.phone;
    customerDetails.billingAddress = lead.address;
    customerDetails.shippingAddress = lead.address; // Default shipping to billing
  } else {
    console.error(`createInvoiceIfFullyPaid: Cannot determine customer details for purchase ${purchaseId}.`);
    // This is a critical issue, invoice cannot be properly generated.
    // Consider throwing an error to halt or notify.
    return; 
  }


  const newInvoice = new Invoice({
    invoiceNumber,
    customer: purchase.customerId._id,
    quotation: purchase.quotationId._id,
    customerPurchase: purchaseId,
    items: itemsForInvoice,
    subtotal,
    taxAmount,
    taxPercentage, // Storing the applied tax percentage
    totalAmount: finalTotalAmount, 
    paidAmount: purchase.totalAmount, // Assuming totalAmount of purchase is the amount paid for this invoice
    paymentStatus: 'PAID', // Since this is generated upon full payment
    issueDate: new Date(),
    companyDetails,
    customerDetails,
    createdBy: userId
  });

  await newInvoice.save();
  console.log(`Invoice ${invoiceNumber} generated successfully for purchase ${purchaseId}`);
  
  // Add a log to confirm invoice generation
  // console.log(\`Invoice generation attempt for purchaseId: \${purchaseId}\`);
} 
const Invoice = require('../models/Invoice');
const Quotation = require('../models/Quotation');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { sendInvoiceNotification, sendSmartNotification } = require('../utils/sendNotification');
const { generateInvoiceNumber } = require('../utils/generateNumbers');
const generatePDF = require('../utils/generatePDF');
const mongoose = require('mongoose');
const { AppError } = require('../utils/errorHandler');
const errorHandler = require('../utils/errorHandler');

exports.createInvoice = async (req, res) => {
  try {
    const { quotationId } = req.body;
    
    // Fetch quotation with populated lead and items
    const quotation = await Quotation.findById(quotationId)
      .populate('lead')
      .populate({
        path: 'quotationItems',
        populate: {
          path: 'productId'
        }
      });

    if (!quotation || quotation.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or unapproved quotation'
      });
    }

    // Find the customer account associated with the lead's email
    const customer = await User.findOne({ 
      email: quotation.lead.email,
      role: 'customer'
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer account not found'
      });
    }

    // Create invoice
    const invoice = await Invoice.create({
      quotation: quotationId,
      invoiceNumber: await generateInvoiceNumber(),
      customer: customer._id,
      items: quotation.quotationItems.map(item => ({
        product: item.productId._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0
      })),
      totalAmount: quotation.total,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days due date
      createdBy: req.user.id
    });

    // Populate the invoice data for email
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer')
      .populate('items.product');

    // Generate PDF and send email
    const emailData = {
      name: customer.name,
      invoiceNumber: invoice.invoiceNumber,
      items: populatedInvoice.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)
      })),
      total: invoice.totalAmount,
      dueDate: invoice.dueDate.toLocaleDateString(),
      businessDetails: {
        name: process.env.BUSINESS_NAME || 'Sunlit CRM',
        address: process.env.BUSINESS_ADDRESS || 'Your Business Address',
        phone: process.env.BUSINESS_PHONE || 'Your Business Phone',
        email: process.env.BUSINESS_EMAIL || 'your@business.email'
      },
      customerDetails: {
        name: customer.name,
        email: customer.email,
        address: quotation.lead.address || 'N/A'
      }
    };

    const pdfBuffer = await generatePDF('invoice', emailData);

    // Send invoice notification via smart communication workflow
    try {
      const customer = await Customer.findById(quotation.customerId).populate('leadId');
      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        customer: customer,
        invoiceUrl: null // Could add portal URL here if available
      };

      await sendSmartNotification(
        customer.leadId, // Use the lead data for contact info
        'invoice',
        invoiceData,
        {
          attachments: [{ filename: `Invoice_${invoice.invoiceNumber}.pdf`, content: pdfBuffer }],
          documentUrl: null
        }
      );
      console.log(`Smart invoice notification sent for ${invoice.invoiceNumber}`);
    } catch (notificationError) {
      console.error(`Failed to send invoice notification for ${invoice.invoiceNumber}:`, notificationError.message);
      // Continue with success response even if notification fails
    }

    // Return success response with populated invoice
    const returnInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'name email')
      .populate('items.product', 'name')
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      data: returnInvoice
    });
  } catch (error) {
    console.error('Invoice creation error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating invoice'
    });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentDetails } = req.body;
    
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    invoice.status = 'paid';
    invoice.paymentDetails = paymentDetails;
    await invoice.save();

    // Send payment confirmation email
    await sendEmail({
      email: invoice.customer.email,
      subject: 'Payment Confirmation - Sunlit CRM',
      template: 'payment-confirmation',
      data: {
        name: invoice.customer.name,
        invoiceNumber: invoice.invoiceNumber,
        amount: paymentDetails.paidAmount,
        transactionId: paymentDetails.transactionId
      }
    });

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.getInvoiceByPurchaseId = async (req, res) => {
  try {
    const { customerPurchaseId } = req.params;

    if (!customerPurchaseId) {
      return res.status(400).json({
        success: false,
        message: 'Customer Purchase ID is required'
      });
    }

    const invoice = await Invoice.findOne({ customerPurchase: customerPurchaseId })
      .populate('customer', 'name email phone')
      .populate('quotation', 'quotationNumber createdAt total')
      .populate('customerPurchase', 'purchaseDate totalAmount purchaseID paymentStatus status')
      .populate({
        path: 'items.product',
        model: 'Product',
        select: 'name description category images'
      })
      .populate('createdBy', 'name email');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this purchase.'
      });
    }
    
    // Ensure the user requesting is the customer associated with the invoice or an admin/sales_person
    // (Assuming req.user is populated by auth middleware)
    const user = await User.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the user is the customer or an admin/sales_person
    // The invoice.customer stores ObjectId of Customer model. 
    // We need to compare with user details (e.g. email or a direct link if Customer model has userId)
    // For now, let's assume an admin/sales_person can view any invoice.
    // And a customer can view their own. The `invoice.customer` refers to the `Customer` model ID.
    // The `Customer` model would need to be fetched to check against `req.user.id` or `req.user.email`
    // This part needs careful implementation based on how Customer and User models are linked.
    
    // Simplified access check for now: allow if user is an admin or sales, or if invoice customer matches.
    // A more robust check would involve fetching the Customer document linked to invoice.customer 
    // and then checking if that customer's associated user ID (if any) matches req.user.id.

    // Let's assume direct customer check for now if invoice.customer is a User ID (which it's not based on model)
    // if (user.role !== 'admin' && user.role !== 'sales_person' && invoice.customer.toString() !== req.user.id) {
    // This check is flawed because invoice.customer is Customer._id not User._id
    // A proper check would be: 
    // const linkedCustomer = await Customer.findById(invoice.customer);
    // if (!linkedCustomer || linkedCustomer.email !== user.email) { ... }

    // For demonstration, proceeding without this complex customer check if user is not admin/sales.
    // THIS SHOULD BE IMPLEMENTED CORRECTLY IN PRODUCTION.
    if (user.role !== 'admin' && user.role !== 'sales_person' && user.role !== 'sales_head' && user.role !== 'marketing_coordinator') {
        const customerDoc = await mongoose.model('Customer').findById(invoice.customer);
        if (!customerDoc || customerDoc.user.toString() !== req.user.id) {
             return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this invoice.'
            });
        }
    }


    res.status(200).json({
      success: true,
      data: invoice
    });

  } catch (error) {
    console.error('Error fetching invoice by purchase ID:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching invoice'
    });
  }
};

exports.sendExistingInvoiceEmail = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId)
      .populate('customer', 'name email phone') 
      .populate('items.product', 'name description') 
      .populate('quotation', 'quotationNumber')
      .populate('customerPurchase', 'purchaseID purchaseDate');

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (!invoice.customer) {
      throw new AppError('Customer details missing for this invoice', 400);
    }

    // Get the lead information from the quotation to use smart notification
    const quotationWithLead = await Quotation.findById(invoice.quotation._id)
      .populate('lead', 'firstName lastName email phone whatsapp countryCode preferredContactMethod hasWhatsapp whatsappSameAsPhone');

    if (!quotationWithLead || !quotationWithLead.lead) {
      throw new AppError('Lead information not found for this invoice', 400);
    }

    const lead = quotationWithLead.lead;

    // Prepare data for the invoice notification
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      companyDetails: invoice.companyDetails, 
      customerDetails: {
        name: invoice.customer.name,
        email: invoice.customer.email,
        phone: invoice.customer.phone || 'N/A',
        billingAddress: invoice.customerDetails?.billingAddress || lead.billingAddress || 'N/A',
      },
      items: invoice.items.map(item => ({
        name: item.name || item.product?.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercentage: item.discountPercentage || 0,
        itemTotal: item.itemTotal
      })),
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount || 0, 
      paymentStatus: invoice.paymentStatus || 'N/A', 
      notes: invoice.notes,
      quotation: {
        quotationNumber: invoice.quotation?.quotationNumber || 'N/A'
      },
      customerPurchase: {
        purchaseID: invoice.customerPurchase?.purchaseID || 'N/A',
        purchaseDate: invoice.customerPurchase?.purchaseDate 
      },
    };

    // Generate PDF for attachment
    const pdfBuffer = await generatePDF('invoice', invoiceData);

    // Use smart notification to send via available channels (email/WhatsApp)
    const notificationResult = await sendSmartNotification(
      lead, // Use lead information for contact methods
      'invoice',
      invoiceData,
      {
        attachments: [{ 
          filename: `Invoice_${invoice.invoiceNumber}.pdf`, 
          content: pdfBuffer,
          contentType: 'application/pdf'
        }],
        documentUrl: null // PDF will be sent as attachment
      }
    );

    console.log('Invoice notification results:', notificationResult);

    // Optionally, update the invoice to mark it as sent
    // invoice.lastEmailedAt = new Date();
    // await invoice.save();

    res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} sent successfully`,
      notificationResults: notificationResult
    });

  } catch (error) {
    console.error('Error sending invoice notification:', error);
    // Use the errorHandler utility if it formats responses consistently
    if (typeof errorHandler === 'function') {
        errorHandler(res, error);
    } else {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to send invoice notification'
        });
    }
  }
}; 
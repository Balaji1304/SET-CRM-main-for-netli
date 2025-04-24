const Invoice = require('../models/Invoice');
const Quotation = require('../models/Quotation');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { generateInvoiceNumber } = require('../utils/generateNumbers');
const generatePDF = require('../utils/generatePDF');

exports.createInvoice = async (req, res) => {
  try {
    const { quotationId } = req.body;
    
    // Fetch quotation with populated lead and items
    const quotation = await Quotation.findById(quotationId)
      .populate('lead')
      .populate('items.product');

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
      items: quotation.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0
      })),
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      total: quotation.total,
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
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      total: invoice.total,
      dueDate: invoice.dueDate.toLocaleDateString(),
      businessDetails: {
        name: process.env.BUSINESS_NAME || 'Solar CRM',
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

    // Send invoice email
    await sendEmail({
      email: customer.email,
      subject: `Invoice ${invoice.invoiceNumber} - Solar CRM`,
      template: 'invoice',
      data: emailData,
      attachments: [{
        filename: `Invoice_${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer
      }]
    });

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
      subject: 'Payment Confirmation - Solar CRM',
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
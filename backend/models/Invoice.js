const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: String, // Denormalized product name
  description: String, // Denormalized product description
    quantity: {
      type: Number,
      required: true
    },
    unitPrice: {
      type: Number,
      required: true
    },
  discountPercentage: { // Renamed from discount for clarity
      type: Number,
      default: 0
  },
  itemTotal: { // Calculated (quantity * unitPrice * (1 - discountPercentage/100))
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer: { // Assuming 'Customer' model holds detailed customer info
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  quotation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
    required: true
  },
  customerPurchase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerPurchase',
    required: true,
    unique: true // Each purchase should have only one final invoice
  },
  items: [invoiceItemSchema],
  subtotal: { // Sum of all itemTotals before tax
    type: Number,
    required: true
  },
  taxAmount: { // Tax amount applied
    type: Number,
    default: 0
  },
  taxPercentage: { // Tax percentage applied
    type: Number,
    default: 0
  },
  totalAmount: { // Final amount (subtotal + taxAmount)
    type: Number,
    required: true
  },
  paidAmount: { // Amount paid, should equal totalAmount for these invoices
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['PAID', 'PENDING', 'CANCELLED', 'REFUNDED'], // Updated status
    default: 'PAID' // Default to PAID as it's generated on full payment
  },
  issueDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  // Denormalized details for historical accuracy
  companyDetails: {
    name: String,
    address: String,
    phone: String,
    email: String,
    logoUrl: String, // Path to logo
    taxId: String   // e.g., GSTIN
  },
  customerDetails: { // To store customer info at the time of invoice generation
    name: String,
    email: String,
    phone: String,
    billingAddress: String,
    shippingAddress: String
  },
  notes: String, // Optional notes
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // User who triggered the process or system
  }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

// Helper function to generate unique invoice number (example)
invoiceSchema.statics.generateInvoiceNumber = async function() {
  const lastInvoice = await this.findOne().sort({ createdAt: -1 });
  let nextNumber = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const lastNumStr = lastInvoice.invoiceNumber.split('-').pop();
    const lastNum = parseInt(lastNumStr, 10);
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }
  // Format: INV-YYYYMMDD-XXXX (XXXX is a a sequential number)
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `INV-${year}${month}${day}-${nextNumber.toString().padStart(4, '0')}`;
};

module.exports = mongoose.model('Invoice', invoiceSchema); 
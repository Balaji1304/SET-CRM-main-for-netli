const generatePDF = require('./generatePDF');
const CustomerPurchase = require('../models/CustomerPurchase');
const Customer = require('../models/Customer');
const Quotation = require('../models/Quotation');
const QuotationItem = require('../models/QuotationItem');

/**
 * Generate Order Form PDF for a customer purchase
 * @param {string} purchaseId - Customer Purchase ID
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generateOrderFormPDF = async (purchaseId) => {
  try {
    // Get purchase with populated data
    const purchase = await CustomerPurchase.findById(purchaseId)
      .populate({
        path: 'customerId',
        populate: {
          path: 'leadId',
          select: 'firstName lastName businessName email phone billingAddress shippingAddress address countryCode whatsapp'
        }
      })
      .populate({
        path: 'quotationId',
        select: 'quotationNumber total validUntil terms notes lead',
        populate: {
          path: 'lead',
          select: 'firstName lastName businessName email phone billingAddress shippingAddress address countryCode whatsapp'
        }
      });

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    // Get quotation items with detailed product information
    const quotationItems = await QuotationItem.find({ 
      quotationId: purchase.quotationId._id 
    }).populate([
      {
        path: 'productId',
        select: 'name description category specifications images'
      },
      {
        path: 'bundleId',
        select: 'name description category bundleComponents systemConfiguration'
      },
      {
        path: 'customizedProductId',
        select: 'name description category specifications'
      }
    ]);

    // Get customer data with fallbacks
    const customer = purchase.customerId;
    const lead = purchase.quotationId.lead;
    const customerLead = customer?.leadId || lead; // Use customer's lead if available, fallback to quotation lead

    console.log('Debug - Customer data:', customer);
    console.log('Debug - Lead data:', lead);
    console.log('Debug - Customer Lead data:', customerLead);
    console.log('Debug - Quotation items:', quotationItems.length);

    // Format items for the order form with proper product information
    const formattedItems = quotationItems.map(item => {
      let productInfo = null;
      let productName = 'Unknown Product';
      
      // Determine the product information based on item type
      if (item.itemType === 'product' && item.productId) {
        productInfo = item.productId;
        productName = item.productId.name;
      } else if (item.itemType === 'bundle' && item.bundleId) {
        productInfo = item.bundleId;
        productName = item.bundleId.name;
      } else if (item.itemType === 'customized' && item.customizedProductId) {
        productInfo = item.customizedProductId;
        productName = item.customizedProductId.name;
      }

      console.log('Debug - Processing item:', productName, 'Type:', item.itemType);

      return {
        product: {
          name: productName,
          description: productInfo?.description || '',
          category: productInfo?.category || ''
        },
        quantity: item.quantity,
        unitPrice: item.unitPrice.toLocaleString('en-IN'),
        discount: item.discount || 0,
        total: (item.total || (item.quantity * item.unitPrice * (1 - (item.discount || 0)/100))).toLocaleString('en-IN')
      };
    });

    // Prepare template data (matching quotation template structure)
    const templateData = {
      // Order specific data
      orderNumber: purchase.purchaseID,
      orderDate: purchase.purchaseDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      
      // Business details (matching quotation template)
      businessDetails: {
        name: 'Focusun Energy Systems',
        address: 'Old No: 27 / New No: 30, Jagannathan Nagar, (Opp) CMC, Coimbatore - 14',
        phone: '0422 2591069, 2572237',
        email: 'info@focusunsolar.com',
        website: 'www.focusunsolar.com'
      },
      
      // Customer details (matching quotation template structure with better fallbacks)
      customerDetails: {
        name: `${customer?.firstName || customerLead?.firstName || lead?.firstName || ''} ${customer?.lastName || customerLead?.lastName || lead?.lastName || ''}`.trim(),
        businessName: customer?.businessName || customerLead?.businessName || lead?.businessName || '',
        email: customer?.email || customerLead?.email || lead?.email || '',
        phone: customer?.phone || customerLead?.phone || lead?.phone || '',
        address: customer?.address || customerLead?.billingAddress || customerLead?.address || lead?.billingAddress || lead?.address || ''
      },
      
      // Items (matching quotation structure)
      items: formattedItems,
      
      // Payment information
      totalAmount: purchase.totalAmount.toLocaleString('en-IN'),
      advanceAmount: purchase.advancePaid.toLocaleString('en-IN'),
      remainingAmount: purchase.remainingAmount.toLocaleString('en-IN'),
      paymentMethod: purchase.paymentMethod === 'razorpay' ? 'Online Payment' : 
                    purchase.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                    purchase.paymentMethod === 'cash' ? 'Cash' :
                    purchase.paymentMethod === 'check' ? 'Cheque' : 'Other',
      
      // Additional information
      currentYear: new Date().getFullYear(),
      portalUrl: process.env.FRONTEND_URL || 'https://yourapp.com'
    };

    // Debug: Log template data
    console.log('Debug - Template data for Order Form:');
    console.log('- Order Number:', templateData.orderNumber);
    console.log('- Customer Name:', templateData.customerDetails.name);
    console.log('- Customer Email:', templateData.customerDetails.email);
    console.log('- Customer Phone:', templateData.customerDetails.phone);
    console.log('- Customer Address:', templateData.customerDetails.address);
    console.log('- Items count:', templateData.items.length);
    console.log('- Items:', templateData.items.map(item => `${item.product.name} (Qty: ${item.quantity})`));

    // Validation check
    if (!templateData.customerDetails.name || templateData.customerDetails.name === '') {
      console.warn('Warning: Customer name is empty');
    }
    if (templateData.items.length === 0) {
      console.warn('Warning: No items found for order form');
    }

    // Generate PDF using the Order Form template
    const pdfBuffer = await generatePDF('orderForm', templateData);
    
    return pdfBuffer;

  } catch (error) {
    console.error('Error generating Order Form PDF:', error);
    throw error;
  }
};

/**
 * Get Order Form data without generating PDF (for API responses)
 * @param {string} purchaseId - Customer Purchase ID
 * @returns {Promise<Object>} - Order form data
 */
const getOrderFormData = async (purchaseId) => {
  try {
    const purchase = await CustomerPurchase.findById(purchaseId)
      .populate('customerId')
      .populate({
        path: 'quotationId',
        select: 'quotationNumber total validUntil terms notes lead',
        populate: {
          path: 'lead',
          select: 'firstName lastName businessName email phone billingAddress address'
        }
      });

    if (!purchase) {
      throw new Error('Purchase not found');
    }

    const quotationItems = await QuotationItem.find({ 
      quotationId: purchase.quotationId._id 
    }).populate('productId');

    const customer = purchase.customerId;
    const lead = purchase.quotationId.lead;

    return {
      orderNumber: purchase.purchaseID,
      orderDate: purchase.purchaseDate,
      customer: {
        name: `${customer.firstName || lead.firstName} ${customer.lastName || lead.lastName}`,
        businessName: customer.businessName || lead.businessName,
        phone: customer.phone || lead.phone,
        email: customer.email || lead.email,
        address: customer.address || lead.billingAddress || lead.address
      },
      items: quotationItems.map(item => ({
        description: item.productId.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.total || (item.quantity * item.unitPrice)
      })),
      totalAmount: purchase.totalAmount,
      advanceAmount: purchase.advancePaid,
      remainingAmount: purchase.remainingAmount,
      paymentMethod: purchase.paymentMethod,
      status: purchase.status,
      installationDate: purchase.installationDate
    };
  } catch (error) {
    console.error('Error getting Order Form data:', error);
    throw error;
  }
};

module.exports = {
  generateOrderFormPDF,
  getOrderFormData
};


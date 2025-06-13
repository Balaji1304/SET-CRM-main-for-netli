const Package = require('../models/Package');
const CustomerPurchase = require('../models/CustomerPurchase');
const QuotationItem = require('../models/QuotationItem');
const asyncHandler = require('express-async-handler');

// @desc    Create a new package from a sales order
// @route   POST /api/packages
// @access  Private (sales_head)
const createPackage = asyncHandler(async (req, res) => {
  const { salesOrderId } = req.body;

  if (!salesOrderId) {
    res.status(400);
    throw new Error('Sales Order ID is required');
  }

  const salesOrder = await CustomerPurchase.findById(salesOrderId);

  if (!salesOrder) {
    res.status(404);
    throw new Error('Sales order not found');
  }

  const packageExists = await Package.findOne({ salesOrder: salesOrderId });

  if (packageExists) {
    res.status(400);
    throw new Error('Package already exists for this sales order');
  }

  const quotationItems = await QuotationItem.find({
    quotationId: salesOrder.quotationId,
  });

  if (!quotationItems || quotationItems.length === 0) {
    res.status(400);
    throw new Error('No items found for the associated quotation.');
  }

  const packageItems = quotationItems.map((item) => ({
    product: item.productId,
    quantity: item.quantity,
  }));

  const packageNumber = `PKG-${Date.now()}`;

  const newPackage = new Package({
    packageNumber,
    salesOrder: salesOrder._id,
    customer: salesOrder.customerId,
    items: packageItems,
    status: 'Not Shipped',
  });

  const createdPackage = await newPackage.save();
  res.status(201).json(createdPackage);
});

// @desc    Get all packages
// @route   GET /api/packages
// @access  Private (sales_head)
const getPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find({})
    .populate('customer', 'firstName lastName')
    .populate('salesOrder', 'purchaseID');
  res.json(packages);
});

// @desc    Update package status
// @route   PUT /api/packages/:id/status
// @access  Private
const updatePackageStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const pkg = await Package.findById(req.params.id);

  if (pkg) {
    pkg.status = status;
    const updatedPackage = await pkg.save();
    res.json(updatedPackage);
  } else {
    res.status(404);
    throw new Error('Package not found');
  }
});

// @desc    Delete a package
// @route   DELETE /api/packages/:id
// @access  Private
const deletePackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findById(req.params.id);

  if (pkg) {
    await pkg.deleteOne();
    res.json({ message: 'Package removed' });
  } else {
    res.status(404);
    throw new Error('Package not found');
  }
});

module.exports = {
  createPackage,
  getPackages,
  updatePackageStatus,
  deletePackage,
}; 
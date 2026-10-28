const Customer = require('../models/Customer');
const { AppError } = require('./errorHandler');

// Role groups used by route-level authorize() checks
const ROLES = {
  SALES: ['sales_person', 'sales_head', 'marketing_coordinator', 'admin'],
  ACCOUNTS: ['accounts_department', 'admin'],
  FRONT_OFFICE: ['front_office_executive', 'admin'],
  PRODUCT_HEAD: ['product_head', 'admin'],
  STAFF: [
    'sales_person',
    'front_office_executive',
    'product_head',
    'service_engineer',
    'sales_head',
    'marketing_coordinator',
    'accounts_department',
    'admin'
  ]
};

/**
 * Find the Customer record that belongs to a logged-in customer user.
 * Matches on the linked user id first, then on email.
 */
const findCustomerForUser = async (user) => {
  if (!user) return null;
  const conditions = [{ user: user._id }];
  if (user.email) conditions.push({ email: user.email });
  return Customer.findOne({ $or: conditions });
};

/**
 * Throw 403 if a customer tries to access a purchase that is not theirs.
 * Staff roles are allowed through (their access is limited at the route level).
 */
const assertCanAccessPurchase = async (user, purchase) => {
  if (!user) throw new AppError('Not authorized', 401);
  if (user.role !== 'customer') return;

  const customer = await findCustomerForUser(user);
  const purchaseCustomerId = purchase && (purchase.customerId?._id || purchase.customerId);
  if (!customer || !purchaseCustomerId || purchaseCustomerId.toString() !== customer._id.toString()) {
    throw new AppError('Not authorized to access this purchase', 403);
  }
};

// Escape user input before using it inside a MongoDB $regex
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  ROLES,
  findCustomerForUser,
  assertCanAccessPurchase,
  escapeRegex
};

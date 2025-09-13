const rolePermissions = {

  customer: ['/api/tickets', '/api/payments', '/api/quotations/customer-products', '/api/notifications', '/api/tracking', '/api/installations', '/api/customer-purchases'],
  sales_person: ['/api/leads', '/api/quotations', '/api/invoices', '/api/notifications', '/api/tracking', '/api/reports/sales'],
  front_office_executive: ['/api/enquiries', '/api/notifications', '/api/tracking', '/api/tickets', '/api/customer-purchases/tasks'],
  product_head: ['/api/maintenance', '/api/notifications', '/api/bundles', '/api/tracking', '/api/reports/service'],
  service_engineer: ['/api/service-customers', '/api/performance', '/api/tickets', '/api/notifications', '/api/tracking', '/api/installations', '/api/reports/service'],
  sales_head: ['/api/leads', '/api/quotations', '/api/invoices', '/api/purchase-orders', '/api/notifications', '/api/tracking', '/api/reports/sales'],
  accounts_department: ['/api/quotations', '/api/customer-purchases', '/api/notifications', '/api/tracking'],
  marketing_coordinator: ['/api/leads', '/api/quotations', '/api/invoices', '/api/purchase-orders', '/api/notifications', '/api/tracking', '/api/reports/sales']

};

exports.checkRolePermission = (req, res, next) => {
  const userRole = req.user.role;
  const requestPath = req.baseUrl;

  // Allow access to common routes for all authenticated users
  const commonRoutes = ['/api/dashboard', '/api/reports', '/api/knowledge-base'];
  if (commonRoutes.includes(requestPath)) {
    return next();
  }

  // Check if user's role has permission for the requested path
  const allowedPaths = rolePermissions[userRole] || [];
  if (allowedPaths.some(path => requestPath.startsWith(path))) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'You do not have permission to access this resource'
  });
}; 
const rolePermissions = {
  customer: ['/api/tickets', '/api/payments', '/api/quotations/customer-products', '/api/notifications'],
  sales_person: ['/api/leads', '/api/quotations', '/api/invoices', '/api/notifications'],
  front_office_executive: ['/api/enquiries', '/api/leads', '/api/notifications'],
  inventory_manager: ['/api/products', '/api/bundles', '/api/notifications'],
  product_head: ['/api/maintenance', '/api/notifications', '/api/bundles', '/api/tickets'],
  service_engineer: ['/api/service-customers', '/api/performance', '/api/tickets', '/api/notifications'],
  sales_head: ['/api/leads', '/api/quotations', '/api/invoices', '/api/purchase-orders', '/api/notifications'],
  accounts_department: ['/api/quotations', '/api/customer-purchases', '/api/notifications']
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
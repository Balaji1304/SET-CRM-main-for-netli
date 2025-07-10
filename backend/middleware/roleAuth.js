const rolePermissions = {
  customer: ['/api/tickets', '/api/payments', '/api/quotations/customer-products'],
  sales_person: ['/api/leads', '/api/quotations', '/api/invoices'],
  inventory_manager: ['/api/products'],
  product_head: ['/api/schedule', '/api/maintenance', '/api/notifications/'],
  service_engineer: ['/api/service-customers', '/api/performance'],
  sales_head: ['/api/leads', '/api/quotations', '/api/invoices', '/api/purchase-orders']
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
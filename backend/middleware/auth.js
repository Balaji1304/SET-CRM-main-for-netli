const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  // Extract token from header
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured; rejecting authenticated request');
    return res.status(500).json({
      success: false,
      message: 'Server authentication is not configured'
    });
  }

  try {
    // Verify token (jwt.verify also rejects expired tokens)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Deactivated users must not keep using previously issued tokens
    if (req.user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Accepts either a list of roles (authorize('admin', 'customer'))
// or a single array (authorize(['admin', 'customer']))
exports.authorize = (...rolesOrArray) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(rolesOrArray[0])
      ? rolesOrArray[0]
      : rolesOrArray;

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route`
      });
    }
    next();
  };
};

const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  // Extract token from header
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token expiration
    if (decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }

    // Find user 
    req.user = await User.findById(decoded.id);
    
    // --- START DEBUG LOGGING ---
    console.log('--- PROTECT MIDDLEWARE ---');
    if (req.user) {
      console.log('User found:', req.user._id);
      console.log('User role:', req.user.role);
    } else {
      console.log('User not found for token ID:', decoded.id);
    }
    console.log('-------------------------');
    // --- END DEBUG LOGGING ---

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
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

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};
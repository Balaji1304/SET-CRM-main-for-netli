const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, countryCode, whatsapp } = req.body;

    // Validate required fields
    if (!name || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, password, and phone are required'
      });
    }

    // Email is required for non-customer roles
    if (role && role !== 'customer' && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for non-customer roles'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        { phone }
      ]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
      if (existingUser.phone === phone) {
        return res.status(400).json({
          success: false,
          message: 'User with this phone number already exists'
        });
      }
    }

    // Create user data
    const userData = {
      name,
      password,
      phone,
      role: role || 'customer',
      countryCode: countryCode || '+91'
    };

    // Add email if provided
    if (email) {
      userData.email = email;
    }

    // Add whatsapp if provided
    if (whatsapp) {
      userData.whatsapp = whatsapp;
    }

    // Create user
    const user = await User.create(userData);

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email/username & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email/username and password'
      });
    }

    // Check for user by email or phone (for customers)
    let user = null;
    
    // First try to find by email
    user = await User.findOne({ email }).select('+password');
    
    // If not found and input looks like a phone number, try to find by phone (customers only)
    if (!user && /^[6-9]\d{9}$/.test(email.replace(/\D/g, ''))) {
      const cleanPhone = email.replace(/\D/g, '');
      // Check if it's 10 digits starting with 6-9 (Indian mobile format)
      if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
        user = await User.findOne({ phone: cleanPhone, role: 'customer' }).select('+password');
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user account is active
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
}; 
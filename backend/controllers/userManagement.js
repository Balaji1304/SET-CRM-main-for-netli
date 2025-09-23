const User = require('../models/User');
const { AppError, errorHandler } = require('../utils/errorHandler');

// @desc    Check if email already exists
// @route   POST /api/users/manage/check-email
// @access  Private (Admin)
exports.checkEmailExists = async (req, res) => {
  try {
    const { email, excludeId } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    const query = { email: email.toLowerCase().trim() };
    
    // If updating an existing user, exclude it from the check
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const existingUser = await User.findOne(query).select('name email phone role');
    
    res.json({
      success: true,
      exists: !!existingUser,
      user: existingUser ? {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
        role: existingUser.role
      } : null
    });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check email'
    });
  }
};

// @desc    Check if phone number already exists
// @route   POST /api/users/manage/check-phone
// @access  Private (Admin)
exports.checkPhoneExists = async (req, res) => {
  try {
    const { phone, excludeId } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    const query = { phone: phone.trim() };
    
    // If updating an existing user, exclude it from the check
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const existingUser = await User.findOne(query).select('name email phone role');
    
    res.json({
      success: true,
      exists: !!existingUser,
      user: existingUser ? {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
        role: existingUser.role
      } : null
    });
  } catch (error) {
    console.error('Error checking phone:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check phone number'
    });
  }
};

// @desc    Check if WhatsApp number already exists
// @route   POST /api/users/manage/check-whatsapp
// @access  Private (Admin)
exports.checkWhatsappExists = async (req, res) => {
  try {
    const { whatsapp, excludeId } = req.body;
    
    if (!whatsapp) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp number is required'
      });
    }
    
    const query = { whatsapp: whatsapp.trim() };
    
    // If updating an existing user, exclude it from the check
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const existingUser = await User.findOne(query).select('name email phone whatsapp role');
    
    res.json({
      success: true,
      exists: !!existingUser,
      user: existingUser ? {
        id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
        whatsapp: existingUser.whatsapp,
        role: existingUser.role
      } : null
    });
  } catch (error) {
    console.error('Error checking WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check WhatsApp number'
    });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/users/manage
// @access  Private (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    
    // Build query
    let query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Role filter
    if (role && role !== 'all') {
      query.role = role;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get users with pagination
    const users = await User.find(query)
      .select('-password') // Exclude password field
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: users
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/manage/:id
// @access  Private (admin only)
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Create new user
// @route   POST /api/users/manage
// @access  Private (admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, countryCode, whatsapp, notificationPreferences } = req.body;

    // Validate required fields
    if (!name || !password || !role || !phone) {
      throw new AppError('Name, password, role, and phone number are required', 400);
    }

    // Role-specific validations
    if (role !== 'customer' && !email) {
      throw new AppError('Email is required for non-customer roles', 400);
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : [])
      ]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new AppError('User with this email already exists', 400);
      }
      if (existingUser.phone === phone) {
        throw new AppError('User with this phone number already exists', 400);
      }
    }

    // Create user data object
    const userData = {
      name: name.trim(),
      role,
      password,
      countryCode: countryCode || '+91'
    };

    // Add email if provided
    if (email) {
      userData.email = email.trim();
    }

    // Add phone (required for all roles)
    userData.phone = phone.trim();

    
    // Add whatsapp number
    if (whatsapp) {
      userData.whatsapp = whatsapp.trim();
    }

    // Add notification preferences (frontend handles all defaults)
    if (notificationPreferences) {
      userData.notificationPreferences = notificationPreferences;
    }

    const user = await User.create(userData);

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');

    res.status(201).json({
      success: true,
      data: userResponse,
      message: 'User created successfully'
    });
  } catch (error) {
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new AppError(`User with this ${field} already exists`, 400);
    }
    errorHandler(res, error);
  }
};

// @desc    Update user
// @route   PUT /api/users/manage/:id
// @access  Private (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, role, countryCode, whatsapp, notificationPreferences } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user.id && role && role !== user.role) {
      throw new AppError('Cannot change your own role', 400);
    }

    // Role-specific validations for updates
    const newRole = role || user.role;
    
    if (newRole !== 'customer' && !email && !user.email) {
      throw new AppError('Email is required for non-customer roles', 400);
    }

    if (!phone && !user.phone) {
      throw new AppError('Phone number is required for all roles', 400);
    }

    // Check for existing user with same email/phone (excluding current user)
    if (email || phone) {
      const existingUser = await User.findOne({
        _id: { $ne: req.params.id },
        $or: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new AppError('Another user with this email already exists', 400);
        }
        if (existingUser.phone === phone) {
          throw new AppError('Another user with this phone number already exists', 400);
        }
      }
    }

    // Update fields
    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) user.email = email ? email.trim() : undefined;
    if (phone !== undefined) user.phone = phone ? phone.trim() : undefined;
    if (role !== undefined) user.role = role;
    if (countryCode !== undefined) user.countryCode = countryCode;
    if (whatsapp !== undefined) user.whatsapp = whatsapp ? whatsapp.trim() : undefined;
    
    // Update notification preferences
    if (notificationPreferences !== undefined) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences
      };
    }

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(user._id).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      throw new AppError(`Another user with this ${field} already exists`, 400);
    }
    errorHandler(res, error);
  }
};

// @desc    Reset user password
// @route   PUT /api/users/manage/:id/reset-password
// @access  Private (admin only)
exports.resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400);
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Set the new password (let pre-save middleware handle hashing)
    user.password = newPassword;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Toggle user account status (activate/deactivate)
// @route   PUT /api/users/manage/:id/toggle-status
// @access  Private (admin only)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user.id && isActive === false) {
      throw new AppError('Cannot deactivate your own account', 400);
    }

    user.isActive = isActive;
    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/manage/:id
// @access  Private (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      throw new AppError('Cannot delete your own account', 400);
    }

    // Prevent deletion if user has associated data (you can add more checks here)
    // For now, we'll allow deletion but in production you might want to check for:
    // - Leads created by user
    // - Quotations created by user
    // - Customer purchases assigned to user
    // - etc.

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/manage/stats
// @access  Private (admin only)
exports.getUserStats = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get active users (if isActive field exists)
    const activeUsers = await User.countDocuments({ isActive: { $ne: false } });
    
    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });

    // Format role statistics
    const roleStats = {};
    usersByRole.forEach(stat => {
      roleStats[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        recentUsers,
        roleStats
      }
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

// @desc    Export users
// @route   GET /api/users/manage/export
// @access  Private (Admin)
exports.exportUsers = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      query.createdAt = { $gte: start, $lte: end };
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    const formattedData = users.map(user => ({
      name: user.name,
      email: user.email,
      phone: user.phone,
      whatsapp: user.whatsapp,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString().split('T')[0],
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    errorHandler(res, error);
  }
};

module.exports = {
  checkEmailExists: exports.checkEmailExists,
  checkPhoneExists: exports.checkPhoneExists,
  checkWhatsappExists: exports.checkWhatsappExists,
  getAllUsers: exports.getAllUsers,
  getUser: exports.getUser,
  createUser: exports.createUser,
  updateUser: exports.updateUser,
  resetUserPassword: exports.resetUserPassword,
  toggleUserStatus: exports.toggleUserStatus,
  deleteUser: exports.deleteUser,
  getUserStats: exports.getUserStats,
  exportUsers: exports.exportUsers
};

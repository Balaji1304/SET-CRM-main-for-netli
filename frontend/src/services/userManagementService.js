import { apiRequest, invalidateCache } from './apiConfig';

/**
 * Get all users with pagination and filtering
 * @param {Object} params - Query parameters (page, limit, search, role)
 * @returns {Promise<Object>} - Response with users list and pagination
 */
export const getAllUsers = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    
    const url = queryParams.toString() ? `users/manage?${queryParams.toString()}` : 'users/manage';
    return await apiRequest(url);
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Get a specific user by ID
 * @param {string} id - User ID
 * @returns {Promise<Object>} - Response with user data
 */
export const getUser = async (id) => {
  try {
    return await apiRequest(`users/manage/${id}`);
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} - Response with created user
 */
export const createUser = async (userData) => {
  try {
    const response = await apiRequest('users/manage', {
      method: 'POST',
      body: userData
    }, false); // Don't cache POST requests
    
    // Invalidate users cache after creating
    invalidateCache('users/manage');
    return response;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update an existing user
 * @param {string} id - User ID
 * @param {Object} userData - Updated user data
 * @returns {Promise<Object>} - Response with updated user
 */
export const updateUser = async (id, userData) => {
  try {
    const response = await apiRequest(`users/manage/${id}`, {
      method: 'PUT',
      body: userData
    }, false); // Don't cache PUT requests
    
    // Invalidate users cache after updating
    invalidateCache('users/manage');
    return response;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Reset user password
 * @param {string} id - User ID
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Response
 */
export const resetUserPassword = async (id, newPassword) => {
  try {
    const response = await apiRequest(`users/manage/${id}/reset-password`, {
      method: 'PUT',
      body: { newPassword }
    }, false);
    
    return response;
  } catch (error) {
    console.error('Error resetting user password:', error);
    throw error;
  }
};

/**
 * Toggle user account status (activate/deactivate)
 * @param {string} id - User ID
 * @param {boolean} isActive - New active status
 * @returns {Promise<Object>} - Response with updated user
 */
export const toggleUserStatus = async (id, isActive) => {
  try {
    const response = await apiRequest(`users/manage/${id}/toggle-status`, {
      method: 'PUT',
      body: { isActive }
    }, false);
    
    // Invalidate users cache after status change
    invalidateCache('users/manage');
    return response;
  } catch (error) {
    console.error('Error toggling user status:', error);
    throw error;
  }
};

/**
 * Delete a user
 * @param {string} id - User ID
 * @returns {Promise<Object>} - Response confirmation
 */
export const deleteUser = async (id) => {
  try {
    const response = await apiRequest(`users/manage/${id}`, {
      method: 'DELETE'
    }, false);
    
    // Invalidate users cache after deletion
    invalidateCache('users/manage');
    return response;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Get user statistics
 * @returns {Promise<Object>} - Response with user stats
 */
export const getUserStats = async () => {
  try {
    return await apiRequest('users/manage/stats');
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
};

/**
 * Get available user roles
 * @returns {Array} - Array of role objects
 */
export const getUserRoles = () => {
  return [
    { value: 'customer', label: 'Customer', description: 'End users who purchase products (requires phone)' },
    { value: 'sales_person', label: 'Sales Person', description: 'Handle leads and create quotations (requires phone & email)' },
    { value: 'front_office_executive', label: 'Front Office Executive', description: 'Manage enquiries and assignments (requires phone & email)' },
    { value: 'product_head', label: 'Product Head', description: 'Manage products and installations (requires phone & email)' },
    { value: 'service_engineer', label: 'Service Engineer', description: 'Handle installations and service (requires phone & email)' },
    { value: 'sales_head', label: 'Sales Head', description: 'Manage sales team and operations (requires phone & email)' },
    { value: 'marketing_coordinator', label: 'Marketing Coordinator', description: 'Coordinate marketing activities (requires phone & email)' },
    { value: 'accounts_department', label: 'Accounts Department', description: 'Handle payments and finances (requires phone & email)' },
    { value: 'admin', label: 'Administrator', description: 'Full system access and user management (requires phone & email)' }
  ];
};

/**
 * Validate user data based on role
 * @param {Object} userData - User data to validate
 * @returns {Object} - Validation result with errors
 */
export const validateUserData = (userData) => {
  const errors = {};
  
  // Required fields
  if (!userData.name || !userData.name.trim()) {
    errors.name = 'Name is required';
  }
  
  if (!userData.role) {
    errors.role = 'Role is required';
  }
  
  // Phone number required for all roles
  if (!userData.phone || !userData.phone.trim()) {
    errors.phone = 'Phone number is required for all roles';
  }
  
  // Role-specific validations
  if (userData.role) {
    // Email required for non-customer roles
    if (userData.role !== 'customer' && (!userData.email || !userData.email.trim())) {
      errors.email = 'Email is required for non-customer roles';
    }
    
    // Contact method validation for customers
    if (userData.role === 'customer') {
      const hasValidEmail = userData.email && userData.email.trim() !== '';
      const hasValidWhatsapp = userData.whatsapp && userData.whatsapp.trim() !== '';
      
      if (!hasValidEmail && !hasValidWhatsapp) {
        errors.contact = 'At least one contact method (email or WhatsApp number) is required for customers';
      }
    }
  }
  
  // Email format validation
  if (userData.email && userData.email.trim()) {
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(userData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
  }
  
  // Phone format validation (Indian format)
  if (userData.phone && userData.phone.trim()) {
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = userData.phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      errors.phone = 'Please enter a valid 10-digit phone number starting with 6-9';
    }
  }
  
  // WhatsApp format validation (Indian format)
  if (userData.whatsapp && userData.whatsapp.trim()) {
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanWhatsapp = userData.whatsapp.replace(/\D/g, '');
    if (!phoneRegex.test(cleanWhatsapp)) {
      errors.whatsapp = 'Please enter a valid 10-digit WhatsApp number starting with 6-9';
    }
  }
  
  // Password validation (for new users)
  if (userData.password !== undefined) {
    if (!userData.password || userData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Format user role for display
 * @param {string} role - User role
 * @returns {string} - Formatted role name
 */
export const formatUserRole = (role) => {
  const roles = getUserRoles();
  const roleObj = roles.find(r => r.value === role);
  return roleObj ? roleObj.label : role;
};

/**
 * Get role color for UI display
 * @param {string} role - User role
 * @returns {string} - CSS color class
 */
export const getRoleColor = (role) => {
  const roleColors = {
    'customer': 'bg-blue-100 text-blue-800',
    'sales_person': 'bg-green-100 text-green-800',
    'front_office_executive': 'bg-purple-100 text-purple-800',
    'product_head': 'bg-orange-100 text-orange-800',
    'service_engineer': 'bg-yellow-100 text-yellow-800',
    'sales_head': 'bg-emerald-100 text-emerald-800',
    'marketing_coordinator': 'bg-pink-100 text-pink-800',
    'accounts_department': 'bg-indigo-100 text-indigo-800',
    'admin': 'bg-red-100 text-red-800'
  };
  
  return roleColors[role] || 'bg-gray-100 text-gray-800';
};

/**
 * Check if email already exists
 * @param {string} email - Email to check
 * @param {string|null} excludeId - User ID to exclude from check (for updates)
 * @returns {Promise<Object>} - Response with exists flag and user data
 */
export const checkEmailExists = async (email, excludeId = null) => {
  try {
    return await apiRequest('users/manage/check-email', {
      method: 'POST',
      body: { email, excludeId }
    }, false);
  } catch (error) {
    console.error('Error checking email:', error);
    throw error;
  }
};

/**
 * Check if phone number already exists
 * @param {string} phone - Phone number to check
 * @param {string|null} excludeId - User ID to exclude from check (for updates)
 * @returns {Promise<Object>} - Response with exists flag and user data
 */
export const checkPhoneExists = async (phone, excludeId = null) => {
  try {
    return await apiRequest('users/manage/check-phone', {
      method: 'POST',
      body: { phone, excludeId }
    }, false);
  } catch (error) {
    console.error('Error checking phone:', error);
    throw error;
  }
};

/**
 * Check if WhatsApp number already exists
 * @param {string} whatsapp - WhatsApp number to check
 * @param {string|null} excludeId - User ID to exclude from check (for updates)
 * @returns {Promise<Object>} - Response with exists flag and user data
 */
export const checkWhatsappExists = async (whatsapp, excludeId = null) => {
  try {
    return await apiRequest('users/manage/check-whatsapp', {
      method: 'POST',
      body: { whatsapp, excludeId }
    }, false);
  } catch (error) {
    console.error('Error checking WhatsApp:', error);
    throw error;
  }
};

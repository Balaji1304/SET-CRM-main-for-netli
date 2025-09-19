import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, Edit, Trash2, Key, UserCheck, UserX, RotateCcw, ChevronDown, Users, Shield, Eye, AlertTriangle, Loader2, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  toggleUserStatus,
  getUserStats,
  getUserRoles,
  validateUserData,
  formatUserRole,
  getRoleColor,
  checkEmailExists,
  checkPhoneExists,
  checkWhatsappExists
} from '../../services/userManagementService';

// User Form Modal Component
const UserFormModal = ({ isOpen, onClose, user, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'customer',
    password: '',
    countryCode: '+91',
    whatsapp: '',
    notificationPreferences: {
      whatsappEnabled: false,
      emailEnabled: true
    }
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Validation states
  const [emailValidation, setEmailValidation] = useState({
    isChecking: false,
    exists: false,
    existingUser: null,
    error: null,
    lastCheckedEmail: ''
  });
  const [phoneValidation, setPhoneValidation] = useState({
    isChecking: false,
    exists: false,
    existingUser: null,
    error: null,
    lastCheckedPhone: ''
  });
  const [whatsappValidation, setWhatsappValidation] = useState({
    isChecking: false,
    exists: false,
    existingUser: null,
    error: null,
    lastCheckedWhatsapp: ''
  });

  const roles = getUserRoles();
  const isEditMode = !!user;

  // Function to calculate notification preferences defaults
  const calculateNotificationDefaults = (role, email, whatsapp, phone) => {
    const hasValidEmail = email && email.trim() !== '';
    const hasValidWhatsapp = whatsapp && whatsapp.trim() !== '';
    const hasValidPhone = phone && phone.trim() !== '';
    
    if (role === 'customer') {
      // For customers: Enable based on availability of contact methods
      return {
        whatsappEnabled: hasValidWhatsapp,
        emailEnabled: hasValidEmail
      };
    } else {
      // For all other users: Default to WhatsApp only (uses phone as fallback)
      // WhatsApp enabled if they have phone OR whatsapp number
      // Email disabled by default for non-customers
      return {
        whatsappEnabled: hasValidPhone || hasValidWhatsapp,
        emailEnabled: false
      };
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'customer',
        password: '', // Don't pre-fill password in edit mode
        countryCode: user.countryCode || '+91',
        whatsapp: user.whatsapp || '',
        notificationPreferences: user.notificationPreferences || 
          calculateNotificationDefaults(user.role || 'customer', user.email || '', user.whatsapp || '', user.phone || '')
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'customer',
        password: '',
        countryCode: '+91',
        whatsapp: '',
        notificationPreferences: calculateNotificationDefaults('customer', '', '', '')
      });
    }
    setErrors({});
    
    // Reset validation states
    setEmailValidation({
      isChecking: false,
      exists: false,
      existingUser: null,
      error: null,
      lastCheckedEmail: ''
    });
    setPhoneValidation({
      isChecking: false,
      exists: false,
      existingUser: null,
      error: null,
      lastCheckedPhone: ''
    });
    setWhatsappValidation({
      isChecking: false,
      exists: false,
      existingUser: null,
      error: null,
      lastCheckedWhatsapp: ''
    });
  }, [user, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-update notification preferences for new users when role, email, whatsapp, or phone changes
      if (!isEditMode && (field === 'role' || field === 'email' || field === 'whatsapp' || field === 'phone')) {
        const role = field === 'role' ? value : newData.role;
        const email = field === 'email' ? value : newData.email;
        const whatsapp = field === 'whatsapp' ? value : newData.whatsapp;
        const phone = field === 'phone' ? value : newData.phone;
        
        newData.notificationPreferences = calculateNotificationDefaults(role, email, whatsapp, phone);
      }
      
      return newData;
    });
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Trigger email validation if email field changes
    if (field === 'email' && value.trim() !== emailValidation.lastCheckedEmail) {
      handleEmailValidation(value.trim());
    }

    // Trigger phone validation only after 10 digits are entered
    if (field === 'phone') {
      const cleanPhone = value.replace(/\D/g, '');
      const phoneWithoutCountryCode = cleanPhone.startsWith('91') && cleanPhone.length === 12 
        ? cleanPhone.substring(2) 
        : cleanPhone;
      
      if (phoneWithoutCountryCode.length === 10 && phoneWithoutCountryCode !== phoneValidation.lastCheckedPhone) {
        handlePhoneValidation(value.trim());
      } else if (phoneWithoutCountryCode.length < 10) {
        // Reset validation state if less than 10 digits
        setPhoneValidation({
          isChecking: false,
          exists: false,
          existingUser: null,
          error: null,
          lastCheckedPhone: ''
        });
      }
    }

    // Trigger WhatsApp validation only after 10 digits are entered
    if (field === 'whatsapp') {
      const cleanWhatsapp = value.replace(/\D/g, '');
      const whatsappWithoutCountryCode = cleanWhatsapp.startsWith('91') && cleanWhatsapp.length === 12 
        ? cleanWhatsapp.substring(2) 
        : cleanWhatsapp;
      
      if (whatsappWithoutCountryCode.length === 10 && whatsappWithoutCountryCode !== whatsappValidation.lastCheckedWhatsapp) {
        handleWhatsappValidation(value.trim());
      } else if (whatsappWithoutCountryCode.length < 10) {
        // Reset validation state if less than 10 digits
        setWhatsappValidation({
          isChecking: false,
          exists: false,
          existingUser: null,
          error: null,
          lastCheckedWhatsapp: ''
        });
      }
    }
  };

  const handleNotificationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [field]: value
      }
    }));
  };

  // Email validation with debounce
  const handleEmailValidation = useCallback(async (email) => {
    // Reset validation state if email is empty or invalid format
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailValidation({
        isChecking: false,
        exists: false,
        existingUser: null,
        error: null,
        lastCheckedEmail: email
      });
      return;
    }

    // Set checking state
    setEmailValidation(prev => ({
      ...prev,
      isChecking: true,
      error: null,
      lastCheckedEmail: email
    }));

    try {
      const response = await checkEmailExists(email, isEditMode ? user._id : null);
      if (response.success) {
        setEmailValidation({
          isChecking: false,
          exists: response.exists,
          existingUser: response.user,
          error: null,
          lastCheckedEmail: email
        });
      } else {
        setEmailValidation({
          isChecking: false,
          exists: false,
          existingUser: null,
          error: 'Unable to check email availability',
          lastCheckedEmail: email
        });
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailValidation({
        isChecking: false,
        exists: false,
        existingUser: null,
        error: 'Unable to check email availability',
        lastCheckedEmail: email
      });
    }
  }, [isEditMode, user]);

  // Phone validation with debounce
  const handlePhoneValidation = useCallback(async (phone) => {
    // Reset validation state if phone is empty or invalid format
    if (!phone || !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').slice(-10))) {
      setPhoneValidation({
        isChecking: false,
        exists: false,
        existingUser: null,
        error: null,
        lastCheckedPhone: phone
      });
      return;
    }

    // Set checking state
    setPhoneValidation(prev => ({
      ...prev,
      isChecking: true,
      error: null,
      lastCheckedPhone: phone
    }));

    try {
      const response = await checkPhoneExists(phone, isEditMode ? user._id : null);
      if (response.success) {
        setPhoneValidation({
          isChecking: false,
          exists: response.exists,
          existingUser: response.user,
          error: null,
          lastCheckedPhone: phone
        });
      } else {
        setPhoneValidation({
          isChecking: false,
          exists: false,
          existingUser: null,
          error: 'Unable to check phone availability',
          lastCheckedPhone: phone
        });
      }
    } catch (error) {
      console.error('Error checking phone:', error);
      setPhoneValidation({
        isChecking: false,
        exists: false,
        existingUser: null,
        error: 'Unable to check phone availability',
        lastCheckedPhone: phone
      });
    }
  }, [isEditMode, user]);

  // WhatsApp validation with debounce
  const handleWhatsappValidation = useCallback(async (whatsapp) => {
    // Reset validation state if whatsapp is empty or invalid format
    if (!whatsapp || !/^[6-9]\d{9}$/.test(whatsapp.replace(/\D/g, '').slice(-10))) {
      setWhatsappValidation({
        isChecking: false,
        exists: false,
        existingUser: null,
        error: null,
        lastCheckedWhatsapp: whatsapp
      });
      return;
    }

    // Set checking state
    setWhatsappValidation(prev => ({
      ...prev,
      isChecking: true,
      error: null,
      lastCheckedWhatsapp: whatsapp
    }));

    try {
      const response = await checkWhatsappExists(whatsapp, isEditMode ? user._id : null);
      if (response.success) {
        setWhatsappValidation({
          isChecking: false,
          exists: response.exists,
          existingUser: response.user,
          error: null,
          lastCheckedWhatsapp: whatsapp
        });
      } else {
        setWhatsappValidation({
          isChecking: false,
          exists: false,
          existingUser: null,
          error: 'Unable to check WhatsApp availability',
          lastCheckedWhatsapp: whatsapp
        });
      }
    } catch (error) {
      console.error('Error checking WhatsApp:', error);
      setWhatsappValidation({
        isChecking: false,
        exists: false,
        existingUser: null,
        error: 'Unable to check WhatsApp availability',
        lastCheckedWhatsapp: whatsapp
      });
    }
  }, [isEditMode, user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare validation data - exclude password in edit mode
    const validationData = isEditMode ? 
      { ...formData, password: undefined } : // Don't validate password in edit mode
      formData;
    
    const validation = validateUserData(validationData);
    
    // Add validation errors from real-time checks
    const allErrors = { ...validation.errors };
    
    if (emailValidation.exists) {
      allErrors.email = 'This email address is already associated with another user.';
    }
    
    if (phoneValidation.exists) {
      allErrors.phone = 'This phone number is already associated with another user.';
    }
    
    if (whatsappValidation.exists) {
      allErrors.whatsapp = 'This WhatsApp number is already associated with another user.';
    }
    
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    // Prepare submission data
    const submitData = { ...formData };
    
    // Always remove password in edit mode since it's not editable
    if (isEditMode) {
      delete submitData.password;
    }
    
    // Remove empty fields
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '' || submitData[key] === undefined) {
        delete submitData[key];
      }
    });

    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit User' : 'Create New User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter full name"
              disabled={isLoading}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Role Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.role ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
            {formData.role && (
              <p className="text-gray-500 text-sm mt-1">
                {roles.find(r => r.value === formData.role)?.description}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email {formData.role !== 'customer' && <span className="text-red-500">*</span>}
              {formData.role === 'customer' && <span className="text-gray-500">(optional)</span>}
            </label>
            <div className="relative">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:border-transparent ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : emailValidation.exists
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : emailValidation.lastCheckedEmail && !emailValidation.exists && formData.email?.trim() && /\S+@\S+\.\S+/.test(formData.email)
                    ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                    : 'border-gray-300 focus:ring-primary focus:border-primary'
                }`}
                placeholder="Enter email address"
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {emailValidation.isChecking && formData.email?.trim() && (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                )}
                {!emailValidation.isChecking && emailValidation.exists && (
                  <X className="h-4 w-4 text-red-500" />
                )}
                {!emailValidation.isChecking && !emailValidation.exists && emailValidation.lastCheckedEmail && formData.email?.trim() && /\S+@\S+\.\S+/.test(formData.email) && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
            
            {/* Email validation feedback */}
            {formData.email?.trim() && (
              <>
                {emailValidation.isChecking && (
                  <p className="text-sm text-gray-500 mt-1 flex items-center">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Checking email availability...
                  </p>
                )}
                
                {!emailValidation.isChecking && emailValidation.exists && emailValidation.existingUser && (
                  <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600 font-medium flex items-center">
                      <X className="h-3 w-3 mr-1" />
                      Email already exists
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      This email is already associated with {emailValidation.existingUser.name} 
                      (Role: {emailValidation.existingUser.role}). Please use a different email address.
                    </p>
                  </div>
                )}
                
                {!emailValidation.isChecking && !emailValidation.exists && emailValidation.lastCheckedEmail && /\S+@\S+\.\S+/.test(formData.email) && (
                  <p className="text-sm text-green-600 mt-1 flex items-center">
                    <Check className="h-3 w-3 mr-1" />
                    Email is available
                  </p>
                )}
                
                {emailValidation.error && (
                  <p className="text-sm text-orange-600 mt-1 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {emailValidation.error}
                  </p>
                )}
              </>
            )}
            
            {/* Show validation error from section errors */}
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone Field - Required for all roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="flex relative">
              <select
                value={formData.countryCode}
                onChange={(e) => handleInputChange('countryCode', e.target.value)}
                className="px-3 py-2 border border-r-0 rounded-l-lg border-gray-300 bg-gray-50 text-sm"
                disabled={isLoading}
              >
                <option value="+91">+91</option>
              </select>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`flex-1 px-3 py-2 pr-10 border rounded-r-lg focus:ring-2 focus:border-transparent ${
                  errors.phone || phoneValidation.exists
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : phoneValidation.lastCheckedPhone && !phoneValidation.exists && !phoneValidation.isChecking 
                    ? 'border-green-500 focus:ring-green-500 focus:border-green-500' 
                    : 'border-gray-300 focus:ring-primary focus:border-primary'
                }`}
                placeholder="10-digit phone number"
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {phoneValidation.isChecking && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                {!phoneValidation.isChecking && phoneValidation.exists && (
                  <X className="w-4 h-4 text-red-500" />
                )}
                {!phoneValidation.isChecking && !phoneValidation.exists && phoneValidation.lastCheckedPhone && formData.phone?.trim() && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
            
            {/* Phone Validation Messages */}
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
            {phoneValidation.exists && phoneValidation.existingUser && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-600">
                  This phone number is already associated with <strong>{phoneValidation.existingUser.name}</strong>
                  {phoneValidation.existingUser.email && ` (${phoneValidation.existingUser.email})`}
                </p>
              </div>
            )}
            {phoneValidation.lastCheckedPhone && !phoneValidation.exists && !phoneValidation.isChecking && !errors.phone && (
              <p className="mt-1 text-sm text-green-600">✓ Phone number is available</p>
            )}
            {phoneValidation.error && (
              <p className="mt-1 text-sm text-yellow-600">{phoneValidation.error}</p>
            )}
          </div>

          {/* WhatsApp Field - For all roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number {formData.role === 'customer' && <span className="text-gray-500">(optional)</span>}
            </label>
            <div className="relative">
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:border-transparent ${
                  errors.whatsapp || whatsappValidation.exists 
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                    : whatsappValidation.lastCheckedWhatsapp && !whatsappValidation.exists && !whatsappValidation.isChecking 
                    ? 'border-green-500 focus:ring-green-500 focus:border-green-500' 
                    : 'border-gray-300 focus:ring-primary focus:border-primary'
                }`}
                placeholder="Enter WhatsApp number"
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                {whatsappValidation.isChecking && formData.whatsapp?.trim() && (
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                )}
                {!whatsappValidation.isChecking && whatsappValidation.exists && (
                  <X className="h-4 w-4 text-red-500" />
                )}
                {!whatsappValidation.isChecking && !whatsappValidation.exists && whatsappValidation.lastCheckedWhatsapp && formData.whatsapp?.trim() && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
            
            {/* WhatsApp Validation Messages */}
            {formData.whatsapp?.trim() && (
              <>
                {whatsappValidation.isChecking && (
                  <p className="text-sm text-gray-500 mt-1 flex items-center">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Checking WhatsApp availability...
                  </p>
                )}
                
                {!whatsappValidation.isChecking && whatsappValidation.exists && whatsappValidation.existingUser && (
                  <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600 font-medium flex items-center">
                      <X className="h-3 w-3 mr-1" />
                      WhatsApp number already exists
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      This WhatsApp number is already associated with {whatsappValidation.existingUser.name} 
                      (Role: {whatsappValidation.existingUser.role}). Please use a different WhatsApp number.
                    </p>
                  </div>
                )}
                
                {!whatsappValidation.isChecking && !whatsappValidation.exists && whatsappValidation.lastCheckedWhatsapp && formData.whatsapp?.trim() && (
                  <p className="text-sm text-green-600 mt-1 flex items-center">
                    <Check className="h-3 w-3 mr-1" />
                    WhatsApp number is available
                  </p>
                )}
                
                {whatsappValidation.error && (
                  <p className="text-sm text-orange-600 mt-1 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {whatsappValidation.error}
                  </p>
                )}
              </>
            )}
            
            {errors.whatsapp && <p className="text-red-500 text-sm mt-1">{errors.whatsapp}</p>}
          </div>

          {/* Contact Method Validation for Customers */}
          {formData.role === 'customer' && errors.contact && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{errors.contact}</p>
            </div>
          )}

          {/* Password Field - Only in create mode */}
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter password (min 6 characters)"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <Eye className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
          )}

          {/* Password Notice in Edit Mode */}
          {isEditMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center">
                <Key className="h-4 w-4 text-blue-600 mr-2" />
                <p className="text-sm text-blue-700">
                  To change the password for this user, use the "Reset Password" button after saving.
                </p>
              </div>
            </div>
          )}

          {/* Notification Preferences - For all users */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Preferences
            </label>
            <div className="space-y-3">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notificationPreferences.whatsappEnabled}
                    onChange={(e) => handleNotificationChange('whatsappEnabled', e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable WhatsApp notifications</span>
                </label>
                {formData.notificationPreferences.whatsappEnabled && (
                  <div className="ml-6 mt-1">
                    <p className="text-xs text-gray-500">
                      {formData.whatsapp && formData.whatsapp.trim() 
                        ? `Will send to: ${formData.whatsapp}` 
                        : `Will send to phone number: ${formData.phone || 'Not provided'}`
                      }
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notificationPreferences.emailEnabled}
                    onChange={(e) => handleNotificationChange('emailEnabled', e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    disabled={isLoading}
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable email notifications</span>
                </label>
                {formData.notificationPreferences.emailEnabled && (
                  <div className="ml-6 mt-1">
                    <p className="text-xs text-gray-500">
                      {formData.email && formData.email.trim() 
                        ? `Will send to: ${formData.email}` 
                        : 'Email address required for email notifications'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* General notification info */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-4 w-4 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-2">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> If WhatsApp notifications are enabled without a specific WhatsApp number, notifications will be sent to the phone number.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isEditMode ? 'Update User' : 'Create User'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Password Reset Modal Component
const PasswordResetModal = ({ isOpen, onClose, user, onSubmit, isLoading }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    onSubmit(newPassword);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Reset password for: <span className="font-medium">{user?.name}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter new password (min 6 characters)"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isLoading}
              >
                <Eye className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Confirm new password"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>Reset Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmModal = ({ isOpen, onClose, user, onConfirm, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete User</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete <span className="font-medium">{user?.name}</span>? 
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>Delete User</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main User Management Page Component
export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [stats, setStats] = useState(null);
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statusToggleData, setStatusToggleData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const itemsPerPage = 10;
  const roles = getUserRoles();

  // Prevent background scroll when modals are open
  useEffect(() => {
    const isAnyModalOpen = showUserModal || showPasswordModal || showDeleteModal || showStatusConfirm;
    
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showUserModal, showPasswordModal, showDeleteModal, showStatusConfirm]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        role: roleFilter === 'all' ? '' : roleFilter
      };
      
      const response = await getAllUsers(params);
      setUsers(response.data);
      setTotalPages(response.totalPages);
      setTotalUsers(response.total);
    } catch (error) {
      console.error('Error fetching users:', error);
      // You can add toast notification here
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, roleFilter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await getUserStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setSortOrder('newest');
    setShowFilters(false);
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || roleFilter || sortOrder !== 'newest';
  const activeFilterCount = [roleFilter, sortOrder !== 'newest' ? sortOrder : null].filter(Boolean).length;

  // Handle user creation
  const handleCreateUser = async (userData) => {
    try {
      setModalLoading(true);
      await createUser(userData);
      setShowUserModal(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
      // Add success toast
    } catch (error) {
      console.error('Error creating user:', error);
      // Add error toast
    } finally {
      setModalLoading(false);
    }
  };

  // Handle user update
  const handleUpdateUser = async (userData) => {
    try {
      setModalLoading(true);
      await updateUser(selectedUser._id, userData);
      setShowUserModal(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
      // Add success toast
    } catch (error) {
      console.error('Error updating user:', error);
      // Add error toast
    } finally {
      setModalLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (newPassword) => {
    try {
      setModalLoading(true);
      await resetUserPassword(selectedUser._id, newPassword);
      setShowPasswordModal(false);
      setSelectedUser(null);
      // Add success toast
    } catch (error) {
      console.error('Error resetting password:', error);
      // Add error toast
    } finally {
      setModalLoading(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async () => {
    try {
      setModalLoading(true);
      await deleteUser(selectedUser._id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
      // Add success toast
    } catch (error) {
      console.error('Error deleting user:', error);
      // Add error toast
    } finally {
      setModalLoading(false);
    }
  };

  // Handle status toggle confirmation
  const handleToggleStatusClick = (user, isActive) => {
    setSelectedUser(user);
    setStatusToggleData({ user, isActive });
    setShowStatusConfirm(true);
  };

  // Handle confirmed status toggle
  const handleToggleStatusConfirm = async () => {
    try {
      await toggleUserStatus(statusToggleData.user._id, statusToggleData.isActive);
      setShowStatusConfirm(false);
      setStatusToggleData(null);
      setSelectedUser(null);
      fetchUsers();
      fetchStats();
      // Add success toast
    } catch (error) {
      console.error('Error toggling user status:', error);
      setShowStatusConfirm(false);
      setStatusToggleData(null);
      setSelectedUser(null);
      // Add error toast
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Section - Page Title */}
      <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary mobile-truncate">
              User Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage system users and their permissions</p>
          </div>
          {stats && (
            <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{stats.totalUsers} users</span>
              </div>
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4" />
                <span>{stats.roleStats?.admin || 0} admins</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Filter and Action Bar */}
        <div className="p-4 md:p-6 border-b border-fourth sticky top-0 bg-tertiary z-20">
          {/* Filter Status Indicator */}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                </span>
              </div>
              <button
                onClick={resetFilters}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-150"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Main Controls Row */}
          <div className="flex flex-col gap-3">
            {/* Search and Filter Toggle Row */}
            <div className="flex gap-2 items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-2 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary placeholder-gray-400"
                />
              </div>
              
              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center justify-center p-2 border rounded-md transition-colors duration-150 ease-in-out ${
                  showFilters || activeFilterCount > 0
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Toggle filters"
              >
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="ml-1 text-xs font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Create User Button - Desktop */}
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setShowUserModal(true);
                }}
                className="hidden sm:inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </button>
            </div>

            {/* Create User Button - Mobile */}
            <div className="w-full sm:hidden">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setShowUserModal(true);
                }}
                className="inline-flex items-center justify-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </button>
            </div>

            {/* Filters Section - Collapsible */}
            {showFilters && (
              <div className="border-t border-gray-200 pt-3 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {/* Role Filter */}
                  <div className="relative">
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Roles</option>
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Sort Order */}
                  <div className="relative">
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="name">Name A-Z</option>
                      <option value="role">By Role</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters ? 'Try adjusting your search criteria.' : 'Get started by creating a new user.'}
              </p>
              {!hasActiveFilters && (
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setShowUserModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:opacity-90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create User
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            {user.email && (
                              <div className="text-sm text-gray-500">{user.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {formatUserRole(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.phone && (
                          <div>{user.countryCode || '+91'} {user.phone}</div>
                        )}
                        {user.whatsapp && user.whatsapp !== user.phone && (
                          <div className="text-gray-500">WhatsApp: {user.whatsapp}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {/* View Button */}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                            title="View/Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          {/* Password Reset Button */}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPasswordModal(true);
                            }}
                            className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                            title="Reset Password"
                          >
                            <Key className="h-4 w-4" />
                          </button>
                          
                          {/* Status Toggle Button */}
                          {user._id !== currentUser?.id && (
                            <button
                              onClick={() => handleToggleStatusClick(user, user.isActive === false)}
                              className={`p-1 rounded ${
                                user.isActive !== false 
                                  ? 'text-red-600 hover:text-red-900' 
                                  : 'text-green-600 hover:text-green-900'
                              }`}
                              title={user.isActive !== false ? 'Deactivate User' : 'Activate User'}
                            >
                              {user.isActive !== false ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                          )}
                          
                          {/* Delete Button */}
                          {user._id !== currentUser?.id && (
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} results
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <UserFormModal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSubmit={selectedUser ? handleUpdateUser : handleCreateUser}
        isLoading={modalLoading}
      />

      <PasswordResetModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSubmit={handlePasswordReset}
        isLoading={modalLoading}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onConfirm={handleDeleteUser}
        isLoading={modalLoading}
      />

      <ConfirmDialog
        isOpen={showStatusConfirm}
        onClose={() => {
          setShowStatusConfirm(false);
          setStatusToggleData(null);
          setSelectedUser(null);
        }}
        onConfirm={handleToggleStatusConfirm}
        title={`${statusToggleData?.isActive ? 'Activate' : 'Deactivate'} User`}
        message={`Are you sure you want to ${statusToggleData?.isActive ? 'activate' : 'deactivate'} ${selectedUser?.name}? ${!statusToggleData?.isActive ? 'This user will not be able to login to the system.' : 'This user will regain access to the system.'}`}
      />
    </div>
  );
}

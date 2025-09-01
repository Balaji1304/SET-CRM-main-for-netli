import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Phone, User, MapPin, MessageSquare, ArrowLeft, AlertTriangle, Loader2, CheckCircle, ChevronDown, Check, X } from 'lucide-react';
import { createEnquiry, getEnquiry, updateEnquiry } from '../../services/enquiryService';
import { checkEmailExists, checkPhoneExists, checkWhatsappExists } from '../../services/leadService';

// Form options matching the backend enum values
const LEAD_SOURCE_OPTIONS = [
  { value: 'referral', label: 'Referral' },
  { value: 'indiamart', label: 'IndiaMART' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'website', label: 'Website Inquiry' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'paper_ad', label: 'Paper Ad' },
  { value: 'existing_customer', label: 'Existing Customer' },
  { value: 'other', label: 'Other' }
];

const LEAD_TYPE_OPTIONS = [
  { value: 'end_user', label: 'End User' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'dealer', label: 'Dealer' },
  { value: 'builder', label: 'Builder' },
  { value: 'other', label: 'Other' }
];

const defaultFormState = {
  leadSource: '',
  customLeadSource: '',
  leadType: '',
  customLeadType: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  countryCode: '+91',
  whatsapp: '',
  whatsappSameAsPhone: true,
  hasWhatsapp: true,
  billingAddress: '',
  shippingAddress: '',
  referredBy: '',
  productRequirements: '',
  notes: ''
};

export default function EnquiryPage() {
  const navigate = useNavigate();
  const { id: enquiryId } = useParams();
  const { state: locationState } = useLocation();
  
  const [formData, setFormData] = useState(defaultFormState);
  const [initialFormData, setInitialFormData] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingEnquiry, setIsLoadingEnquiry] = useState(false);
  const [originalEnquiry, setOriginalEnquiry] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Email validation state
  const [emailValidation, setEmailValidation] = useState({
    isChecking: false,
    exists: false,
    existingLead: null,
    error: null,
    lastCheckedEmail: ''
  });
  const emailCheckTimeout = useRef(null);

  // Phone validation state
  const [phoneValidation, setPhoneValidation] = useState({
    isChecking: false,
    exists: false,
    existingLead: null,
    error: null,
    lastCheckedPhone: ''
  });
  const phoneCheckTimeout = useRef(null);

  // WhatsApp validation state
  const [whatsappValidation, setWhatsappValidation] = useState({
    isChecking: false,
    exists: false,
    existingLead: null,
    error: null,
    lastCheckedWhatsapp: ''
  });
  const whatsappCheckTimeout = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeout.current) {
        clearTimeout(emailCheckTimeout.current);
      }
      if (phoneCheckTimeout.current) {
        clearTimeout(phoneCheckTimeout.current);
      }
      if (whatsappCheckTimeout.current) {
        clearTimeout(whatsappCheckTimeout.current);
      }
    };
  }, []);

  // Determine if we're in edit mode and load enquiry data
  useEffect(() => {
    const initializeForm = async () => {
      // Check if we have an enquiry ID in the URL (edit mode)
      if (enquiryId) {
        setIsEditMode(true);
        setIsLoadingEnquiry(true);
        
        try {
          const response = await getEnquiry(enquiryId);
          if (response.success) {
            const enquiry = response.data;
            setOriginalEnquiry(enquiry);
            
            // Set form data from the loaded enquiry
            const loadedFormData = {
              leadSource: enquiry.leadSource || '',
              customLeadSource: enquiry.customLeadSource || '',
              leadType: enquiry.leadType || '',
              customLeadType: enquiry.customLeadType || '',
              firstName: enquiry.firstName || '',
              lastName: enquiry.lastName || '',
              email: enquiry.email || '',
              phone: enquiry.phone || '',
              countryCode: enquiry.countryCode || '+91',
              whatsapp: enquiry.whatsapp || '',
              whatsappSameAsPhone: enquiry.whatsappSameAsPhone !== undefined ? enquiry.whatsappSameAsPhone : true,
              hasWhatsapp: enquiry.hasWhatsapp !== undefined ? enquiry.hasWhatsapp : true,
              billingAddress: enquiry.billingAddress || '',
              shippingAddress: enquiry.shippingAddress || '',
              referredBy: enquiry.referredBy || '',
              productRequirements: enquiry.productRequirements || '',
              notes: enquiry.notes || ''
            };
            
            setFormData(loadedFormData);
            setInitialFormData(loadedFormData);
          } else {
            setSubmissionError(response.message || 'Failed to load enquiry');
          }
        } catch (error) {
          console.error('Error fetching enquiry:', error);
          setSubmissionError('Failed to load enquiry data');
        } finally {
          setIsLoadingEnquiry(false);
        }
      } else {
        // Create mode - reset to defaults
        setIsEditMode(false);
        setFormData(defaultFormState);
        setInitialFormData(defaultFormState);
      }
    };

    initializeForm();
  }, [enquiryId, locationState]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let newFormData = { 
      ...formData, 
      [name]: value ?? '' 
    };

    // Handle WhatsApp logic with boolean values
    if (name === 'whatsappSameAsPhone') {
      if (value === 'yes') {
        newFormData.whatsappSameAsPhone = true;
        newFormData.hasWhatsapp = true;
        newFormData.whatsapp = newFormData.phone;
      } else if (value === 'no') {
        newFormData.whatsappSameAsPhone = false;
        newFormData.hasWhatsapp = true;
        newFormData.whatsapp = '';
      } else if (value === 'none') {
        newFormData.whatsappSameAsPhone = false;
        newFormData.hasWhatsapp = false;
        newFormData.whatsapp = '';
      }
    }

    // If phone changes and whatsappSameAsPhone is true, update whatsapp
    if (name === 'phone' && newFormData.whatsappSameAsPhone) {
      newFormData.whatsapp = value;
    }

    setFormData(newFormData);
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Trigger email validation
    if (name === 'email' && value.trim() !== emailValidation.lastCheckedEmail) {
      handleEmailValidation(value.trim());
    }

    // Trigger phone validation only after 10 digits are entered
    if (name === 'phone') {
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
          existingLead: null,
          error: null,
          lastCheckedPhone: ''
        });
      }
    }

    // Trigger WhatsApp validation only after 10 digits are entered (when different from phone)
    if (name === 'whatsapp' && !newFormData.whatsappSameAsPhone) {
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
          existingLead: null,
          error: null,
          lastCheckedWhatsapp: ''
        });
      }
    }
  };

  // Email validation with debounce
  const handleEmailValidation = useCallback(async (email) => {
    // Clear any existing timeout
    if (emailCheckTimeout.current) {
      clearTimeout(emailCheckTimeout.current);
    }

    // Reset validation state if email is empty or invalid format
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailValidation({
        isChecking: false,
        exists: false,
        existingLead: null,
        error: null,
        lastCheckedEmail: email
      });
      return;
    }

    // Skip validation if email hasn't changed or is same as original
    if (email === emailValidation.lastCheckedEmail || 
        (originalEnquiry && email === originalEnquiry.email)) {
      return;
    }

    // Set checking state
    setEmailValidation(prev => ({
      ...prev,
      isChecking: true,
      error: null,
      lastCheckedEmail: email
    }));

    // Debounce the API call
    emailCheckTimeout.current = setTimeout(async () => {
      try {
        const response = await checkEmailExists(email, enquiryId); // Pass enquiry ID to exclude it
        if (response.success) {
          setEmailValidation({
            isChecking: false,
            exists: response.exists,
            existingLead: response.lead,
            error: null,
            lastCheckedEmail: email
          });
        } else {
          setEmailValidation({
            isChecking: false,
            exists: false,
            existingLead: null,
            error: 'Unable to check email availability',
            lastCheckedEmail: email
          });
        }
      } catch (error) {
        console.error('Error checking email:', error);
        setEmailValidation({
          isChecking: false,
          exists: false,
          existingLead: null,
          error: 'Unable to check email availability',
          lastCheckedEmail: email
        });
      }
    }, 800); // 800ms debounce
  }, [emailValidation.lastCheckedEmail, originalEnquiry, enquiryId]);

  // Phone validation with debounce
  const handlePhoneValidation = useCallback(async (phone) => {
    // Clear any existing timeout
    if (phoneCheckTimeout.current) {
      clearTimeout(phoneCheckTimeout.current);
    }

    // Reset validation state if phone is empty or invalid format
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithoutCountryCode = cleanPhone.startsWith('91') && cleanPhone.length === 12 
      ? cleanPhone.substring(2) 
      : cleanPhone;
    
    if (!phone || !/^[6-9]\d{9}$/.test(phoneWithoutCountryCode)) {
      setPhoneValidation({
        isChecking: false,
        exists: false,
        existingLead: null,
        error: null,
        lastCheckedPhone: phone
      });
      return;
    }

    // Skip validation if phone hasn't changed or is same as original
    if (phone === phoneValidation.lastCheckedPhone || 
        (originalEnquiry && phone === originalEnquiry.phone)) {
      return;
    }

    // Set checking state
    setPhoneValidation(prev => ({
      ...prev,
      isChecking: true,
      error: null,
      lastCheckedPhone: phone
    }));

    // Debounce the API call
    phoneCheckTimeout.current = setTimeout(async () => {
      try {
        const response = await checkPhoneExists(phone, enquiryId); // Pass enquiry ID to exclude it
        if (response.success) {
          setPhoneValidation({
            isChecking: false,
            exists: response.exists,
            existingLead: response.lead,
            error: null,
            lastCheckedPhone: phone
          });
        } else {
          setPhoneValidation({
            isChecking: false,
            exists: false,
            existingLead: null,
            error: 'Unable to check phone availability',
            lastCheckedPhone: phone
          });
        }
      } catch (error) {
        console.error('Error checking phone:', error);
        setPhoneValidation({
          isChecking: false,
          exists: false,
          existingLead: null,
          error: 'Unable to check phone availability',
          lastCheckedPhone: phone
        });
      }
    }, 800); // 800ms debounce
  }, [phoneValidation.lastCheckedPhone, originalEnquiry, enquiryId]);

  // WhatsApp validation with debounce
  const handleWhatsappValidation = useCallback(async (whatsapp) => {
    // Clear any existing timeout
    if (whatsappCheckTimeout.current) {
      clearTimeout(whatsappCheckTimeout.current);
    }

    // Reset validation state if whatsapp is empty or invalid format
    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    const whatsappWithoutCountryCode = cleanWhatsapp.startsWith('91') && cleanWhatsapp.length === 12 
      ? cleanWhatsapp.substring(2) 
      : cleanWhatsapp;
    
    if (!whatsapp || !/^[6-9]\d{9}$/.test(whatsappWithoutCountryCode)) {
      setWhatsappValidation({
        isChecking: false,
        exists: false,
        existingLead: null,
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

    // Debounce the API call
    whatsappCheckTimeout.current = setTimeout(async () => {
      try {
        const response = await checkWhatsappExists(whatsapp, isEditMode ? enquiryId : null);
        if (response.success) {
          setWhatsappValidation({
            isChecking: false,
            exists: response.exists,
            existingLead: response.lead,
            error: null,
            lastCheckedWhatsapp: whatsapp
          });
        } else {
          setWhatsappValidation({
            isChecking: false,
            exists: false,
            existingLead: null,
            error: 'Unable to check WhatsApp availability',
            lastCheckedWhatsapp: whatsapp
          });
        }
      } catch (error) {
        console.error('Error checking WhatsApp:', error);
        setWhatsappValidation({
          isChecking: false,
          exists: false,
          existingLead: null,
          error: 'Unable to check WhatsApp availability',
          lastCheckedWhatsapp: whatsapp
        });
      }
    }, 800); // 800ms debounce
  }, []);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.leadSource) {
      errors.leadSource = 'Lead Source is required.';
    }
    
    if (formData.leadSource === 'other' && !formData.customLeadSource) {
      errors.customLeadSource = 'Please specify the lead source.';
    }
    
    // Lead Type is optional, but if "other" is selected, custom value is required
    if (formData.leadType === 'other' && !formData.customLeadType) {
      errors.customLeadType = 'Please specify the lead type.';
    }
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First Name is required.';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (phoneValidation.exists) {
      errors.phone = 'This phone number is already associated with another lead.';
    }
    
    if (formData.email) {
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = 'Please enter a valid email address.';
      } else if (emailValidation.exists) {
        errors.email = 'This email address is already associated with another lead.';
      }
    }

    // Validate WhatsApp if required
    if (formData.hasWhatsapp && !formData.whatsappSameAsPhone && !formData.whatsapp) {
      errors.whatsapp = 'WhatsApp number is required when different from phone number.';
    } else if (formData.whatsapp && !formData.whatsappSameAsPhone && whatsappValidation.exists) {
      errors.whatsapp = 'This WhatsApp number is already associated with another lead.';
    }

    // Validate at least one contact method
    if (!formData.email && (!formData.whatsapp || !formData.hasWhatsapp)) {
      errors.contact = 'At least one contact method (email or WhatsApp number) is required.';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmissionError('Please correct the errors in the form.');
      return;
    }
    
    setIsSubmitting(true);
    setSubmissionError(null);
    
    try {
      let response;
      if (isEditMode) {
        response = await updateEnquiry(enquiryId, formData);
      } else {
        response = await createEnquiry(formData);
      }
      
      if (response.success) {
        setShowSuccessMessage(true);
        
        if (!isEditMode) {
          // Reset form only for create mode
          setFormData(defaultFormState);
          setValidationErrors({});
        }
        
        // Redirect to enquiries page after a short delay
        setTimeout(() => {
          navigate('/dashboard/enquiries', {
            state: { 
              successMessage: isEditMode 
                ? 'Enquiry updated successfully!' 
                : 'Enquiry created successfully!',
              enquiryId: isEditMode ? enquiryId : (response.data?._id || response.data?.id)
            }
          });
        }, 1500);
      } else {
        throw new Error(response.message || `Failed to ${isEditMode ? 'update' : 'create'} enquiry.`);
      }
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} enquiry:`, err);
      setSubmissionError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(defaultFormState);
    setValidationErrors({});
    setSubmissionError(null);
  };

  // Special email input field with validation feedback
  const renderEmailField = (name, label, placeholder = '', required = false) => (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="email"
          id={name}
          name={name}
          value={formData[name] ?? ''}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className={`block w-full pl-3 pr-10 py-3 bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 text-sm transition-all duration-150 ${
            validationErrors[name] 
              ? 'border-red-500 ring-red-500 focus:ring-red-500 focus:border-red-500' 
              : emailValidation.exists
              ? 'border-red-500 ring-red-500 focus:ring-red-500 focus:border-red-500'
              : emailValidation.lastCheckedEmail && !emailValidation.exists && formData[name]?.trim() && /\S+@\S+\.\S+/.test(formData[name])
              ? 'border-green-500 ring-green-500 focus:ring-green-500 focus:border-green-500'
              : 'border-gray-300 hover:border-gray-400 focus:ring-primary focus:border-primary'
          }`}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {emailValidation.isChecking && formData[name]?.trim() && (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          )}
          {!emailValidation.isChecking && emailValidation.exists && (
            <X className="h-4 w-4 text-red-500" />
          )}
          {!emailValidation.isChecking && !emailValidation.exists && emailValidation.lastCheckedEmail && formData[name]?.trim() && /\S+@\S+\.\S+/.test(formData[name]) && (
            <Check className="h-4 w-4 text-green-500" />
          )}
        </div>
      </div>
      
      {/* Validation Messages */}
      {formData[name]?.trim() && (
        <>
          {emailValidation.isChecking && (
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Checking email availability...
            </p>
          )}
          
          {!emailValidation.isChecking && emailValidation.exists && emailValidation.existingLead && (
            <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium flex items-center">
                <X className="h-3 w-3 mr-1" />
                Email already exists
              </p>
              <p className="text-xs text-red-500 mt-1">
                This email is already associated with {emailValidation.existingLead.firstName} {emailValidation.existingLead.lastName} 
                (Status: {emailValidation.existingLead.status}). Please use a different email address.
              </p>
            </div>
          )}
          
          {!emailValidation.isChecking && !emailValidation.exists && emailValidation.lastCheckedEmail && /\S+@\S+\.\S+/.test(formData[name]) && (
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
      
      {validationErrors[name] && (
        <p className="text-xs text-red-500 mt-1">{validationErrors[name]}</p>
      )}
    </div>
  );

  // Special phone input field with validation feedback
  const renderPhoneField = () => (
    <div className="w-full">
      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
        Phone Number <span className="text-red-500">*</span>
      </label>
      <div className="relative flex rounded-lg shadow-sm">
        <select
          name="countryCode"
          value={formData.countryCode}
          onChange={handleInputChange}
          className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-700 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
        >
          <option value="+91">+91 (IN)</option>
          <option value="+1">+1 (US)</option>
          <option value="+44">+44 (UK)</option>
        </select>
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="(555) 000-0000"
            required
            className={`block w-full pl-10 pr-10 py-3 bg-white border rounded-none rounded-r-lg shadow-sm focus:outline-none focus:ring-2 text-sm transition-all duration-150 ${
              validationErrors.phone 
                ? 'border-red-500 ring-red-500 focus:ring-red-500 focus:border-red-500' 
                : phoneValidation.exists
                ? 'border-red-500 ring-red-500 focus:ring-red-500 focus:border-red-500'
                : phoneValidation.lastCheckedPhone && !phoneValidation.exists && formData.phone?.trim()
                ? 'border-green-500 ring-green-500 focus:ring-green-500 focus:border-green-500'
                : 'border-gray-300 hover:border-gray-400 focus:ring-primary focus:border-primary'
            }`}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {phoneValidation.isChecking && formData.phone?.trim() && (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            )}
            {!phoneValidation.isChecking && phoneValidation.exists && (
              <X className="h-4 w-4 text-red-500" />
            )}
            {!phoneValidation.isChecking && !phoneValidation.exists && phoneValidation.lastCheckedPhone && formData.phone?.trim() && (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>
      </div>
      
      {/* Validation Messages */}
      {formData.phone?.trim() && (
        <>
          {phoneValidation.isChecking && (
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Checking phone availability...
            </p>
          )}
          
          {!phoneValidation.isChecking && phoneValidation.exists && phoneValidation.existingLead && (
            <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium flex items-center">
                <X className="h-3 w-3 mr-1" />
                Phone number already exists
              </p>
              <p className="text-xs text-red-500 mt-1">
                This phone number is already associated with {phoneValidation.existingLead.firstName} {phoneValidation.existingLead.lastName} 
                (Status: {phoneValidation.existingLead.status}). Please use a different phone number.
              </p>
            </div>
          )}
          
          {!phoneValidation.isChecking && !phoneValidation.exists && phoneValidation.lastCheckedPhone && formData.phone?.trim() && (
            <p className="text-sm text-green-600 mt-1 flex items-center">
              <Check className="h-3 w-3 mr-1" />
              Phone number is available
            </p>
          )}
          
          {phoneValidation.error && (
            <p className="text-sm text-orange-600 mt-1 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {phoneValidation.error}
            </p>
          )}
        </>
      )}
      
      {validationErrors.phone && (
        <p className="text-xs text-red-500 mt-1">{validationErrors.phone}</p>
      )}
    </div>
  );

  const renderInputField = (name, label, type = 'text', required = false, icon = null, placeholder = '') => (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          id={name}
          name={name}
          value={formData[name] ?? ''}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className={`block w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-3 bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-150 ${
            validationErrors[name] 
              ? 'border-red-500 ring-red-500' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        />
      </div>
      {validationErrors[name] && (
        <p className="text-xs text-red-500 mt-1">{validationErrors[name]}</p>
      )}
    </div>
  );

  const renderSelectField = (name, label, options, required = false) => (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={formData[name] ?? ''}
          onChange={handleInputChange}
          required={required}
          className={`block w-full px-3 py-3 bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm appearance-none transition-all duration-150 ${
            validationErrors[name] 
              ? 'border-red-500 ring-red-500' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
      </div>
      {validationErrors[name] && (
        <p className="text-xs text-red-500 mt-1">{validationErrors[name]}</p>
      )}
    </div>
  );

  const renderTextAreaField = (name, label, placeholder = '', rows = 4) => (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={formData[name] ?? ''}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="block w-full px-3 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all duration-150 hover:border-gray-400 resize-none"
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Loading state for edit mode */}
      {isEditMode && isLoadingEnquiry && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-gray-600">Loading enquiry details...</p>
          </div>
        </div>
      )}

      {/* Show form only when not loading or not in edit mode */}
      {(!isEditMode || !isLoadingEnquiry) && (
        <>
          {/* Header */}
          <div className="border-b border-gray-200 pb-5 mb-8">
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => navigate('/dashboard/enquiries')}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                aria-label="Back to enquiries"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {isEditMode ? 'Edit Enquiry' : 'New Enquiry Form'}
              </h1>
            </div>
          </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium">Enquiry created successfully!</span>
          <span className="text-sm">The enquiry is now available for assignment to sales personnel.</span>
        </div>
      )}

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            
            {/* Error Message */}
            {submissionError && (
              <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{submissionError}</span>
              </div>
            )}

            {/* Lead Information Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
                Lead Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderSelectField('leadSource', 'Lead Source', LEAD_SOURCE_OPTIONS, true)}
                {formData.leadSource === 'other' && (
                  renderInputField('customLeadSource', 'Specify Lead Source', 'text', true, null, 'Enter lead source')
                )}
                {renderSelectField('leadType', 'Lead Type', LEAD_TYPE_OPTIONS, false)}
                {formData.leadType === 'other' && (
                  renderInputField('customLeadType', 'Specify Lead Type', 'text', false, null, 'Enter lead type')
                )}
              </div>
            </section>

            {/* Personal Information Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInputField('firstName', 'First Name', 'text', true, <User className="w-4 h-4 text-gray-400" />, 'Enter first name')}
                {renderInputField('lastName', 'Last Name', 'text', false, <User className="w-4 h-4 text-gray-400" />, 'Enter last name (if available)')}
                {renderEmailField('email', 'Email Address', 'name@example.com (if available)', false)}
                
                {/* Phone Number with Country Code and Validation */}
                {renderPhoneField()}
              </div>

              {/* WhatsApp Section with Radio Button Logic */}
              <div className="mt-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Is WhatsApp Number same as Phone Number?
                  </label>
                  
                  <div className="space-y-2 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="whatsappSameAsPhone"
                        value="yes"
                        checked={formData.whatsappSameAsPhone === true && formData.hasWhatsapp === true}
                        onChange={handleInputChange}
                        className="mr-2 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">Yes (WhatsApp number is same as phone number)</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="whatsappSameAsPhone"
                        value="no"
                        checked={formData.whatsappSameAsPhone === false && formData.hasWhatsapp === true}
                        onChange={handleInputChange}
                        className="mr-2 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">No (Different WhatsApp number)</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="whatsappSameAsPhone"
                        value="none"
                        checked={formData.hasWhatsapp === false}
                        onChange={handleInputChange}
                        className="mr-2 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">No WhatsApp Number</span>
                    </label>
                  </div>
                  
                  {/* WhatsApp Number Input (only shown when "No" is selected) */}
                  {formData.whatsappSameAsPhone === false && formData.hasWhatsapp === true && (
                    <div className="w-full">
                      <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
                        WhatsApp Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          id="whatsapp"
                          name="whatsapp"
                          value={formData.whatsapp}
                          onChange={handleInputChange}
                          placeholder="Enter WhatsApp number"
                          required={formData.hasWhatsapp && !formData.whatsappSameAsPhone}
                          className={`mt-1 block w-full px-3 py-2.5 pr-10 bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-1 text-sm ${
                            validationErrors.whatsapp || whatsappValidation.exists 
                              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                              : whatsappValidation.lastCheckedWhatsapp && !whatsappValidation.exists && formData.whatsapp?.trim() 
                              ? 'border-green-500 focus:ring-green-500 focus:border-green-500' 
                              : 'border-gray-300 focus:ring-primary focus:border-primary'
                          }`}
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
                          
                          {!whatsappValidation.isChecking && whatsappValidation.exists && whatsappValidation.existingLead && (
                            <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-md">
                              <p className="text-sm text-red-600 font-medium flex items-center">
                                <X className="h-3 w-3 mr-1" />
                                WhatsApp number already exists
                              </p>
                              <p className="text-xs text-red-500 mt-1">
                                This WhatsApp number is already associated with {whatsappValidation.existingLead.firstName} {whatsappValidation.existingLead.lastName} 
                                (Status: {whatsappValidation.existingLead.status}). Please use a different WhatsApp number.
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
                      
                      {validationErrors.whatsapp && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.whatsapp}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Show current WhatsApp number when "Yes" is selected */}
                  {formData.whatsappSameAsPhone === true && formData.hasWhatsapp === true && formData.phone && (
                    <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
                      ✓ WhatsApp Number: {formData.countryCode} {formData.phone}
                    </div>
                  )}
                </div>

                {/* Contact Method Warning */}
                {validationErrors.contact && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600 font-medium flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {validationErrors.contact}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Address & Reference Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
                Address & Reference Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInputField('billingAddress', 'Billing Address', 'text', false, <MapPin className="w-4 h-4 text-gray-400" />, 'Enter billing address (if available)')}
                {renderInputField('shippingAddress', 'Shipping Address', 'text', false, <MapPin className="w-4 h-4 text-gray-400" />, 'Enter shipping address (if different from billing)')}
                {renderInputField('referredBy', 'Referred By', 'text', false, null, 'Who referred this lead? (if applicable)')}
              </div>
            </section>

            {/* Product Requirements Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
                Product Information
              </h2>
              {renderTextAreaField('productRequirements', 'Product Requirements', 'What products or services is the customer interested in? Any specific requirements mentioned during the call...')}
            </section>

            {/* Additional Notes Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
                Additional Notes
              </h2>
              {renderTextAreaField('notes', 'Call Notes', 'Any additional information, customer preferences, or important details from the conversation...')}
            </section>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update Enquiry' : 'Create Enquiry'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
        </>
      )}
    </div>
  );
} 
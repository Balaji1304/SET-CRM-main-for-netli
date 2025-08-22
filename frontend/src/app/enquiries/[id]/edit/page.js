import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Phone, User, MapPin, MessageSquare, ArrowLeft, AlertTriangle, Loader2, CheckCircle, ChevronDown } from 'lucide-react';
import { getEnquiry, updateEnquiry } from '../../../../services/enquiryService';

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
  billingAddress: '',
  shippingAddress: '',
  referredBy: '',
  productRequirements: '',
  notes: ''
};

export default function EditEnquiryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [originalEnquiry, setOriginalEnquiry] = useState(null);

  // Fetch enquiry data on component mount
  useEffect(() => {
    const fetchEnquiry = async () => {
      try {
        setIsLoading(true);
        const response = await getEnquiry(id);
        
        if (response.success) {
          const enquiry = response.data;
          setOriginalEnquiry(enquiry);
          
          // Check if enquiry can be edited (not assigned yet)
          if (enquiry.assignmentStatus !== 'pending_assignment') {
            setError('This enquiry cannot be edited as it has already been assigned to a salesperson.');
            return;
          }
          
          // Populate form with enquiry data
          setFormData({
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
            billingAddress: enquiry.billingAddress || '',
            shippingAddress: enquiry.shippingAddress || '',
            referredBy: enquiry.referredBy || '',
            productRequirements: enquiry.productRequirements || '',
            notes: enquiry.notes || ''
          });
        } else {
          setError(response.message || 'Failed to fetch enquiry details');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching enquiry details');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchEnquiry();
    }
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const response = await updateEnquiry(id, formData);
      
      if (response.success) {
        // Navigate back to enquiries list with success message
        navigate('/dashboard/enquiries', {
          state: { 
            successMessage: 'Enquiry updated successfully!' 
          }
        });
      } else {
        setError(response.message || 'Failed to update enquiry');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while updating the enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (originalEnquiry) {
      setFormData({
        leadSource: originalEnquiry.leadSource || '',
        customLeadSource: originalEnquiry.customLeadSource || '',
        leadType: originalEnquiry.leadType || '',
        customLeadType: originalEnquiry.customLeadType || '',
        firstName: originalEnquiry.firstName || '',
        lastName: originalEnquiry.lastName || '',
        email: originalEnquiry.email || '',
        phone: originalEnquiry.phone || '',
        countryCode: originalEnquiry.countryCode || '+91',
        whatsapp: originalEnquiry.whatsapp || '',
        billingAddress: originalEnquiry.billingAddress || '',
        shippingAddress: originalEnquiry.shippingAddress || '',
        referredBy: originalEnquiry.referredBy || '',
        productRequirements: originalEnquiry.productRequirements || '',
        notes: originalEnquiry.notes || ''
      });
    }
  };

  // Form field renderer function
  const renderInputField = (name, label, type = 'text', required = false, icon = null, placeholder = '') => (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
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
          value={formData[name]}
          onChange={handleInputChange}
          required={required}
          placeholder={placeholder}
          className={`block w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary transition-colors`}
        />
      </div>
    </div>
  );

  const renderSelectField = (name, label, options, required = false, allowCustom = false) => (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={formData[name]}
          onChange={handleInputChange}
          required={required}
          className="block w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary transition-colors appearance-none"
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      
      {/* Custom input field for "Other" option */}
      {allowCustom && formData[name] === 'other' && (
        <div className="mt-2">
          <input
            type="text"
            name={`custom${name.charAt(0).toUpperCase() + name.slice(1)}`}
            value={formData[`custom${name.charAt(0).toUpperCase() + name.slice(1)}`]}
            onChange={handleInputChange}
            placeholder={`Please specify ${label.toLowerCase()}`}
            className="block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>
      )}
    </div>
  );

  const renderTextAreaField = (name, label, placeholder = '', required = false) => (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={formData[name]}
        onChange={handleInputChange}
        required={required}
        rows={4}
        placeholder={placeholder}
        className="block w-full pl-3 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
      />
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-700">Loading enquiry details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !originalEnquiry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Enquiry</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard/enquiries')}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Back to Enquiries
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <button
              onClick={() => navigate('/dashboard/enquiries')}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors"
              aria-label="Back to enquiries"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Enquiry</h1>
              <p className="text-sm text-gray-600 mt-1">
                Update enquiry details for {originalEnquiry?.firstName} {originalEnquiry?.lastName}
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && originalEnquiry && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white shadow-sm rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Lead Information Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
                Lead Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {renderSelectField('leadSource', 'Lead Source', LEAD_SOURCE_OPTIONS, true, true)}
                {renderSelectField('leadType', 'Lead Type', LEAD_TYPE_OPTIONS, true, true)}
              </div>
              
              {formData.leadSource === 'referral' && (
                <div className="mt-6">
                  {renderInputField('referredBy', 'Referred By', 'text', false, <User className="w-4 h-4 text-gray-400" />, 'Enter referrer name')}
                </div>
              )}
            </section>

            {/* Customer Details Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
                Customer Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {renderInputField('firstName', 'First Name', 'text', true, <User className="w-4 h-4 text-gray-400" />, 'Enter first name')}
                {renderInputField('lastName', 'Last Name', 'text', true, <User className="w-4 h-4 text-gray-400" />, 'Enter last name')}
                {renderInputField('email', 'Email Address', 'email', false, <User className="w-4 h-4 text-gray-400" />, 'Enter email address')}
                {renderInputField('phone', 'Phone Number', 'tel', true, <Phone className="w-4 h-4 text-gray-400" />, 'Enter phone number')}
                {renderInputField('whatsapp', 'WhatsApp Number', 'tel', false, <Phone className="w-4 h-4 text-gray-400" />, 'Enter WhatsApp number (if different)')}
              </div>
            </section>

            {/* Address Information Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
                Address Information
              </h2>
              <div className="space-y-6">
                {renderTextAreaField('billingAddress', 'Billing Address', 'Enter complete billing address including city, state, and pincode')}
                {renderTextAreaField('shippingAddress', 'Shipping Address', 'Enter shipping address (leave blank if same as billing address)')}
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
                Reset Changes
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/enquiries')}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Update Enquiry'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

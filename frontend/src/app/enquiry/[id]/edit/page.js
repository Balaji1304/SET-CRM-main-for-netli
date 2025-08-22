import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(defaultFormState);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [enquiry, setEnquiry] = useState(null);

  useEffect(() => {
    fetchEnquiry();
  }, [id]);

  const fetchEnquiry = async () => {
    try {
      setLoading(true);
      const response = await getEnquiry(id);
      if (response.success) {
        const enquiryData = response.data;
        setEnquiry(enquiryData);
        
        // Populate form with existing data
        setFormData({
          leadSource: enquiryData.leadSource || '',
          customLeadSource: enquiryData.customLeadSource || '',
          leadType: enquiryData.leadType || '',
          customLeadType: enquiryData.customLeadType || '',
          firstName: enquiryData.firstName || '',
          lastName: enquiryData.lastName || '',
          email: enquiryData.email || '',
          phone: enquiryData.phone || '',
          countryCode: enquiryData.countryCode || '+91',
          whatsapp: enquiryData.whatsapp || '',
          billingAddress: enquiryData.billingAddress || '',
          shippingAddress: enquiryData.shippingAddress || '',
          referredBy: enquiryData.referredBy || '',
          productRequirements: enquiryData.productRequirements || '',
          notes: enquiryData.notes || ''
        });
      } else {
        setSubmissionError(response.message || 'Failed to fetch enquiry details');
      }
    } catch (error) {
      console.error('Error fetching enquiry:', error);
      setSubmissionError('An error occurred while fetching enquiry details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value ?? '' 
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

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
    }
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address.';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmissionError(null);
    
    try {
      const submissionData = { ...formData };
      
      // Remove custom fields if not "other"
      if (submissionData.leadSource !== 'other') {
        delete submissionData.customLeadSource;
      }
      if (submissionData.leadType !== 'other') {
        delete submissionData.customLeadType;
      }
      
      const response = await updateEnquiry(id, submissionData);
      
      if (response.success) {
        setShowSuccessMessage(true);
        setTimeout(() => {
          navigate('/dashboard/enquiries', {
            state: { successMessage: 'Enquiry updated successfully!' }
          });
        }, 1500);
      } else {
        setSubmissionError(response.message || 'Failed to update enquiry');
      }
    } catch (error) {
      console.error('Error updating enquiry:', error);
      setSubmissionError('An error occurred while updating the enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard/enquiries');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-gray-600">Loading enquiry details...</p>
        </div>
      </div>
    );
  }

  if (submissionError && !enquiry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Enquiry</h2>
          <p className="text-gray-600 mb-4">{submissionError}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Enquiries
          </button>
        </div>
      </div>
    );
  }

  // Check if enquiry is already assigned (should not be editable)
  if (enquiry && enquiry.assignmentStatus !== 'pending_assignment') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Cannot Edit Enquiry</h2>
          <p className="text-gray-600 mb-4">
            This enquiry has already been assigned to a salesperson and cannot be edited.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Enquiries
          </button>
        </div>
      </div>
    );
  }

  // Helper functions for consistent UI
  const renderInputField = (name, label, type = 'text', placeholder = '', required = false, icon = null) => (
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
      {/* Header */}
      <div className="border-b border-gray-200 pb-5 mb-8">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={handleBack}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
            aria-label="Back to enquiries"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Edit Enquiry Form
          </h1>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium">Enquiry updated successfully!</span>
          <span className="text-sm">Redirecting to enquiries list...</span>
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
                  renderInputField('customLeadSource', 'Specify Lead Source', 'text', 'Enter lead source', true)
                )}
                {renderSelectField('leadType', 'Lead Type', LEAD_TYPE_OPTIONS, false)}
                {formData.leadType === 'other' && (
                  renderInputField('customLeadType', 'Specify Lead Type', 'text', 'Enter lead type', false)
                )}
              </div>
            </section>

            {/* Personal Information Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInputField('firstName', 'First Name', 'text', 'Enter first name', true, <User className="w-4 h-4 text-gray-400" />)}
                {renderInputField('lastName', 'Last Name', 'text', 'Enter last name (if available)', false, <User className="w-4 h-4 text-gray-400" />)}
                {renderInputField('email', 'Email Address', 'email', 'name@example.com (if available)', false)}
                
                {/* Phone Number with Country Code */}
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
                        className={`block w-full pl-10 pr-3 py-3 bg-white border rounded-none rounded-r-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm ${
                          validationErrors.phone 
                            ? 'border-red-500 ring-red-500' 
                            : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                  {validationErrors.phone && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.phone}</p>
                  )}
                </div>
                
                {renderInputField('whatsapp', 'WhatsApp Number', 'tel', 'Enter WhatsApp number (if different)', false, <Phone className="w-4 h-4 text-gray-400" />)}
              </div>
            </section>

            {/* Address & Reference Section */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-6">
                Address & Reference Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInputField('billingAddress', 'Billing Address', 'text', 'Enter billing address (if available)', false, <MapPin className="w-4 h-4 text-gray-400" />)}
                {renderInputField('shippingAddress', 'Shipping Address', 'text', 'Enter shipping address (if different from billing)', false, <MapPin className="w-4 h-4 text-gray-400" />)}
                {renderInputField('referredBy', 'Referred By', 'text', 'Who referred this lead? (if applicable)', false)}
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
                onClick={handleBack}
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

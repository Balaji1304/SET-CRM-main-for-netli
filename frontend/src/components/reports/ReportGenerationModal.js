import React, { useState } from 'react';
import { X, Calendar, Filter } from 'lucide-react';
import { getDefaultDateRanges, calculatePeriodType } from '../../services/salesReportsService';

const ReportGenerationModal = ({ reportType, onClose, onGenerate }) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    filters: {
      leadSources: [],
      productTypes: [],
      customerTypes: [],
      geographicRegions: []
    }
  });
  const [errors, setErrors] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  const defaultRanges = getDefaultDateRanges();

  const reportTypeConfig = {
    sales_performance: {
      title: 'Sales Performance Report',
      description: 'Comprehensive analysis of sales metrics, KPIs, and performance trends',
      icon: '📊'
    },
    lead_analysis: {
      title: 'Lead Analysis Report',
      description: 'Detailed breakdown of lead sources, conversion rates, and pipeline analysis',
      icon: '🎯'
    }
  };

  const config = reportTypeConfig[reportType] || reportTypeConfig.sales_performance;

  const handleDateRangeSelect = (range) => {
    setFormData(prev => ({
      ...prev,
      startDate: range.startDate,
      endDate: range.endDate
    }));
    setErrors(prev => ({ ...prev, startDate: '', endDate: '' }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleFilterChange = (filterType, values) => {
    setFormData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: values
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      if (startDate >= endDate) {
        newErrors.endDate = 'End date must be after start date';
      }

      // Check if date range is not too large (max 1 year)
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (daysDiff > 365) {
        newErrors.endDate = 'Date range cannot exceed 1 year';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);

    try {
      const reportData = {
        reportType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        filters: formData.filters
      };

      await onGenerate(reportData);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const periodType = formData.startDate && formData.endDate 
    ? calculatePeriodType(formData.startDate, formData.endDate)
    : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">{config.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{config.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Date Range Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="h-4 w-4 inline mr-2" />
              Report Period
            </label>
            
            {/* Quick Date Range Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {Object.entries(defaultRanges).map(([key, range]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDateRangeSelect(range)}
                  className="text-sm px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-left"
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.startDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>

            {periodType && (
              <div className="mt-2 text-sm text-gray-600">
                Period Type: <span className="font-medium capitalize">{periodType}</span>
              </div>
            )}
          </div>

          {/* Filters Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Filter className="h-4 w-4 inline mr-2" />
              Filters (Optional)
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lead Sources Filter */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Lead Sources</label>
                <select
                  multiple
                  value={formData.filters.leadSources}
                  onChange={(e) => handleFilterChange('leadSources', Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size="3"
                >
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="cold_call">Cold Call</option>
                  <option value="social_media">Social Media</option>
                  <option value="events">Events</option>
                  <option value="advertising">Advertising</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>

              {/* Customer Types Filter */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Customer Types</label>
                <select
                  multiple
                  value={formData.filters.customerTypes}
                  onChange={(e) => handleFilterChange('customerTypes', Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size="3"
                >
                  <option value="end_user">End User</option>
                  <option value="dealer">Dealer</option>
                  <option value="builder">Builder</option>
                  <option value="plumber">Plumber</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </div>
          </div>

          {/* Report Preview Info */}
          {formData.startDate && formData.endDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Report Preview</h4>
              <div className="text-sm text-blue-800">
                <p>• Period: {new Date(formData.startDate).toLocaleDateString()} to {new Date(formData.endDate).toLocaleDateString()}</p>
                <p>• Type: {config.title}</p>
                <p>• Filters: {Object.values(formData.filters).flat().length} filters applied</p>
                <p>• Export: Available in PDF and Excel formats</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !formData.startDate || !formData.endDate}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportGenerationModal;

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getEnquiries, getSalespersons, assignEnquiryToSalesperson } from '../../services/enquiryService';
import { Loader2, AlertTriangle, Search, Filter, Eye, UserPlus, ChevronLeft, ChevronRight, ChevronDown, Phone, MapPin, User, X, Calendar, FileText, ArrowLeft, Plus, Info, Edit2, Trash2, Building2, Clock, Users } from 'lucide-react';

// Custom styles for better mobile experience
const customStyles = `
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
  
  @media (max-width: 640px) {
    .touch-target {
      min-height: 48px;
      padding: 12px 16px;
    }
  }
`;

const formatEnumValue = (value) => {
  if (!value) return '';
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatAssignmentStatus = (status) => {
  if (!status) return 'N/A';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getStatusBadgeClass = (status) => {
  const classes = {
    pending_assignment: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    assigned: 'bg-blue-100 text-blue-700 border-blue-300',
    converted_to_lead: 'bg-green-100 text-green-700 border-green-300',
  };
  return classes[status] || 'bg-gray-100 text-gray-700 border-gray-300';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-GB');
  } catch (e) {
    return dateString;
  }
};

// Assignment Modal Component
const AssignEnquiryModal = ({ 
  enquiry, 
  salespersons, 
  onClose, 
  onAssign, 
  error, 
  isAssigning 
}) => {
  const [selectedSalesperson, setSelectedSalesperson] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedSalesperson) return;
    
    onAssign({
      salespersonId: selectedSalesperson
    });
  };

  if (!enquiry) return null;

  return (
    <>
      <style>{customStyles}</style>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Assign Enquiry to Salesperson</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-target"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Enquiry Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 sm:mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Enquiry Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-900">{enquiry.firstName} {enquiry.lastName}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="ml-2 text-gray-900">{enquiry.phone}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-900 break-all">{enquiry.email || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Lead Source:</span>
                  <span className="ml-2 text-gray-900">{formatEnumValue(enquiry.leadSource)}</span>
                  {enquiry.customLeadSource && (
                    <span className="ml-1 text-gray-500">({enquiry.customLeadSource})</span>
                  )}
                </div>
                {enquiry.leadType && (
                  <div>
                    <span className="font-medium text-gray-700">Lead Type:</span>
                    <span className="ml-2 text-gray-900">{formatEnumValue(enquiry.leadType)}</span>
                    {enquiry.customLeadType && (
                      <span className="ml-1 text-gray-500">({enquiry.customLeadType})</span>
                    )}
                  </div>
                )}
                {enquiry.billingAddress && (
                  <div className="sm:col-span-2">
                    <span className="font-medium text-gray-700">Billing Address:</span>
                    <span className="ml-2 text-gray-900">{enquiry.billingAddress}</span>
                  </div>
                )}
                {enquiry.shippingAddress && (
                  <div className="sm:col-span-2">
                    <span className="font-medium text-gray-700">Shipping Address:</span>
                    <span className="ml-2 text-gray-900">{enquiry.shippingAddress}</span>
                  </div>
                )}
                {enquiry.productRequirements && (
                  <div className="sm:col-span-2">
                    <span className="font-medium text-gray-700">Requirements:</span>
                    <span className="ml-2 text-gray-900">{enquiry.productRequirements}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="salesperson" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Salesperson <span className="text-red-500">*</span>
                </label>
                <select
                  id="salesperson"
                  value={selectedSalesperson}
                  onChange={(e) => setSelectedSalesperson(e.target.value)}
                  required
                  className="block w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base touch-target appearance-none"
                >
                  <option value="">Choose a salesperson...</option>
                  {salespersons.map(person => (
                    <option key={person._id || person.id} value={person._id || person.id}>
                      {person.name} ({person.email})
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 sm:p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-target"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !selectedSalesperson}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px] touch-target"
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Assigning...
                    </>
                  ) : (
                    'Assign & Create Lead'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

// Enquiry Details Modal Component
const EnquiryDetailsModal = ({ enquiry, onClose, onEdit, onAssign }) => {
  if (!enquiry) return null;

  const getStatusColor = (status) => {
    const colors = {
      'pending_assignment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'assigned': 'bg-blue-100 text-blue-800 border-blue-200',
      'converted_to_lead': 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <>
      <style>{customStyles}</style>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-[#FF7300] to-[#FF8800] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Enquiry Details</h2>
                <p className="text-orange-100 text-sm">Complete enquiry information and status</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-150 touch-target"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Enquiry Name and Status */}
              <div className="border-b border-gray-100 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {`${enquiry.firstName} ${enquiry.lastName}`}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-4 text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm font-medium">Lead Source: {formatEnumValue(enquiry.leadSource)}</span>
                        {enquiry.customLeadSource && (
                          <span className="text-xs text-gray-500">({enquiry.customLeadSource})</span>
                        )}
                      </div>
                      {enquiry.leadType && (
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm">Lead Type: {formatEnumValue(enquiry.leadType)}</span>
                          {enquiry.customLeadType && (
                            <span className="text-xs text-gray-500">({enquiry.customLeadType})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(enquiry.assignmentStatus)}`}>
                      {formatAssignmentStatus(enquiry.assignmentStatus)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Status Card */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-blue-500 p-2 rounded-lg">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Status</h4>
                      <p className="text-sm text-gray-600">Current state</p>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatAssignmentStatus(enquiry.assignmentStatus)}
                  </div>
                </div>

                {/* Lead Source Card */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-green-500 p-2 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Lead Source</h4>
                      <p className="text-sm text-gray-600">Origin channel</p>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatEnumValue(enquiry.leadSource)}
                  </div>
                  {enquiry.customLeadSource && (
                    <div className="text-sm text-gray-600 mt-1">
                      {enquiry.customLeadSource}
                    </div>
                  )}
                </div>

                {/* Date Created */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-purple-500 p-2 rounded-lg">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Date Created</h4>
                      <p className="text-sm text-gray-600">Enquiry received</p>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatDate(enquiry.createdAt)}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Phone className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Contact Information</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Phone</span>
                      <span className="text-sm text-gray-900">{enquiry.countryCode} {enquiry.phone}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Email</span>
                      <span className="text-sm text-gray-900">{enquiry.email || 'N/A'}</span>
                    </div>
                    {enquiry.whatsapp && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <span className="text-sm font-medium text-gray-600">WhatsApp</span>
                        <span className="text-sm text-gray-900">{enquiry.whatsapp}</span>
                      </div>
                    )}
                    {enquiry.referredBy && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-600">Referred By</span>
                        <span className="text-sm text-gray-900">{enquiry.referredBy}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lead Information */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Info className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Lead Information</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Lead Source</span>
                      <span className="text-sm text-gray-900">{formatEnumValue(enquiry.leadSource)}</span>
                    </div>
                    {enquiry.customLeadSource && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <span className="text-sm font-medium text-gray-600">Custom Source</span>
                        <span className="text-sm text-gray-900">{enquiry.customLeadSource}</span>
                      </div>
                    )}
                    {enquiry.leadType && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <span className="text-sm font-medium text-gray-600">Lead Type</span>
                        <span className="text-sm text-gray-900">{formatEnumValue(enquiry.leadType)}</span>
                      </div>
                    )}
                    {enquiry.customLeadType && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <span className="text-sm font-medium text-gray-600">Custom Type</span>
                        <span className="text-sm text-gray-900">{enquiry.customLeadType}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-600">Status</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${getStatusColor(enquiry.assignmentStatus)}`}>
                        {formatAssignmentStatus(enquiry.assignmentStatus)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              {(enquiry.billingAddress || enquiry.shippingAddress) && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Address Information</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {enquiry.billingAddress && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 block mb-1">Billing Address</span>
                        <p className="text-sm text-gray-900">{enquiry.billingAddress}</p>
                      </div>
                    )}
                    {enquiry.shippingAddress && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 block mb-1">Shipping Address</span>
                        <p className="text-sm text-gray-900">{enquiry.shippingAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              {(enquiry.productRequirements || enquiry.notes) && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Additional Information</h4>
                  </div>
                  <div className="space-y-3">
                    {enquiry.productRequirements && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 block mb-1">Product Requirements</span>
                        <p className="text-sm text-gray-900">{enquiry.productRequirements}</p>
                      </div>
                    )}
                    {enquiry.notes && (
                      <div>
                        <span className="text-sm font-medium text-gray-600 block mb-1">Notes</span>
                        <p className="text-sm text-gray-900">{enquiry.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assigned To Section */}
              {enquiry.assignedTo && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Users className="w-5 h-5 text-gray-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Assignment Information</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                      <span className="text-sm font-medium text-gray-600">Assigned To</span>
                      <span className="text-sm text-gray-900">{enquiry.assignedTo.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-medium text-gray-600">Email</span>
                      <span className="text-sm text-gray-900">{enquiry.assignedTo.email}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  {enquiry.assignmentStatus === 'pending_assignment' && (
                    <>
                      <button
                        onClick={() => {
                          onClose();
                          onEdit(enquiry);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-150 touch-target"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Enquiry
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          onAssign(enquiry);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF7300] text-white rounded-lg font-medium hover:bg-[#FF8800] transition-colors duration-150 touch-target"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign to Salesperson
                      </button>
                    </>
                  )}
                  {enquiry.assignmentStatus !== 'pending_assignment' && (
                    <div className="text-sm text-gray-500 text-center py-2">
                      This enquiry has been {enquiry.assignmentStatus === 'assigned' ? 'assigned to a salesperson' : 'converted to a lead'} and cannot be modified.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Mobile Card Component for Enquiries
const EnquiryCard = ({ enquiry, onAssign, onView }) => (
  <div className="rounded-lg border p-4 space-y-4 shadow-sm hover:shadow-md transition-all duration-200 bg-white border-gray-200">
    {/* Header */}
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold cursor-pointer hover:text-[#FF7300] transition-colors duration-150 text-gray-900"
              onClick={() => onView(enquiry)}
              title="Click to view details">
            {`${enquiry.firstName} ${enquiry.lastName}`}
          </h3>
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Phone className="w-4 h-4" />
            <span>{enquiry.phone}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-3">
        <button
          onClick={() => onView(enquiry)}
          className="p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-colors duration-150 touch-target"
          title="View Details"
        >
          <Info className="w-4 h-4" />
        </button>
        {enquiry.assignmentStatus === 'pending_assignment' && (
          <button
            onClick={() => window.location.href = `/dashboard/enquiry/${enquiry._id}/edit`}
            className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 transition-colors duration-150 touch-target"
            title="Edit Enquiry"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {enquiry.assignmentStatus === 'pending_assignment' && (
          <button
            onClick={() => onAssign(enquiry)}
            className="p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors duration-150 touch-target"
            title="Assign to Salesperson"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>

    {/* Contact Info */}
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Phone className="w-4 h-4" />
        <span className="truncate">{enquiry.phone}</span>
      </div>
      {(enquiry.billingAddress || enquiry.shippingAddress) && (
        <div className="space-y-1">
          {enquiry.billingAddress && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Building2 className="w-4 h-4" />
              <span className="truncate">{enquiry.billingAddress}</span>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Status and Assignment */}
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(enquiry.assignmentStatus)}`}>
          {formatAssignmentStatus(enquiry.assignmentStatus)}
        </span>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Assigned To</p>
        {enquiry.assignedTo ? (
          <div>
            <p className="text-sm text-blue-600 font-medium truncate" title={enquiry.assignedTo.name}>
              {enquiry.assignedTo.name}
            </p>
            <p className="text-xs text-gray-500 truncate" title={enquiry.assignedTo.email}>
              {enquiry.assignedTo.email}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Not assigned</p>
        )}
      </div>
    </div>

    {/* Lead Source and Lead Type */}
    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Lead Source</p>
        <p className="text-sm text-gray-900">
          {formatEnumValue(enquiry.leadSource)}
          {enquiry.customLeadSource && (
            <span className="text-xs text-gray-500 block">({enquiry.customLeadSource})</span>
          )}
        </p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Lead Type</p>
        <p className="text-sm text-gray-900">{formatEnumValue(enquiry.leadType)}</p>
      </div>
    </div>

    {/* Product Requirements */}
    {enquiry.productRequirements && (
      <div className="pt-3 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Requirements</p>
        <p className="text-sm text-gray-900" title={enquiry.productRequirements}>
          {enquiry.productRequirements}
        </p>
      </div>
    )}

    {/* Date */}
    <div className="pt-2 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created</p>
      <div className="flex items-center space-x-1 text-sm text-gray-600">
        <Calendar className="w-4 h-4" />
        <span>{formatDate(enquiry.createdAt)}</span>
      </div>
    </div>
  </div>
);

export default function LeadAssignmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [salespersons, setSalespersons] = useState([]);
  const [loadingSalespersons, setLoadingSalespersons] = useState(true);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEnquiryForAssignment, setSelectedEnquiryForAssignment] = useState(null);
  const [assignError, setAssignError] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [selectedEnquiryForView, setSelectedEnquiryForView] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Success message state
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getEnquiries();
      if (response.success) {
        setEnquiries(response.data || []);
      } else {
        setError(response.message || 'Failed to fetch enquiries.');
      }
    } catch (err) {
      console.error('Error fetching enquiries:', err);
      setError(err.message || 'An error occurred while fetching enquiries.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSalespersons = useCallback(async () => {
    try {
      setLoadingSalespersons(true);
      const response = await getSalespersons();
      if (response.success) {
        setSalespersons(response.data || []);
      } else {
        console.error(response.message || 'Failed to fetch salespersons.');
      }
    } catch (err) {
      console.error('Error fetching salespersons:', err);
    } finally {
      setLoadingSalespersons(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiries();
    fetchSalespersons();
  }, [fetchEnquiries, fetchSalespersons]);

  // Handle location state changes (e.g., returning from create enquiry with success message)
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      // Clear the location state to prevent re-showing message on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleOpenAssignModal = (enquiry) => {
    setSelectedEnquiryForAssignment(enquiry);
    setAssignError('');
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedEnquiryForAssignment(null);
    setAssignError('');
  };

  const handleAssignEnquiry = async (assignmentData) => {
    if (!selectedEnquiryForAssignment || !selectedEnquiryForAssignment._id) {
      setAssignError('No enquiry selected for assignment.');
      return;
    }
    try {
      setIsAssigning(true);
      setAssignError('');
      const response = await assignEnquiryToSalesperson(selectedEnquiryForAssignment._id, assignmentData);
      if (response.success) {
        setShowAssignModal(false);
        setSelectedEnquiryForAssignment(null);
        await fetchEnquiries(); // Refresh the list
        setSuccessMessage('Enquiry assigned successfully and lead created!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        setAssignError(response.message || 'Failed to assign enquiry.');
      }
    } catch (err) {
      console.error('Error assigning enquiry:', err);
      setAssignError(err.message || 'An error occurred during assignment.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Function to handle viewing enquiry details
  const handleViewEnquiry = (enquiry) => {
    setSelectedEnquiryForView(enquiry);
    setShowEnquiryModal(true);
  };

  // Function to close enquiry modal
  const closeEnquiryModal = () => {
    setShowEnquiryModal(false);
    setSelectedEnquiryForView(null);
  };

  // Function to handle edit enquiry from modal
  const handleEditFromModal = (enquiry) => {
    navigate(`/dashboard/enquiry/${enquiry._id}/edit`);
  };

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(enquiry => {
      const searchString = [
        enquiry.firstName,
        enquiry.lastName,
        enquiry.phone,
        formatEnumValue(enquiry.leadSource),
        enquiry.createdBy?.name,
        enquiry.assignedTo?.name
      ].join(' ').toLowerCase();
      
      const matchesSearch = searchTerm === '' || searchString.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === '' || enquiry.assignmentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enquiries, searchTerm, statusFilter]);
  
  const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage);
  const currentEnquiries = filteredEnquiries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const assignmentStatuses = [
    { value: 'pending_assignment', label: 'Pending Assignment' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'converted_to_lead', label: 'Converted to Lead' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-gray-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-gray-700">Loading enquiries...</p>
      </div>
    );
  }

  if (error && enquiries.length === 0) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[calc(100vh-150px)] p-6 bg-gray-50 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-600 mb-2">Error Fetching Enquiries</p>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchEnquiries}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity touch-target"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <style>{customStyles}</style>
      {/* Header Section - Page Title */}
      <div className="border-b border-gray-200 pb-5 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-md hover:bg-gray-100 text-gray-600 sm:hidden touch-target"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Enquiries</h1>
          </div>
        </div>
      </div>

      {/* Main Content Area - Contains filters and table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Filter and Action Bar */}
        <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-20">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search Input - takes remaining space on left */}
            <div className="relative flex-grow md:flex-grow-0 w-full md:w-auto md:max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search enquiries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 ease-in-out text-sm text-gray-900 placeholder-gray-400"
              />
            </div>
            
            {/* Filters and Add Button - grouped on right */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-4 pr-10 py-2 w-full border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-sm text-gray-900 bg-white"
                >
                  <option value="">All Statuses</option>
                  {assignmentStatuses.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>

              <button
                onClick={() => navigate('/dashboard/enquiries/create')}
                className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Enquiry
              </button>
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && enquiries.length > 0 && (
          <div className="p-4 md:p-6 bg-red-50 border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5"/>
              <div className="text-red-700">
                <strong className="font-bold">An error occurred: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Content Area */}
        {currentEnquiries.length === 0 ? (
          <div className="flex flex-col flex-1 items-center justify-center min-h-[300px] p-6 text-center">
            <Filter className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-xl font-medium text-gray-900 mb-2">No Enquiries Found</p>
            <p className="text-sm text-gray-500">
              {searchTerm || statusFilter
                ? "No enquiries match your current filters."
                : "There are no enquiries to display."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop/Tablet Table View */}
            <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
              <div className="overflow-x-auto flex-1 relative">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {[
                          { key: 'name', label: 'Full Name', width: 'w-32 lg:w-40' },
                          { key: 'phone', label: 'Phone', width: 'w-24 lg:w-32' },
                          { key: 'assignedTo', label: 'Assigned To', width: 'w-32 lg:w-40', hideOn2Xl: true },
                          { key: 'address', label: 'Address', width: 'w-36', hideOnXl: true },
                          { key: 'leadSource', label: 'Lead Source', width: 'w-24 lg:w-32', hideOnXl: true },
                          { key: 'status', label: 'Status', width: 'w-20 lg:w-24' },
                          { key: 'leadType', label: 'Lead Type', width: 'w-24 lg:w-32' },
                          { key: 'date', label: 'Date', width: 'w-28', hideOn2Xl: true },
                              { key: 'actions', label: 'Actions', width: 'w-24 lg:w-32' }
                            ].map((header) => (
                              <th
                                key={header.key}
                                scope="col"
                                className={`px-2 lg:px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${header.width} 
                                  ${header.hideOnLg ? 'hidden lg:table-cell' : ''} 
                                  ${header.hideOnXl ? 'hidden xl:table-cell' : ''} 
                                  ${header.hideOn2Xl ? 'hidden 2xl:table-cell' : ''}`}
                              >
                                {header.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentEnquiries.length === 0 && !loading ? (
                            <tr>
                              <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                No enquiries found matching your criteria.
                              </td>
                            </tr>
                          ) : (
                            currentEnquiries.map((enquiry) => (
                              <tr
                                key={enquiry._id}
                                className="transition-colors duration-150 ease-in-out hover:bg-gray-50"
                              >
                                <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm font-medium w-32 lg:w-40">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      onClick={() => handleViewEnquiry(enquiry)}
                                      className="truncate cursor-pointer hover:text-[#FF7300] transition-colors duration-150 text-gray-900"
                                      title="Click to view details"
                                    >
                                      {`${enquiry.firstName} ${enquiry.lastName}`}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                                  <div className="truncate">{enquiry.phone}</div>
                                </td>
                                <td className="hidden 2xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-32 lg:w-40">
                                  <div className="truncate">
                                    {enquiry.assignedTo ? (
                                      <span className="text-blue-600 font-medium">{enquiry.assignedTo.name}</span>
                                    ) : (
                                      <span className="text-gray-400 italic">Not assigned</span>
                                    )}
                                  </div>
                                </td>
                                <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-36">
                                  <div className="truncate">{enquiry.billingAddress || enquiry.shippingAddress || 'N/A'}</div>
                                </td>
                                <td className="hidden xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                                  <div className="truncate">
                                    {formatEnumValue(enquiry.leadSource)}
                                    {enquiry.customLeadSource && (
                                      <div className="text-xs text-gray-500">({enquiry.customLeadSource})</div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2 lg:px-4 xl:px-6 py-4 w-20 lg:w-24">
                                  <span className={`inline-flex items-center px-1.5 lg:px-2 py-1 rounded-full text-xs font-medium truncate ${getStatusBadgeClass(enquiry.assignmentStatus)}`}>
                                    {formatAssignmentStatus(enquiry.assignmentStatus)}
                                  </span>
                                </td>
                                <td className="px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-24 lg:w-32">
                                  <div className="truncate">
                                    {formatEnumValue(enquiry.leadType)}
                                    {enquiry.customLeadType && (
                                      <div className="text-xs text-gray-500">({enquiry.customLeadType})</div>
                                    )}
                                  </div>
                                </td>
                                <td className="hidden 2xl:table-cell px-2 lg:px-4 xl:px-6 py-4 text-sm text-gray-600 w-28">
                                  <div className="truncate">
                                    {formatDate(enquiry.createdAt)}
                                  </div>
                                </td>
                                <td className="px-2 lg:px-4 xl:px-6 py-4 w-24 lg:w-32">
                                  <div className="flex items-center justify-center space-x-1 lg:space-x-2">
                                    <button
                                      onClick={() => handleViewEnquiry(enquiry)}
                                      className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-[#FF7300] hover:bg-orange-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-orange-200"
                                      title="View Details"
                                    >
                                      <Info className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                    </button>
                                    {enquiry.assignmentStatus === 'pending_assignment' && (
                                      <button
                                        onClick={() => navigate(`/dashboard/enquiry/${enquiry._id}/edit`)}
                                        className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-blue-200"
                                        title="Edit Enquiry"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                      </button>
                                    )}
                                    {enquiry.assignmentStatus === 'pending_assignment' && (
                                      <button
                                        onClick={() => handleOpenAssignModal(enquiry)}
                                        className="group flex items-center justify-center p-1.5 lg:p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 ease-in-out transform hover:scale-105 touch-target shadow-sm hover:shadow-md border border-transparent hover:border-green-200"
                                        title="Assign to Salesperson"
                                      >
                                        <UserPlus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden flex-1 overflow-y-auto">
                  <div className="p-4 space-y-4">
                    {currentEnquiries.length === 0 && !loading ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">No enquiries found matching your criteria.</p>
                      </div>
                    ) : (
                      currentEnquiries.map((enquiry) => (
                        <EnquiryCard
                          key={enquiry._id}
                          enquiry={enquiry}
                          onAssign={handleOpenAssignModal}
                          onView={handleViewEnquiry}
                        />
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="px-2 lg:px-4 xl:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-3 sm:space-y-0">
              <div className="text-sm text-gray-600 order-2 sm:order-1">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredEnquiries.length)} to {Math.min(currentPage * itemsPerPage, filteredEnquiries.length)} of {filteredEnquiries.length} results
              </div>
              <div className="flex items-center space-x-2 order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 px-2"> 
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
      </div>

      {showAssignModal && selectedEnquiryForAssignment && (
        <AssignEnquiryModal
          enquiry={selectedEnquiryForAssignment}
          salespersons={salespersons}
          onClose={handleCloseAssignModal}
          onAssign={handleAssignEnquiry}
          error={assignError}
          isAssigning={isAssigning}
        />
      )}

      {/* Enquiry Details Modal */}
      {showEnquiryModal && selectedEnquiryForView && (
        <EnquiryDetailsModal 
          enquiry={selectedEnquiryForView} 
          onClose={closeEnquiryModal}
          onEdit={handleEditFromModal}
          onAssign={handleOpenAssignModal}
        />
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-5 right-5 bg-primary text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ease-in-out z-50">
          {successMessage}
        </div>
      )}
    </div>
  );
} 
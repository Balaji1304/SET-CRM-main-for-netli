"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPurchaseOrderDetails } from '../../../services/purchaseOrderService';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Package,
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  FileText,
  Clock,
  Check,
  AlertCircle,
  ChevronRight,
  Users
} from 'lucide-react';

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
    
    /* Responsive text handling */
    .mobile-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    
    /* Better spacing for mobile cards */
    .mobile-card-compact {
      padding: 12px;
      margin-bottom: 8px;
    }
    
    /* Force card width constraints */
    .mobile-card-container {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden;
    }
  }
  
  @media (max-width: 375px) {
    /* Extra small screens like iPhone SE */
    .mobile-card-compact {
      padding: 8px;
    }
    
    .mobile-header-text {
      font-size: 14px !important;
      line-height: 1.3 !important;
    }
  }

  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString();
};

// Helper function to format status values for display
const formatDisplayValue = (value) => {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Status badge component
const StatusBadge = ({ status }) => {
  let colorClasses = 'bg-gray-100 text-gray-800';
  
  if (status === 'pending_assignment') {
    colorClasses = 'bg-yellow-100 text-yellow-800';
  } else if (status === 'ready_to_dispatch') {
    colorClasses = 'bg-blue-100 text-blue-800';
  } else if (status === 'installation_date_allocated') {
    colorClasses = 'bg-orange-100 text-orange-800';
  } else if (status === 'assigned') {
    colorClasses = 'bg-green-100 text-green-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses}`}>
      {formatDisplayValue(status)}
    </span>
  );
};

// Section header component
const SectionHeader = ({ title, icon: Icon }) => (
  <div className="flex items-center mb-3 sm:mb-4">
    <div className="bg-orange-100 p-1.5 sm:p-2 rounded-md">
      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
    </div>
    <h3 className="ml-2 sm:ml-3 text-base sm:text-lg font-semibold text-gray-900 mobile-header-text">{title}</h3>
  </div>
);

// Detail card component
const DetailCard = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-300 mobile-card-container ${className}`}>
    <div className="border-b border-gray-300 bg-gray-50 px-3 sm:px-4 py-2 sm:py-3">
      <h3 className="text-sm sm:text-base font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="p-3 sm:p-4 mobile-card-compact">
      {children}
    </div>
  </div>
);

// Data row component
const DataRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center py-1.5 sm:py-2">
    {Icon && <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 mr-1.5 sm:mr-2 flex-shrink-0" />}
    <span className="text-xs sm:text-sm text-gray-600 font-medium w-32 sm:w-40 flex-shrink-0">{label}:</span>
    <span className="text-xs sm:text-sm text-gray-900 mobile-truncate">{value || 'N/A'}</span>
  </div>
);

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPurchaseOrderDetails = async () => {
      try {
        setLoading(true);
        if (!params.id) {
          throw new Error('Purchase order ID is required');
        }
        
        const data = await getPurchaseOrderDetails(params.id);
        setPurchaseOrder(data);
      } catch (error) {
        console.error('Failed to fetch purchase order details:', error);
        setError(error.response?.data?.message || 'Failed to fetch purchase order details');
        toast.error(error.response?.data?.message || 'Failed to fetch purchase order details');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrderDetails();
  }, [params.id]);

  const goBack = () => {
    navigate('/dashboard/purchase-orders');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <>
        <style>{customStyles}</style>
        <div className="container px-3 sm:px-4 mx-auto py-6 sm:py-8">
          <button 
            onClick={goBack}
            className="flex items-center mb-4 sm:mb-6 text-gray-600 hover:text-gray-900 transition-colors touch-target"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="text-sm sm:text-base">Back to Purchase Orders</span>
          </button>
          
          <div className="flex flex-col items-center justify-center h-[50vh] text-center p-4 sm:p-5">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Something went wrong</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 line-clamp-2">{error || 'Failed to load purchase order details'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 shadow-md transition-all duration-150 touch-target"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  const purchase = purchaseOrder.purchase;
  const customer = purchase.customerId;
  const quotation = purchase.quotationId;
  const quotationItems = purchaseOrder.quotationItems || [];
  const payments = purchaseOrder.payments || [];

  return (
    <>
      <style>{customStyles}</style>
      <div className="min-h-screen bg-gray-50">
        <div className="container px-3 sm:px-4 mx-auto py-6 sm:py-8">
          {/* Back button and header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 sm:mb-6">
            <div>
              <button 
                onClick={goBack}
                className="flex items-center mb-3 sm:mb-4 text-gray-600 hover:text-gray-900 transition-colors touch-target"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="text-sm sm:text-base">Back to Purchase Orders</span>
              </button>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mobile-header-text">
                Purchase Order: {purchase.purchaseID}
              </h1>
            </div>
            <StatusBadge status={purchase.serviceTaskStatus} />
          </div>
          
          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left column - Customer details */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              <DetailCard title="Customer Information">
                <div className="space-y-2 sm:space-y-3">
                  <DataRow 
                    label="Name" 
                    value={customer ? `${customer.firstName} ${customer.lastName}` : 'N/A'} 
                    icon={User}
                  />
                  <DataRow 
                    label="Email" 
                    value={customer?.email} 
                    icon={Mail}
                  />
                  <DataRow 
                    label="Phone" 
                    value={customer?.phone} 
                    icon={Phone}
                  />
                  {customer?.businessName && (
                    <DataRow 
                      label="Business" 
                      value={customer.businessName} 
                      icon={Building}
                    />
                  )}
                  {customer?.address && (
                    <DataRow 
                      label="Address" 
                      value={customer.address} 
                      icon={MapPin}
                    />
                  )}
                </div>
              </DetailCard>
              
              <DetailCard title="Installation Details">
                <div className="space-y-2 sm:space-y-3">
                  <DataRow 
                    label="Installation Date" 
                    value={formatDate(purchase.installationDate)} 
                    icon={Calendar}
                  />
                  <DataRow 
                    label="Service Engineer" 
                    value={purchase.assignedEngineerId ? purchase.assignedEngineerId.name : 'Not assigned'} 
                    icon={Users}
                  />
                  {purchase.serviceAssignmentNotes && (
                    <div className="mt-3 sm:mt-4">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Assignment Notes</h4>
                      <p className="text-xs sm:text-sm text-gray-600 bg-gray-50 p-2 rounded border mobile-truncate">{purchase.serviceAssignmentNotes}</p>
                    </div>
                  )}
                </div>
              </DetailCard>
            </div>
            
            {/* Middle column - Purchase details */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              <DetailCard title="Purchase Details">
                <div className="space-y-2 sm:space-y-3">
                  <DataRow 
                    label="Purchase ID" 
                    value={purchase.purchaseID} 
                    icon={Package}
                  />
                  <DataRow 
                    label="Status" 
                    value={formatDisplayValue(purchase.status)} 
                    icon={Check}
                  />
                  <DataRow 
                    label="Purchase Date" 
                    value={formatDate(purchase.purchaseDate)} 
                    icon={Calendar}
                  />
                  <DataRow 
                    label="Payment Method" 
                    value={formatDisplayValue(purchase.paymentMethod)} 
                    icon={() => <span className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 mr-2 inline-flex items-center justify-center font-medium">₹</span>}
                  />
                  <DataRow 
                    label="Created By" 
                    value={quotation?.createdBy?.name || 'N/A'} 
                    icon={User}
                  />
                </div>
                
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                  <h4 className="text-xs sm:text-sm font-semibold mb-2">Payment Summary</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs sm:text-sm font-semibold">
                      <span>Total:</span>
                      <span>₹{purchase.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm text-green-600">
                      <span>Advance Paid:</span>
                      <span>₹{purchase.advancePaid?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm font-bold pt-1 border-t border-gray-100 mt-1">
                      <span>Remaining:</span>
                      <span>₹{purchase.remainingAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${purchase.isFullyPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {purchase.isFullyPaid ? 'Fully Paid' : 'Payment Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </DetailCard>
              
              <DetailCard title="Related Documents">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 mr-2" />
                      <span className="text-xs sm:text-sm text-gray-700 mobile-truncate">Quotation #{quotation?.quotationNumber}</span>
                    </div>
                    <button className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm flex items-center touch-target" onClick={() => navigate(`/dashboard/quotations/${quotation?._id}`)}>
                      <span className="hidden sm:inline">View</span>
                      <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
                    </button>
                  </div>
                  {/* Add more related documents here if needed */}
                </div>
              </DetailCard>
            </div>
            
            {/* Right column - Products and Payments */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              <DetailCard title="Products">
                <div className="space-y-3">
                  {quotationItems.length > 0 ? (
                    quotationItems.map((item) => (
                      <div key={item._id} className="flex flex-col p-2 sm:p-3 border rounded-md mobile-card-compact">
                        <div className="flex items-center">
                          {item.productId?.imageUrls?.[0] ? (
                            <img 
                              src={item.productId.imageUrls[0]} 
                              alt={item.productId.name} 
                              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-md mr-2 sm:mr-3 flex-shrink-0" 
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-md flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                              <Package className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-medium mobile-truncate">{item.productId?.name}</h4>
                            <p className="text-xs text-gray-500 mobile-truncate">Model: {item.productId?.modelNumber}</p>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm mt-2 pt-2 border-t border-gray-100">
                          <span className="text-gray-600">Qty: {item.quantity}</span>
                          <span className="font-medium">₹{item.totalPrice?.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-500">No products found.</p>
                  )}
                </div>
              </DetailCard>
              
              <DetailCard title="Payment History">
                {payments.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {payments.map((payment) => (
                      <div key={payment._id} className="py-2 sm:py-3">
                        <div className="flex justify-between">
                          <span className="text-xs sm:text-sm font-medium">₹{payment.amountPaid.toFixed(2)}</span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            {formatDate(payment.paidAt || payment.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500 capitalize mobile-truncate">{payment.paymentMethod.replace('_', ' ')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${payment.isAdvancePayment ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {payment.isAdvancePayment ? 'Advance' : 'Payment'}
                          </span>
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic mobile-truncate">Note: {payment.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500">No payment records found.</p>
                )}
              </DetailCard>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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
  <div className="flex items-center mb-4">
    <div className="bg-orange-100 p-2 rounded-md">
      <Icon className="h-5 w-5 text-orange-600" />
    </div>
    <h3 className="ml-3 text-lg font-semibold text-gray-900">{title}</h3>
  </div>
);

// Detail card component
const DetailCard = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-300 ${className}`}>
    <div className="border-b border-gray-300 bg-gray-50 px-4 py-3">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="p-4">
      {children}
    </div>
  </div>
);

// Data row component
const DataRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center py-2">
    {Icon && <Icon className="h-4 w-4 text-gray-500 mr-2" />}
    <span className="text-sm text-gray-600 font-medium w-40">{label}:</span>
    <span className="text-sm text-gray-900">{value || 'N/A'}</span>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <div className="container px-4 mx-auto py-8">
        <button 
          onClick={goBack}
          className="flex items-center mb-6 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Back to Purchase Orders</span>
        </button>
        
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-5">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-4">{error || 'Failed to load purchase order details'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-semibold hover:bg-orange-700 shadow-md transition-all duration-150"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const purchase = purchaseOrder.purchase;
  const customer = purchase.customerId;
  const quotation = purchase.quotationId;
  const quotationItems = purchaseOrder.quotationItems || [];
  const payments = purchaseOrder.payments || [];

  return (
    <div className="container px-4 mx-auto py-8">
      {/* Back button and header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div>
          <button 
            onClick={goBack}
            className="flex items-center mb-4 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>Back to Purchase Orders</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Purchase Order: {purchase.purchaseID}
          </h1>
        </div>
        <StatusBadge status={purchase.serviceTaskStatus} />
      </div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Customer details */}
        <div className="lg:col-span-1 space-y-6">
          <DetailCard title="Customer Information">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Assignment Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">{purchase.serviceAssignmentNotes}</p>
                </div>
              )}
            </div>
          </DetailCard>
        </div>
        
        {/* Middle column - Purchase details */}
        <div className="lg:col-span-1 space-y-6">
          <DetailCard title="Purchase Details">
            <div className="space-y-2">
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
                icon={() => <span className="h-4 w-4 text-gray-500 mr-2 inline-flex items-center justify-center font-medium">₹</span>}
              />
              <DataRow 
                label="Created By" 
                value={quotation?.createdBy?.name || 'N/A'} 
                icon={User}
              />
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold mb-2">Payment Summary</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{purchase.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({purchase.taxPercentage}%):</span>
                  <span className="font-medium">₹{purchase.taxAmount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-1 border-t border-gray-100 mt-1">
                  <span>Total:</span>
                  <span>₹{purchase.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Advance Paid:</span>
                  <span>₹{purchase.advancePaid?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-100 mt-1">
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
                  <FileText className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700">Quotation #{quotation?.quotationNumber}</span>
                </div>
                <button className="text-blue-500 hover:text-blue-700 text-sm flex items-center" onClick={() => navigate(`/dashboard/quotations/${quotation?._id}`)}>
                  View <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
              {/* Add more related documents here if needed */}
            </div>
          </DetailCard>
        </div>
        
        {/* Right column - Products and Payments */}
        <div className="lg:col-span-1 space-y-6">
          <DetailCard title="Products">
            <div className="space-y-3">
              {quotationItems.length > 0 ? (
                quotationItems.map((item) => (
                  <div key={item._id} className="flex flex-col p-2 border rounded-md">
                    <div className="flex items-center">
                      {item.productId?.imageUrls?.[0] ? (
                        <img 
                          src={item.productId.imageUrls[0]} 
                          alt={item.productId.name} 
                          className="w-12 h-12 object-cover rounded-md mr-3" 
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center mr-3">
                          <Package className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-medium">{item.productId?.name}</h4>
                        <p className="text-xs text-gray-500">Model: {item.productId?.modelNumber}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-100">
                      <span className="text-gray-600">Quantity: {item.quantity}</span>
                      <span className="font-medium">₹{item.totalPrice?.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No products found.</p>
              )}
            </div>
          </DetailCard>
          
          <DetailCard title="Payment History">
            {payments.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <div key={payment._id} className="py-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">₹{payment.amountPaid.toFixed(2)}</span>
                      <span className="text-sm text-gray-500">
                        {formatDate(payment.paidAt || payment.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500 capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${payment.isAdvancePayment ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {payment.isAdvancePayment ? 'Advance' : 'Payment'}
                      </span>
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-gray-500 mt-1 italic">Note: {payment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No payment records found.</p>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  );
}

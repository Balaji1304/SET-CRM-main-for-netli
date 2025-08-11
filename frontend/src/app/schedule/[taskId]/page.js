'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Changed from next/navigation
import { getTaskDetails, getServiceEngineers, assignTask } from '../../../services/taskService'; // Adjust path as needed, Added getServiceEngineers, assignTask
import { ArrowLeft, User, Package, CalendarDays, FileText, DollarSign, Briefcase, Users, MessageSquare, Edit3 as AssignIcon } from 'lucide-react'; // Changed Edit to AssignIcon
import AssignTaskModal from '../../../components/dashboard/AssignTaskModal'; // Corrected path

// Helper to format date strings
const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return 'N/A';
  try {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString('en-IN', options);
  } catch (e) {
    return dateString;
  }
};

// Helper to format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'N/A';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

// Helper to format address (can handle string or object)
const formatAddress = (addressObjOrString) => {
  if (!addressObjOrString) return 'N/A';
  if (typeof addressObjOrString === 'string') {
    return addressObjOrString.trim() || 'N/A';
  }
  if (typeof addressObjOrString === 'object') {
    const parts = [
      addressObjOrString.street,
      addressObjOrString.line1, // Common alternative for street
      addressObjOrString.line2,
      addressObjOrString.city,
      addressObjOrString.state,
      addressObjOrString.postalCode || addressObjOrString.zipCode,
      addressObjOrString.country,
    ].filter(part => part && typeof part === 'string' && part.trim() !== ''); // Filter out invalid parts

    if (parts.length > 0) {
      return parts.join(', ');
    }
    return 'No address details provided'; // If object has no recognized fields or all are empty
  }
  return 'Invalid address format'; // Fallback for other types
};

// Helper to format status
const formatStatus = (status) => {
  if (!status) return 'N/A';
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getStatusBadgeClasses = (status) => {
  switch (status) {
    case 'pending_assignment':
      return 'bg-yellow-100 text-yellow-800';
    case 'assigned':
      return 'bg-blue-100 text-blue-800';
    case 'scheduled':
      return 'bg-sky-100 text-sky-800'; // Using sky for scheduled
    case 'in_progress':
      return 'bg-indigo-100 text-indigo-800'; // Using indigo for in_progress
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'on_hold':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const DetailCard = ({ title, icon, children }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg">
    <div className="flex items-center text-orange-600 mb-4">
      {icon}
      <h3 className="ml-3 text-xl font-semibold text-gray-700">{title}</h3>
    </div>
    <div className="space-y-3 text-base text-gray-600">{children}</div>
  </div>
);

const DetailItem = ({ label, value, isBadge = false, statusValue, valueClassName }) => (
  <div className="flex justify-between items-center py-2">
    <span className="font-medium text-gray-500 text-md">{label}:</span>
    {isBadge ? (
      <span
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClasses(statusValue)}`}
      >
        {value}
      </span>
    ) : (
      <span className={`text-gray-800 text-right text-md ${valueClassName || ''}`}>{value || 'N/A'}</span>
    )}
  </div>
);

export default function TaskDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const taskId = params?.taskId;

  const [taskDetails, setTaskDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Assign Task Modal
  const [serviceEngineers, setServiceEngineers] = useState([]);
  const [loadingEngineers, setLoadingEngineers] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTaskError, setAssignTaskError] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchDetailsAndEngineers = useCallback(async () => {
    if (!taskId) {
      setError('Task ID not found.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadingEngineers(true);
      setError(null);
      
      const [detailsResponse, engineersResponse] = await Promise.all([
        getTaskDetails(taskId),
        getServiceEngineers()
      ]);

      if (detailsResponse.success && detailsResponse.data) {
        setTaskDetails(detailsResponse.data);
      } else {
        setError(detailsResponse.message || 'Failed to fetch task details.');
      }

      if (engineersResponse.success) {
        setServiceEngineers(engineersResponse.data || []);
      } else {
        // Non-critical error, modal will show loading or error for engineers
        console.error(engineersResponse.message || 'Failed to fetch service engineers.'); 
      }

    } catch (err) {
      console.error('Error fetching details or engineers:', err);
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
      setLoadingEngineers(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchDetailsAndEngineers();
  }, [fetchDetailsAndEngineers]);

  const handleOpenAssignModal = () => {
    if (!taskDetails || !taskDetails.purchase) return;
    setAssignTaskError('');
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setAssignTaskError('');
  };

  const handleAssignTask = async (assignmentData) => {
    if (!taskDetails || !taskDetails.purchase || !taskDetails.purchase._id) {
      setAssignTaskError('Task data is not available for assignment.');
      return;
    }
    try {
      setIsAssigning(true);
      setAssignTaskError('');
      const response = await assignTask(taskDetails.purchase._id, assignmentData);
      if (response.success) {
        setShowAssignModal(false);
        fetchDetailsAndEngineers(); // Re-fetch details to show updated assignment
      } else {
        setAssignTaskError(response.message || 'Failed to assign task.');
      }
    } catch (err) {
      console.error('Error assigning task:', err);
      setAssignTaskError(err.message || 'An error occurred during assignment.');
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-50"><p className="text-lg text-gray-600">Loading task details...</p></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 bg-gray-50">
        <p className="text-red-600 text-xl mb-4">Error: {error}</p>
        <button
          onClick={() => navigate(-1)} // Changed from router.back()
          className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center"
        >
          <ArrowLeft className="h-5 w-5 mr-2" /> Go Back
        </button>
      </div>
    );
  }

  if (!taskDetails || !taskDetails.purchase) {
    return (
        <div className="flex flex-col items-center justify-center h-screen p-4 bg-gray-50">
            <p className="text-gray-600 text-xl mb-4">Task details not found.</p>
            <button
            onClick={() => navigate(-1)} // Changed from router.back()
            className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center"
            >
            <ArrowLeft className="h-5 w-5 mr-2" /> Go Back
            </button>
        </div>
    );
  }

  const purchase = taskDetails?.purchase;
  const customer = purchase?.customerId;
  const quotation = purchase?.quotationId;
  const salesperson = quotation?.createdBy;
  const assignedEngineer = purchase?.assignedEngineerId;

  // Ensure purchase is available before rendering dependent UI
  if (!purchase) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 bg-gray-50">
        <p className="text-gray-600 text-xl mb-4">Task data is not fully loaded or is invalid.</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center"
        >
          <ArrowLeft className="h-5 w-5 mr-2" /> Go Back
        </button>
      </div>
    );
  }
  
  const isPendingAssignment = purchase.serviceTaskStatus === 'pending_assignment';

  // Safely access quotationItems and payments from taskDetails
  const quotationItems = taskDetails?.quotationItems;
  const payments = taskDetails?.payments; // Define payments if you plan to use the commented-out Payment History card

  try {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header and Back Button - Updated Structure */}
          <div className="flex items-start gap-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 mt-1 hover:bg-gray-200 rounded-md text-gray-700 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Service Task Details
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Viewing details for task ID: <span className="font-medium">{purchase.purchaseID}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Service & Assignment Details Card */}
            <DetailCard title="Service & Assignment" icon={<Briefcase className="h-7 w-7" />}>
              <DetailItem 
                label="Task Status" 
                value={formatStatus(purchase.serviceTaskStatus)} 
                isBadge={true}
                statusValue={purchase.serviceTaskStatus}
              />
              <DetailItem 
                label="Assigned To" 
                valueClassName={isPendingAssignment ? 'text-orange-600 font-semibold' : ''}
                value={
                  isPendingAssignment 
                    ? 'Awaiting Assignment' 
                    : assignedEngineer 
                      ? `${assignedEngineer.name} (${assignedEngineer.email})` 
                      : 'Not Assigned'
                } 
              />
              <DetailItem 
                label="Service Due Date" 
                valueClassName={isPendingAssignment ? 'text-orange-600 font-semibold' : ''}
                value={
                  isPendingAssignment
                    ? 'Not Scheduled Yet'
                    : formatDate(purchase.serviceDueDate)
                } 
              />
              <DetailItem label="Assignment Notes" value={purchase.serviceAssignmentNotes || '-'} />
              {isPendingAssignment && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button 
                    onClick={handleOpenAssignModal}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    <AssignIcon className="h-5 w-5 mr-2" />
                    Assign Task
                  </button>
                </div>
              )}
            </DetailCard>

            {/* Customer Details Card */}
            <DetailCard title="Customer Information" icon={<User className="h-7 w-7" />}>
              <DetailItem label="Name" value={customer ? `${customer.firstName} ${customer.lastName}` : 'N/A'} />
              <DetailItem label="Email" value={customer?.email} />
              <DetailItem label="Phone" value={customer?.phone} />
              <DetailItem label="Business Name" value={customer?.businessName} />
              <DetailItem label="Billing Address" value={formatAddress(customer?.address)} />
            </DetailCard>

            {/* Salesperson Details Card */}
            <DetailCard title="Salesperson Information" icon={<Users className="h-7 w-7" />}>
              <DetailItem label="Name" value={salesperson?.name} />
              <DetailItem label="Email" value={salesperson?.email} />
            </DetailCard>

            {/* Purchase Summary Card */}
            <DetailCard title="Purchase Summary" icon={<DollarSign className="h-7 w-7" />}>
              <DetailItem label="Purchase ID" value={purchase.purchaseID} />
              <DetailItem label="Purchase Date" value={formatDate(purchase.purchaseDate)} />
              <DetailItem label="Quotation #" value={quotation?.quotationNumber} />
              <DetailItem label="Subtotal" value={formatCurrency(purchase.subtotal)} />
              <DetailItem label="Tax Amount" value={formatCurrency(purchase.taxAmount)} />
              <DetailItem label="Total Amount" value={formatCurrency(purchase.totalAmount)} />
              <DetailItem label="Advance Paid" value={formatCurrency(purchase.advancePaid)} />
              <DetailItem label="Remaining Amount" value={formatCurrency(purchase.remainingAmount)} />
              <DetailItem label="Payment Status" value={purchase.isFullyPaid ? 'Fully Paid' : 'Partially Paid'} />
            </DetailCard>

            {/* Products Purchased Card */}
            <div className="lg:col-span-2">
              <DetailCard title="Products Purchased" icon={<Package className="h-7 w-7" />}>
                {quotationItems && quotationItems.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {quotationItems.map(item => (
                      <li key={item._id || item.productId?._id} className="py-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-gray-800 text-lg">
                            {item.productId?.name || 'Product Name Missing'}
                          </span>
                          <span className="text-gray-600 text-md">
                            Qty: {item.quantity}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Model: {item.productId?.modelNumber || 'N/A'} | Price: {formatCurrency(item.unitPrice)}
                        </div>
                         {item.productId?.description && (
                          <p className="text-sm text-gray-500 mt-1.5">
                            {item.productId.description.length > 100 ? item.productId.description.substring(0, 100) + '...' : item.productId.description}
                          </p>
                         )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No product items found for this purchase.</p>
                )}
              </DetailCard>
            </div>

            {/* Payment History (Optional - can be a separate component or section) */}
            {/* <DetailCard title="Payment History" icon={<FileText className="h-6 w-6" />}>
              {payments && payments.length > 0 ? (
                payments.map(p => (
                  <DetailItem key={p._id} label={`Paid ${formatDate(p.paidAt)}`} value={`${formatCurrency(p.amountPaid)} (${p.paymentMethod})`} />
                ))
              ) : (
                <p>No payment history found.</p>
              )}
            </DetailCard> */}
          </div>

          {showAssignModal && taskDetails && taskDetails.purchase && (
            <AssignTaskModal
              task={taskDetails.purchase} // Pass the purchase object as task
              serviceEngineers={serviceEngineers}
              loadingEngineers={loadingEngineers}
              onClose={handleCloseAssignModal}
              onAssign={handleAssignTask}
              error={assignTaskError}
              isAssigning={isAssigning}
            />
          )}
        </div>
      </div>
    );
  } catch (renderError) {
    console.error("Error rendering task details page:", renderError);
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 bg-gray-50">
        <p className="text-red-600 text-xl mb-4">A critical error occurred while displaying task details.</p>
        <p className="text-sm text-gray-500 mb-4">Please try refreshing the page or contact support if the issue persists.</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center"
        >
          <ArrowLeft className="h-5 w-5 mr-2" /> Go Back
        </button>
      </div>
    );
  }
} 
import React, { useState, useEffect, useCallback } from 'react';
import { getPendingPayments, approvePayment, rejectPayment } from '../../../services/paymentService';
import { ShieldCheck, ShieldX, Calendar, User, Mail, IndianRupee, Banknote, Hash, MessageSquare, Loader2, AlertTriangle, Search } from 'lucide-react';
import Toast from '../../../components/Toast';
import ConfirmDialog from '../../../components/ConfirmDialog';

const VerifyPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', subTitle: '', onConfirm: () => {} });
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, paymentId: null, reason: '' });

  const fetchPendingPayments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getPendingPayments();
      if (response.success) {
        setPayments(response.data);
      } else {
        setError(response.message || 'Failed to fetch pending payments.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingPayments();
  }, [fetchPendingPayments]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleApprove = (paymentId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Are you sure you want to approve this payment?',
      subTitle: 'This action cannot be undone.',
      onConfirm: async () => {
        try {
          await approvePayment(paymentId);
          showToast('Payment approved successfully!');
          fetchPendingPayments();
        } catch (err) {
          showToast(err.message || 'Failed to approve payment.', 'error');
        } finally {
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
    });
  };

  const handleReject = (paymentId) => {
    setRejectionModal({ isOpen: true, paymentId, reason: '' });
  };

  const handleRejectSubmit = async () => {
    if (!rejectionModal.reason) {
      showToast('Rejection reason is required.', 'error');
      return;
    }
    setConfirmDialog({
        isOpen: true,
        title: 'Are you sure you want to reject this payment?',
        subTitle: 'This action cannot be undone.',
        onConfirm: async () => {
            try {
                await rejectPayment(rejectionModal.paymentId, rejectionModal.reason);
                showToast('Payment rejected successfully!');
                fetchPendingPayments();
            } catch (err) {
                showToast(err.message || 'Failed to reject payment.', 'error');
            } finally {
                setRejectionModal({ isOpen: false, paymentId: null, reason: '' });
                setConfirmDialog({ ...confirmDialog, isOpen: false });
            }
        },
    });
  };
  
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-12 w-12" /></div>;
  if (error) return <div className="text-red-500 flex justify-center items-center h-screen"><AlertTriangle className="mr-2"/> Error: {error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toast {...toast} onClose={() => setToast({ ...toast, show: false })} />
      <ConfirmDialog {...confirmDialog} onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />

      <h1 className="text-3xl font-bold mb-6 text-gray-800">Verify Payments</h1>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search by customer, salesperson, or amount..." className="pl-10 p-2 border rounded w-full" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salesperson</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{payment.customerPurchaseId?.customerId?.firstName} {payment.customerPurchaseId?.customerId?.lastName}</div>
                        <div className="text-sm text-gray-500">{payment.customerPurchaseId?.customerId?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{payment.initiatedBy?.name}</div>
                    <div className="text-sm text-gray-500">{payment.initiatedBy?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center"><IndianRupee size={14} className="mr-1"/> {payment.amountPaid.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center mb-1"><Banknote size={14} className="mr-2"/> {payment.paymentMethod}</div>
                    <div className="flex items-center mb-1"><Calendar size={14} className="mr-2"/> {formatDate(payment.paymentDate)}</div>
                    <div className="flex items-center mb-1"><Hash size={14} className="mr-2"/> {payment.referenceNumber}</div>
                    {payment.remarks && <div className="flex items-center"><MessageSquare size={14} className="mr-2"/>{payment.remarks}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleApprove(payment._id)} className="text-green-600 hover:text-green-900 mr-4 flex items-center"><ShieldCheck className="mr-1"/> Approve</button>
                    <button onClick={() => handleReject(payment._id)} className="text-red-600 hover:text-red-900 flex items-center"><ShieldX className="mr-1"/> Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Reject Payment</h2>
            <p className="mb-4 text-sm text-gray-600">Please provide a reason for rejecting this payment. This will be visible to the salesperson.</p>
            <textarea
              value={rejectionModal.reason}
              onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
              className="w-full p-2 border rounded"
              rows="4"
              placeholder="Enter rejection reason..."
            ></textarea>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setRejectionModal({ isOpen: false, paymentId: null, reason: '' })} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={handleRejectSubmit} className="px-4 py-2 bg-red-600 text-white rounded">Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyPaymentsPage; 
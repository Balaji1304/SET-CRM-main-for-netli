import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, CreditCard, Check, X, ChevronLeft, ChevronRight, Calendar, User, AlertTriangle } from 'lucide-react';
import { getAllApprovedPayments } from '../../../services/customerService';
import { apiRequest } from '../../../services/apiConfig';

// Custom styles for consistent modal design and mobile cards
const customStyles = `
  .mobile-action-compact {
    padding: 6px !important;
    margin: 0 1px !important;
  }
  
  .mobile-action-buttons {
    gap: 2px !important;
  }
  
  .mobile-card-compact {
    padding: 12px;
    margin-bottom: 8px;
  }
  
  .mobile-card-container {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  
  .mobile-header-text {
    font-size: 16px !important;
    line-height: 1.4 !important;
  }
  
  .mobile-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .mobile-modal-content {
    max-height: 95vh;
    overflow-y: auto;
  }
  
  .modal-section {
    border-bottom: 1px solid #f3f4f6;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
  }
  
  .modal-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }
  
  .detail-row:last-child {
    margin-bottom: 0;
  }
  
  .detail-label {
    color: #6b7280;
    font-weight: 500;
    font-size: 0.875rem;
    min-width: 100px;
    flex-shrink: 0;
  }
  
  .detail-value {
    color: #374151;
    font-weight: 400;
    font-size: 0.875rem;
    text-align: right;
    flex: 1;
    margin-left: 1rem;
  }
  
  @media (max-width: 375px) {
    .mobile-card-compact {
      padding: 8px;
    }
    
    .mobile-header-text {
      font-size: 14px !important;
      line-height: 1.3 !important;
    }
    
    .mobile-action-buttons {
      gap: 1px !important;
    }
    
    .mobile-action-compact {
      padding: 4px !important;
      margin: 0 !important;
    }
  }
  
  @media (max-width: 640px) {
    .detail-row {
      flex-direction: column;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    
    .detail-value {
      text-align: left;
      margin-left: 0;
      margin-top: 0.25rem;
      font-weight: 500;
    }
    
    .detail-label {
      min-width: auto;
    }
  }
  
  /* Medium desktop responsiveness */
  @media (min-width: 768px) and (max-width: 1024px) {
    .compact-table-cell {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
    
    .compact-font {
      font-size: 0.75rem;
    }
    
    .compact-badge {
      padding: 0.125rem 0.375rem;
      font-size: 0.625rem;
    }
    
    .compact-button {
      padding: 0.25rem 0.5rem;
      font-size: 0.625rem;
    }
  }
  
  /* Responsive table utilities */
  @media (min-width: 768px) {
    .responsive-table {
      font-size: 0.875rem;
    }
  }
  
  @media (min-width: 768px) and (max-width: 1024px) {
    .responsive-table {
      font-size: 0.75rem;
    }
    
    .responsive-table th,
    .responsive-table td {
      padding: 0.5rem 0.5rem;
    }
    
    .responsive-table .truncate-sm {
      max-width: 120px;
    }
    
    .responsive-table .truncate-md {
      max-width: 150px;
    }
  }
`;

export default function ApprovedPaymentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [drawer, setDrawer] = useState({ open: false, row: null });
  
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRows();
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllApprovedPayments();
      if (!res.success) throw new Error(res.message || 'Failed to load');
      setRows(res.data || []);
    } catch (err) {
      setError(err.message || 'Error loading approved payments');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!q) return safeRows;
    const s = q.toLowerCase();
    return safeRows.filter(r => (r.quotationNumber || '').toLowerCase().includes(s) || (r.lead?.phone || '').toLowerCase().includes(s));
  }, [rows, q]);

  // Pagination calculations with adjustment for empty pages
  const totalPages = Math.ceil((filtered?.length || 0) / itemsPerPage);
  const adjustedCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (adjustedCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = Array.isArray(filtered) ? filtered.slice(startIndex, endIndex) : [];

  // Adjust current page if it becomes invalid after items are removed
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (drawer.open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [drawer.open]);

  const openDrawer = (row) => {
    setDrawer({ open: true, row });
  };
  const closeDrawer = () => setDrawer({ open: false, row: null });

  const approveManual = async (purchaseId, paymentId) => {
    try {
      await apiRequest(`customer-purchases/${purchaseId}/payments/${paymentId}/verify`, { method: 'PUT' }, false);
      setActionMessage('Payment verified');
      fetchRows();
    } catch (e) { setActionMessage(e.message || 'Failed to verify'); }
  };
  const rejectManual = async (purchaseId, paymentId) => {
    try {
      await apiRequest(`customer-purchases/${purchaseId}/payments/${paymentId}/reject`, { method: 'PUT', body: { reason: 'Not matched' } }, false);
      setActionMessage('Payment rejected');
      fetchRows();
    } catch (e) { setActionMessage(e.message || 'Failed to reject'); }
  };

  return (
    <>
      <style>{customStyles}</style>
      <div className="flex flex-col h-full">
        <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary">Approved Payments</h1>
        </div>
        <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="p-4 md:p-6 border-b border-fourth flex items-center gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input className="pl-8 sm:pl-10 pr-4 py-2 w-full border border-fourth rounded-lg text-sm" placeholder="Search by # or phone" value={q} onChange={(e)=>setQ(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {actionMessage && (
              <div className="p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200">{actionMessage}</div>
            )}
            {loading ? (
              <div className="p-6 text-gray-500">Loading...</div>
            ) : error ? (
              <div className="p-6 text-red-600">{error}</div>
            ) : (
              <>
                {/* Desktop view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 responsive-table">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 lg:px-3 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 md:w-24 lg:w-32">Type</th>
                        <th className="px-2 lg:px-3 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 md:w-24 lg:w-32">Quotation #</th>
                        <th className="px-2 lg:px-3 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 md:w-36 lg:w-48">Customer/Lead</th>
                        <th className="px-2 lg:px-3 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 md:w-24 lg:w-32">Total</th>
                        <th className="px-2 lg:px-3 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 md:w-24 lg:w-32">Payment</th>
                        <th className="hidden lg:table-cell px-2 lg:px-3 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 lg:w-36">Payment Method</th>
                        <th className="hidden lg:table-cell px-2 lg:px-3 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 lg:w-32">Payment Date</th>
                        <th className="px-2 lg:px-3 py-2 lg:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 md:w-36 lg:w-48">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="md:table-cell lg:hidden px-6 py-12 text-center text-gray-500">
                            {q ? 'No approved payments found matching your search criteria.' : 'No approved payments at this time.'}
                          </td>
                          <td colSpan="8" className="hidden lg:table-cell px-6 py-12 text-center text-gray-500">
                            {q ? 'No approved payments found matching your search criteria.' : 'No approved payments at this time.'}
                          </td>
                        </tr>
                      ) : (
                        currentItems.map(row => (
                          <tr key={row._id} className="hover:bg-gray-50 transition-all duration-300">
                            <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-700 font-medium whitespace-nowrap">
                              <span className={`inline-flex items-center px-1.5 lg:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                row.type === 'remaining_payment_approval'
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                <span className="hidden lg:inline">
                                  {row.type === 'remaining_payment_approval' ? 'Remaining Payment' : 'Advance Payment'}
                                </span>
                                <span className="lg:hidden">
                                  {row.type === 'remaining_payment_approval' ? 'Remaining' : 'Advance'}
                                </span>
                              </span>
                            </td>
                            <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-700 font-medium whitespace-nowrap">
                              <div className="max-w-full truncate" title={row.quotationNumber || 'N/A'}>
                                {row.quotationNumber || 'N/A'}
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-600">
                              <div className="max-w-full">
                                <div className="font-medium truncate" title={`${row.lead?.firstName || ''} ${row.lead?.lastName || ''}`.trim() || 'N/A'}>
                                  {`${row.lead?.firstName || ''} ${row.lead?.lastName || ''}`.trim() || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-400 truncate" title={row.lead?.phone || 'N/A'}>
                                  {row.lead?.phone || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-600 whitespace-nowrap">
                              <span className="hidden lg:inline">₹</span>
                              <span className="lg:hidden">₹</span>
                              {Number(row.total || 0).toLocaleString('en-IN', { 
                                minimumFractionDigits: 0, 
                                maximumFractionDigits: 0 
                              })}
                            </td>
                            <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-600 whitespace-nowrap">
                              {row.advancePaymentAmount ? (
                                <div className="text-xs lg:text-sm font-semibold text-green-600">
                                  <span className="hidden lg:inline">₹</span>
                                  <span className="lg:hidden">₹</span>
                                  {Number(row.advancePaymentAmount).toLocaleString('en-IN', { 
                                    minimumFractionDigits: 0, 
                                    maximumFractionDigits: 0 
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="hidden lg:table-cell px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-600">
                              <div className="max-w-full truncate" title={row.paymentMethod || (row.razorpayPaymentId ? 'Razorpay' : 'N/A')}>
                                {row.paymentMethod || (row.razorpayPaymentId ? 'Razorpay' : 'N/A')}
                              </div>
                            </td>
                            <td className="hidden lg:table-cell px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm text-gray-600 whitespace-nowrap">
                              <div className="max-w-full truncate">
                                {row.advancePaymentConfirmedAt 
                                  ? new Date(row.advancePaymentConfirmedAt).toLocaleDateString('en-GB')
                                  : (row.paymentDate ? new Date(row.paymentDate).toLocaleDateString('en-GB') : 'N/A')
                                }
                              </div>
                            </td>
                            <td className="px-2 lg:px-3 py-3 lg:py-4 text-xs lg:text-sm">
                              <div className="flex items-center space-x-1 lg:space-x-2">
                                <button
                                  onClick={() => openDrawer(row)}
                                  className="inline-flex items-center gap-1 px-1.5 lg:px-2 py-1 rounded-md text-xs font-medium border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors duration-150"
                                  title="View payment details"
                                >
                                  <span className="hidden lg:inline">View details</span>
                                  <span className="lg:hidden">View</span>
                                </button>
                                <span className="inline-flex items-center gap-1 px-1.5 lg:px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                  <Check className="w-3 h-3" /> 
                                  <span className="hidden lg:inline">CONFIRMED</span>
                                  <span className="lg:hidden">OK</span>
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view */}
                <div className="md:hidden p-2 sm:p-4 space-y-2 sm:space-y-3">
                  {currentItems.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <p className="text-sm sm:text-base text-gray-500">
                        {q ? 'No approved payments found matching your search criteria.' : 'No approved payments at this time.'}
                      </p>
                    </div>
                  ) : (
                    currentItems.map(row => (
                      <div key={row._id} className="mobile-card-compact mobile-card-container bg-white rounded-xl border border-gray-200 space-y-3 shadow-sm hover:shadow-md transition-all duration-300">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-1 sm:gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                row.type === 'remaining_payment_approval'
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {row.type === 'remaining_payment_approval' ? 'Remaining Payment' : 'Advance Payment'}
                              </span>
                            </div>
                            <h3 className="mobile-header-text text-base sm:text-lg font-semibold text-gray-900 mb-1 line-clamp-2 leading-tight"
                                title={row.quotationNumber}>
                              #{row.quotationNumber || 'N/A'}
                            </h3>
                            <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
                              <div className="flex items-center space-x-1 min-w-0 overflow-hidden">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="mobile-truncate">
                                  {`${row.lead?.firstName || ''} ${row.lead?.lastName || ''}`.trim() || 'N/A'}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 mobile-truncate">
                              {row.lead?.phone || 'N/A'}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className="text-base sm:text-lg font-bold text-gray-900">
                              ₹{Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {/* Payment Amount and Status - 2 columns */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Payment Amount</p>
                            <p className="text-xs sm:text-sm font-semibold text-green-600 mobile-truncate">
                              {row.advancePaymentAmount ? 
                                `₹${Number(row.advancePaymentAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                : 'N/A'
                              }
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="w-3 h-3" /> CONFIRMED
                            </span>
                          </div>
                        </div>

                        {/* Payment Method and Reference - 2 columns */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-100">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Payment Method</p>
                            <p className="text-xs sm:text-sm text-gray-900 mobile-truncate">
                              {row.paymentMethod || (row.razorpayPaymentId ? 'Razorpay' : 'N/A')}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Reference</p>
                            <p className="text-xs text-gray-900 mobile-truncate font-mono bg-gray-50 px-1 py-0.5 rounded">
                              {row.offlineTransactionNo || row.razorpayPaymentId || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* Payment Date */}
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Payment Date</p>
                          <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="mobile-truncate">
                              {row.advancePaymentConfirmedAt 
                                ? new Date(row.advancePaymentConfirmedAt).toLocaleDateString('en-GB')
                                : (row.paymentDate ? new Date(row.paymentDate).toLocaleDateString('en-GB') : 'N/A')
                              }
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 sm:gap-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => openDrawer(row)}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
                          >
                            View details
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Details Modal */}
        {drawer.open && createPortal(
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
                onClick={closeDrawer}
                aria-hidden="true"
              />
              
              {/* Modal panel - improved mobile responsiveness */}
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg lg:max-w-xl sm:w-full w-full mx-4 mobile-modal-content">
                {/* Header - Improved mobile header */}
                <div className="bg-white px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                      </div>
                      <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg leading-6 font-semibold text-gray-900 truncate">
                          Payment Details - {drawer.row?.type === 'remaining_payment_approval' ? 'Remaining Payment' : 'Advance Payment'}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                          Quotation #{drawer.row?.quotationNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={closeDrawer}
                      className="ml-2 bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-150"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                </div>

                {/* Content - Improved mobile layout */}
                <div className="bg-white px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {drawer.row && (
                    <>
                      {/* Customer/Lead Information - Mobile-first layout */}
                      <div className="modal-section">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wider">
                          Customer Information
                        </h4>
                        <div className="space-y-2 sm:space-y-3">
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Customer Name:</span>
                            <span className="detail-value font-medium text-xs sm:text-sm">
                              {`${drawer.row.lead?.firstName || ''} ${drawer.row.lead?.lastName || ''}`.trim() || 'N/A'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Email:</span>
                            <span className="detail-value text-xs sm:text-sm break-all">
                              {drawer.row.lead?.email || 'N/A'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Phone:</span>
                            <span className="detail-value text-xs sm:text-sm">
                              {drawer.row.lead?.phone || 'N/A'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Total Amount:</span>
                            <span className="detail-value font-semibold text-gray-900 text-sm sm:text-base">
                              ₹{Number(drawer.row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Sales Person Information */}
                      <div className="modal-section">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wider">Sales Information</h4>
                        <div className="space-y-2 sm:space-y-3">
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Sales Person:</span>
                            <span className="detail-value font-medium text-xs sm:text-sm">
                              {drawer.row.createdBy?.name || 'N/A'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Quotation Date:</span>
                            <span className="detail-value text-xs sm:text-sm">
                              {drawer.row.createdAt 
                                ? new Date(drawer.row.createdAt).toLocaleDateString('en-GB')
                                : 'N/A'
                              }
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Approval Date:</span>
                            <span className="detail-value text-xs sm:text-sm">
                              {drawer.row.advancePaymentConfirmedAt 
                                ? new Date(drawer.row.advancePaymentConfirmedAt).toLocaleDateString('en-GB')
                                : 'N/A'
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Information */}
                      <div className="modal-section">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wider">Payment Information</h4>
                        <div className="space-y-2 sm:space-y-3">
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Status:</span>
                            <span className="detail-value font-medium text-xs sm:text-sm text-green-600">
                              CONFIRMED
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Amount Paid:</span>
                            <span className="detail-value font-medium text-xs sm:text-sm text-green-600">
                              {drawer.row.advancePaymentAmount ? 
                                `₹${Number(drawer.row.advancePaymentAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                : 'N/A'
                              }
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Payment Method:</span>
                            <span className="detail-value text-xs sm:text-sm">{drawer.row.paymentMethod || (drawer.row.razorpayPaymentId ? 'Razorpay' : 'N/A')}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Reference No:</span>
                            <span className="detail-value font-mono text-xs bg-gray-50 px-2 py-1 rounded break-all">
                              {drawer.row.offlineTransactionNo || drawer.row.razorpayPaymentId || 'N/A'}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label text-xs sm:text-sm">Payment Date:</span>
                            <span className="detail-value text-xs sm:text-sm">
                              {drawer.row.advancePaymentConfirmedAt 
                                ? new Date(drawer.row.advancePaymentConfirmedAt).toLocaleDateString('en-GB')
                                : (drawer.row.paymentDate ? new Date(drawer.row.paymentDate).toLocaleDateString('en-GB') : 'N/A')
                              }
                            </span>
                          </div>
                          {drawer.row.paymentNotes && (
                            <div className="detail-row">
                              <span className="detail-label text-xs sm:text-sm">Notes:</span>
                              <span className="detail-value italic text-xs sm:text-sm break-words">{drawer.row.paymentNotes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer - Mobile-optimized buttons */}
                <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200 sticky bottom-0">
                  <div className="flex justify-center sm:justify-start">
                    <button
                      onClick={closeDrawer}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-150"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="px-2 lg:px-4 xl:px-6 py-3 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between sticky bottom-0 left-0 right-0 shadow-sm space-y-3 sm:space-y-0">
            <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
              Showing {Math.min(startIndex + 1, filtered.length)} to {Math.min(endIndex, filtered.length)} of {filtered.length} results
            </div>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={adjustedCurrentPage === 1}
                className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="text-xs sm:text-sm text-gray-600 px-3 py-2 min-w-[80px] text-center"> 
                {adjustedCurrentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={adjustedCurrentPage === totalPages}
                className="p-2 border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150 touch-target"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}



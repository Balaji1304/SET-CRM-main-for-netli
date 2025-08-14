import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  FileText, 
  Edit2, 
  Check, 
  Loader2,
  Download,
  Mail,
  IndianRupee,
  AlertTriangle,
  Info,
  Package,
  Hash,
  CreditCard
} from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Toast from '../../../components/Toast';
import { getQuotation, sendQuotation, approveQuotation } from '../../../services/quotationService';
import { sendInvoiceEmail } from '../../../services/invoiceService';
import { API_URL } from '../../../services/apiConfig';

export default function QuotationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [emailSentTime, setEmailSentTime] = useState(null);
  const [invoiceEmailStatus, setInvoiceEmailStatus] = useState({ sending: false, sent: false, error: null });
  const [ws, setWs] = useState(null);
  const quotationSendStartTime = useRef(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSendingQuotation, setIsSendingQuotation] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchQuotation();
      hasFetchedRef.current = true;
    }
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create WebSocket URL based on API_URL
    // Extract the base URL without /api and use appropriate protocol
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiUrlWithoutProtocol = API_URL.replace(/^https?:\/\//, '').split('/api')[0];
    const wsUrl = `${wsProtocol}//${apiUrlWithoutProtocol}`;
    
    const socket = new WebSocket(`${wsUrl}?token=Bearer ${token}`);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'CONNECTED':
            console.log('WebSocket authenticated');
            break;
           case 'QUOTATION_STATUS':
            if (data.quotationId === id) {
              if (data.status === 'sent') {
                // Update quotation state locally instead of refetching
                setQuotation(prev => prev ? { ...prev, status: 'sent' } : prev);
                const endTime = Date.now();
                setEmailSentTime(endTime - quotationSendStartTime.current);
                setToastMessage('Quotation sent successfully!');
                setShowToast(true);
                setIsSendingQuotation(false);
              } else if (data.status === 'draft') {
                setIsSendingQuotation(false);
              } else if (data.status === 'pending_approval') {
                setQuotation(prev => prev ? { ...prev, status: 'pending_approval', advancePaymentStatus: 'CONFIRMED' } : prev);
                setToastMessage('Payment confirmed. Awaiting accounts approval.');
                setShowToast(true);
              } else if (data.status === 'approved') {
                setQuotation(prev => prev ? { ...prev, status: 'approved', advancePaymentStatus: 'CONFIRMED' } : prev);
                setToastMessage('Quotation approved.');
                setShowToast(true);
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    setWs(socket);
    
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [id, API_URL]);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const response = await getQuotation(id);
      if (response.success) {
        console.log('Quotation data:', response.data);
        setQuotation(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch quotation');
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
      setQuotation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuotation = async () => {
    try {
      setIsSendingQuotation(true);
      quotationSendStartTime.current = Date.now();
      
      const response = await sendQuotation(id);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to send quotation');
      }
    } catch (error) {
      console.error('Error sending quotation:', error);
      setToastMessage('Failed to send quotation: ' + error.message);
      setShowToast(true);
      setIsSendingQuotation(false);
    }
  };

  const handleApproveQuotation = async () => {
    try {
      const response = await approveQuotation(id);
      
      if (response.success) {
        fetchQuotation();
        setToastMessage('Quotation approved successfully!');
        setShowToast(true);
      } else {
        throw new Error(response.message || 'Failed to approve quotation');
      }
    } catch (error) {
      console.error('Error approving quotation:', error);
      setToastMessage('Failed to approve quotation: ' + error.message);
      setShowToast(true);
    }
  };

  const handleSendExistingInvoiceEmail = async () => {
    if (!quotation?.customerPurchaseDetails?.invoiceId) {
      setToastMessage('Invoice ID not found. Cannot send email.');
      setShowToast(true);
      return;
    }
    setInvoiceEmailStatus({ sending: true, sent: false, error: null });
    try {
      const response = await sendInvoiceEmail(quotation.customerPurchaseDetails.invoiceId);
      if (response.success) {
        setInvoiceEmailStatus({ sending: false, sent: true, error: null });
        setToastMessage(response.message || 'Invoice email sent successfully!');
        setShowToast(true);
      } else {
        throw new Error(response.message || 'Failed to send invoice email');
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      setInvoiceEmailStatus({ sending: false, sent: false, error: error.message });
      setToastMessage(`Error: ${error.message}`);
      setShowToast(true);
    }
  };

  const getStatusBadgeClass = (status) => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border";
    const statusClasses = {
      draft: 'bg-gray-100 text-gray-700 border-gray-300',
      sending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      sent: 'bg-blue-100 text-blue-700 border-blue-300',
      approved: 'bg-green-100 text-green-700 border-green-300',
      rejected: 'bg-red-100 text-red-700 border-red-300',
      expired: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      closed: 'bg-purple-100 text-purple-700 border-purple-300' 
    };
    return `${baseClasses} ${statusClasses[status] || 'bg-gray-100 text-gray-700 border-gray-300'}`;
  };

  // Mobile Item Card Component
  const ItemCard = ({ item, index }) => {
    // Handle regular products, customized products, and bundle products
    const productObj = item.productId || item.customizedProductId || item.bundleId;
    let productName = 'Product Name Not Available';
    
    if (item.productId && item.productId.name) {
      productName = item.productId.name;
    } else if (item.customizedProductId && item.customizedProductId.name) {
      productName = `${item.customizedProductId.name} (Customized)`;
    } else if (item.bundleId && item.bundleId.name) {
      productName = `${item.bundleId.name} (Bundle)`;
    } else if (productObj?.name) {
      productName = productObj.name;
    }
    
    const total = item.quantity * item.unitPrice * (1 - item.discount/100);
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 mb-2 leading-5">{productName}</h4>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Package className="w-3.5 h-3.5" />
              <span>Item #{index + 1}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-gray-900 mb-1">
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Quantity</p>
            <p className="text-sm font-semibold text-gray-900">{item.quantity}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Unit Price</p>
            <p className="text-sm font-semibold text-gray-900">₹{item.unitPrice.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Discount</p>
            <p className="text-sm font-semibold text-gray-900">{item.discount}%</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-[calc(100vh-var(--header-height,150px))] items-center justify-center bg-tertiary p-4 sm:p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading Quotation Details...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col flex-1 min-h-[calc(100vh-var(--header-height,150px))] items-center justify-center bg-tertiary p-4 sm:p-6 text-center">
        <Info className="h-12 w-12 text-primary mb-4" />
        <h3 className="text-xl font-semibold text-secondary mb-2">Quotation Not Found</h3>
        <p className="text-gray-600 mb-4 max-w-md">The quotation you are looking for does not exist or you may not have permission to view it.</p>
        <button
            onClick={() => navigate('/dashboard/quotations')}
            className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity touch-target"
        >
            Back to Quotations
        </button>
      </div>
    );
  }
  
  const canSendInvoice = quotation.status === 'approved' && 
                         quotation.customerPurchaseDetails?.isFullyPaid === true && 
                         quotation.customerPurchaseDetails?.hasInvoice === true;

  const showWaitingForPaymentMessage = quotation.status === 'approved' && 
                                     quotation.customerPurchaseDetails && 
                                     !quotation.customerPurchaseDetails.isFullyPaid;

  const showInvoiceNotGeneratedMessage = quotation.status === 'approved' && 
                                         quotation.customerPurchaseDetails?.isFullyPaid === true && 
                                         !quotation.customerPurchaseDetails?.hasInvoice;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/quotations')}
              className="p-2 rounded-md hover:bg-gray-100 text-secondary touch-target"
              aria-label="Back to quotations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-secondary">
                Quotation #{quotation.quotationNumber}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Created on {new Date(quotation.createdAt).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
          
          {/* Action Buttons - Responsive Layout */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {(quotation.status === 'draft' || isSendingQuotation) && (
              <>
                <button
                  onClick={() => navigate(`/dashboard/quotations/${id}/edit`)}
                  className="px-4 py-2.5 border border-gray-300 text-secondary rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors duration-150 ease-in-out flex items-center justify-center gap-2 touch-target"
                  disabled={isSendingQuotation}
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setConfirmAction(() => handleSendQuotation);
                    setShowConfirmDialog(true);
                  }}
                  className={`px-4 py-2.5 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out flex items-center justify-center min-w-[150px] gap-2 touch-target ${
                    isSendingQuotation ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  disabled={isSendingQuotation}
                >
                  {isSendingQuotation ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send to Lead
                    </>
                  )}
                </button>
              </>
            )}
            {quotation.status === 'sent' && !isSendingQuotation && (
              <button
                onClick={() => {
                  setConfirmAction(() => handleApproveQuotation);
                  setShowConfirmDialog(true);
                }}
                className="px-4 py-2.5 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out flex items-center justify-center gap-2 touch-target"
              >
                <Check className="h-4 w-4" />
                Approve
              </button>
            )}
            {quotation.status === 'pending_approval' && (
              <span className="px-3 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 border border-amber-200">Awaiting Accounts Approval</span>
            )}
            {quotation.status === 'approved' && (
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleSendExistingInvoiceEmail}
                  className={`px-4 py-2.5 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out flex items-center justify-center min-w-[150px] gap-2 touch-target ${
                    (!canSendInvoice || invoiceEmailStatus.sending) ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                  disabled={!canSendInvoice || invoiceEmailStatus.sending}
                >
                  {invoiceEmailStatus.sending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending Email...</>
                  ) : (
                    <><Mail className="h-4 w-4" /> Send Invoice</>
                  )}
                </button>
                
                {/* Status Messages */}
                <div className="text-center sm:text-right space-y-1">
                  {showWaitingForPaymentMessage && (
                                         <span className="text-sm text-yellow-600 flex items-center justify-center sm:justify-end gap-1">
                       <IndianRupee className="h-4 w-4" /> Waiting for full payment
                     </span>
                  )}
                  {showInvoiceNotGeneratedMessage && (
                    <span className="text-sm text-red-600 flex items-center justify-center sm:justify-end gap-1">
                      <AlertTriangle className="h-4 w-4" /> Invoice not generated
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quotation Details Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* Status and Validity */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200 space-y-3 sm:space-y-0">
            <span className={getStatusBadgeClass(quotation.status)}>
              {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
              {isSendingQuotation && quotation.status === 'draft' && ' (Sending...)'}
            </span>
            <span className="text-sm text-gray-500">
              Valid until: {new Date(quotation.validUntil).toLocaleDateString('en-GB')}
            </span>
          </div>

          {/* Lead Information Section */}
          <section>
            <h2 className="text-xl font-semibold text-secondary border-b border-gray-200 pb-2 mb-4">Lead Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Full Name</p>
                <p className="text-secondary font-medium">{quotation.lead.firstName} {quotation.lead.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Business Name</p>
                <p className="text-secondary">{quotation.lead.businessName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Email Address</p>
                <p className="text-secondary break-all">{quotation.lead.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Phone Number</p>
                <p className="text-secondary">{quotation.lead.phone}</p>
              </div>
            </div>
          </section>

          {/* Items Section */}
          <section>
            <h2 className="text-xl font-semibold text-secondary border-b border-gray-200 pb-2 mb-4">Quotation Items</h2>
            
            {/* Desktop/Tablet Table View */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Discount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotation.quotationItems?.map((item, index) => {
                      // Handle regular products, customized products, and bundle products
                      const productObj = item.productId || item.customizedProductId || item.bundleId;
                      let productName = 'Product Name Not Available';
                      
                      if (item.productId && item.productId.name) {
                        productName = item.productId.name;
                      } else if (item.customizedProductId && item.customizedProductId.name) {
                        productName = `${item.customizedProductId.name} (Customized)`;
                      } else if (item.bundleId && item.bundleId.name) {
                        productName = `${item.bundleId.name} (Bundle)`;
                      } else if (productObj?.name) {
                        productName = productObj.name;
                      }
                      
                      const total = item.quantity * item.unitPrice * (1 - item.discount/100);
                      
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="font-medium">{productName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.discount}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right font-medium">
                            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-4">
              {quotation.quotationItems?.map((item, index) => (
                <ItemCard key={index} item={item} index={index} />
              ))}
            </div>

            {/* Totals Section */}
            <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-secondary">Total Amount</span>
                  <span className="text-primary">
                    ₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Advance Payment Information */}
            {quotation.advancePaymentPercentage > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CreditCard className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Advance Payment Required:</h4>
                    <p className="text-sm">
                      {quotation.advancePaymentPercentage}% of total amount: 
                      <span className="font-bold ml-1">₹{((quotation.total * quotation.advancePaymentPercentage / 100) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </p>
                    {quotation.status === 'sent' && (
                      <p className="text-xs text-yellow-700 mt-2">
                        This amount must be paid before the quotation can be approved and processed further.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Terms and Notes Section */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <h2 className="text-xl font-semibold text-secondary border-b border-gray-200 pb-2 mb-4">Terms & Conditions</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {quotation.terms || 'No specific terms provided.'}
                  </p>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-secondary border-b border-gray-200 pb-2 mb-4">Additional Notes</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {quotation.notes || 'No additional notes.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Email timing display */}
        {emailSentTime && (
          <div className="text-center text-sm text-gray-500 mt-4 p-4 bg-white rounded-lg border border-gray-200">
            Email sent in {(emailSentTime / 1000).toFixed(2)} seconds.
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setConfirmAction(null);
        }}
        onConfirm={() => {
          confirmAction?.();
          setShowConfirmDialog(false);
          setConfirmAction(null);
        }}
        title={
          confirmAction === handleSendQuotation
            ? "Send Quotation"
            : "Approve Quotation"
        }
        message={
          confirmAction === handleSendQuotation
            ? "Are you sure you want to send this quotation to the lead? This action cannot be undone."
            : "Are you sure you want to approve this quotation? This may create related records and change its status."
        }
        confirmText= {confirmAction === handleSendQuotation ? "Yes, Send" : "Yes, Approve"}
      />

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastMessage.toLowerCase().includes('fail') || toastMessage.toLowerCase().includes('error') ? 'error' : (invoiceEmailStatus.sent ? 'success' : 'info')}
          onClose={() => {
            setShowToast(false);
            if (invoiceEmailStatus.error) setInvoiceEmailStatus(prev => ({...prev, error: null}));
            if (invoiceEmailStatus.sent) setInvoiceEmailStatus(prev => ({...prev, sent: false}));
          }}
        />
      )}
    </div>
  );
} 
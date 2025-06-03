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
  DollarSign,
  AlertTriangle,
  Info
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

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-[calc(100vh-var(--header-height,150px))] items-center justify-center bg-tertiary p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-lg text-secondary">Loading Quotation Details...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col flex-1 min-h-[calc(100vh-var(--header-height,150px))] items-center justify-center bg-tertiary p-6 text-center">
        <Info className="h-12 w-12 text-primary mb-4" />
        <h3 className="text-xl font-semibold text-secondary mb-2">Quotation Not Found</h3>
        <p className="text-gray-600 mb-4">The quotation you are looking for does not exist or you may not have permission to view it.</p>
        <button
            onClick={() => navigate('/dashboard/quotations')}
            className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
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
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/quotations')}
            className="p-2 rounded-md hover:bg-fourth text-secondary"
            aria-label="Back to quotations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-secondary">
              Quotation #{quotation.quotationNumber}
            </h1>
            <p className="text-sm text-gray-500">
              Created on {new Date(quotation.createdAt).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(quotation.status === 'draft' || isSendingQuotation) && (
            <>
              <button
                onClick={() => navigate(`/dashboard/quotations/${id}/edit`)}
                className="px-4 py-2 border border-fourth text-secondary rounded-lg text-sm font-medium hover:bg-fourth transition-colors duration-150 ease-in-out flex items-center gap-2"
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
                className={`px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out flex items-center justify-center min-w-[150px] gap-2 ${
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
            <>
              <button
                onClick={() => {
                  setConfirmAction(() => handleApproveQuotation);
                  setShowConfirmDialog(true);
                }}
                className="px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Approve
              </button>
            </>
          )}
          {quotation.status === 'approved' && (
            <div className="flex flex-col items-end gap-2">
            <button
                onClick={handleSendExistingInvoiceEmail}
                className={`px-4 py-2 bg-primary text-tertiary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity duration-150 ease-in-out flex items-center justify-center min-w-[150px] gap-2 ${
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
              <div className="mt-1 text-right">
                {showWaitingForPaymentMessage && (
                  <span className="text-sm text-yellow-600 flex items-center justify-end gap-1">
                    <DollarSign className="h-4 w-4" /> Waiting for full payment.
                  </span>
                )}
                {showInvoiceNotGeneratedMessage && (
                  <span className="text-sm text-red-600 flex items-center justify-end gap-1 mt-1">
                    <AlertTriangle className="h-4 w-4" /> Invoice not generated.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quotation Details Card */}
      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm p-6 md:p-8 space-y-8">
        {/* Status and Validity */}
        <div className="flex items-center justify-between pb-4 border-b border-fourth">
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
          <h2 className="text-xl font-semibold text-secondary border-b border-fourth pb-2 mb-4">Lead Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Full Name</p>
              <p className="text-secondary">{quotation.lead.firstName} {quotation.lead.lastName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Business Name</p>
              <p className="text-secondary">{quotation.lead.businessName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Email Address</p>
              <p className="text-secondary">{quotation.lead.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Phone Number</p>
              <p className="text-secondary">{quotation.lead.phone}</p>
            </div>
          </div>
        </section>

        {/* Items Section */}
        <section>
          <h2 className="text-xl font-semibold text-secondary border-b border-fourth pb-2 mb-4">Quotation Items</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-fourth">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">Total Amount</th>
                </tr>
              </thead>
              <tbody className="bg-tertiary divide-y divide-fourth">
                {quotation.quotationItems?.map((item, index) => {
                  const productObj = item.productId;
                  const productName = productObj?.name || 'Product Name Not Available';
                  const total = item.quantity * item.unitPrice * (1 - item.discount/100);
                  
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.discount}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-fourth bg-gray-50">
                <tr>
                  <td colSpan="4" className="px-6 py-3 text-right text-sm font-medium text-secondary">Subtotal</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-secondary">
                    ₹{quotation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td colSpan="4" className="px-6 py-3 text-right text-sm font-medium text-secondary">Tax ({quotation.taxPercentage || 18}%)</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-secondary">
                    ₹{quotation.tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="font-semibold text-secondary">
                  <td colSpan="4" className="px-6 py-4 text-right text-base">Total Amount</td>
                  <td className="px-6 py-4 text-right text-base">
                    ₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Advance Payment Information */}
          {quotation.advancePaymentPercentage > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-lg">
              <h4 className="text-sm font-semibold mb-1">Advance Payment Required:</h4>
              <p className="text-sm">
                {quotation.advancePaymentPercentage}% of total amount: 
                <span className="font-medium"> ₹{((quotation.total * quotation.advancePaymentPercentage / 100) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
              {quotation.status === 'sent' && (
                <p className="text-xs text-yellow-600 mt-1">
                  This amount must be paid before the quotation can be approved and processed further.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Terms and Notes Section */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold text-secondary border-b border-fourth pb-2 mb-4">Terms & Conditions</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.terms || 'No specific terms provided.'}</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-secondary border-b border-fourth pb-2 mb-4">Additional Notes</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.notes || 'No additional notes.'}</p>
            </div>
          </div>
        </section>
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

      {emailSentTime && (
        <div className="text-center text-sm text-gray-500 mt-4 pb-4">
          Email sent in {(emailSentTime / 1000).toFixed(2)} seconds.
        </div>
      )}
    </div>
  );
} 
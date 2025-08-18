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
  const [confirmActionType, setConfirmActionType] = useState(null); // Add this to track action type
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
      productName = `${item.bundleId.name} (System)`;
    } else if (productObj?.name) {
      productName = productObj.name;
    }
    
    const total = item.quantity * item.unitPrice * (1 - item.discount/100);
    
    return (
      <div className="bg-tertiary rounded-xl border border-fourth p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-secondary mb-2 leading-6">{productName}</h4>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Package className="w-4 h-4 text-primary" />
              <span>Item #{index + 1}</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-primary mb-1">
              ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-fourth">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Quantity</p>
            <p className="text-base font-semibold text-secondary">{item.quantity}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Unit Price</p>
            <p className="text-base font-semibold text-secondary">₹{item.unitPrice.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Discount</p>
            <p className="text-base font-semibold text-secondary">{item.discount}%</p>
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
    <div className="min-h-screen bg-tertiary">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/quotations')}
              className="p-2 rounded-lg hover:bg-fourth text-secondary transition-colors touch-target"
              aria-label="Back to quotations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-secondary">
                Sales Quotation
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-sm text-gray-600">
                  Ref. No. – {quotation.quotationNumber}
                </p>
                <span className="text-gray-300">•</span>
                <p className="text-sm text-gray-600">
                  {new Date(quotation.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          </div>
          
          {/* Status Badge and Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <span className={getStatusBadgeClass(quotation.status)}>
              {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
              {isSendingQuotation && quotation.status === 'draft' && ' (Sending...)'}
            </span>
            
            {(quotation.status === 'draft' || isSendingQuotation) && (
              <>
                <button
                  onClick={() => navigate(`/dashboard/quotations/${id}/edit`)}
                  className="px-4 py-2.5 border border-fourth text-secondary rounded-lg text-sm font-medium hover:bg-fourth transition-colors duration-150 ease-in-out flex items-center justify-center gap-2 touch-target"
                  disabled={isSendingQuotation}
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setConfirmAction(() => handleSendQuotation);
                    setConfirmActionType('send');
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
                  setConfirmActionType('approve');
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



        {/* Main Content Card */}
        <div className="bg-tertiary rounded-xl border border-fourth shadow-sm overflow-hidden">
          {/* Title Section */}
          <div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-fourth">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-secondary tracking-wide">QUOTATION #{quotation.quotationNumber}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Professional quotation for your solar energy requirements
                </p>
              </div>
              <div className="text-sm text-gray-600 sm:text-right">
                <p className="font-medium">Valid until:</p>
                <p className="text-lg font-semibold text-primary">
                  {new Date(quotation.validUntil).toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          </div>
          
          {/* Lead Information Section */}
          <div className="p-6 border-b border-fourth">
            <h3 className="text-xl font-semibold text-secondary mb-6 border-b border-fourth pb-2">
              Lead Information
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Billing Information */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">To:</h4>
                  <div className="space-y-2">
                    <p className="text-base font-medium text-secondary">
                      {quotation.lead.firstName} {quotation.lead.lastName}
                    </p>
                    {quotation.lead.businessName && (
                      <p className="text-gray-700">{quotation.lead.businessName}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">Billing Address:</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {quotation.lead.billingAddress || quotation.lead.address || 'No billing address provided'}
                  </p>
                </div>
                
                {quotation.lead.shippingAddress && (
                  <div>
                    <h4 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">Shipping Address:</h4>
                    <p className="text-gray-700 leading-relaxed">{quotation.lead.shippingAddress}</p>
                  </div>
                )}
              </div>
              
              {/* Right Column - Contact Information */}
              <div className="space-y-6">
                {quotation.lead.email && (
                  <div>
                    <h4 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">Email:</h4>
                    <p className="text-gray-700 break-all">{quotation.lead.email}</p>
                  </div>
                )}
                
                {quotation.lead.phone && (
                  <div>
                    <h4 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">Phone:</h4>
                    <p className="text-gray-700">{quotation.lead.countryCode} {quotation.lead.phone}</p>
                  </div>
                )}
                
                {quotation.lead.whatsapp && (
                  <div>
                    <h4 className="text-sm font-semibold text-secondary mb-3 uppercase tracking-wider">WhatsApp:</h4>
                    <p className="text-gray-700">{quotation.lead.countryCode} {quotation.lead.whatsapp}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Professional Salutation */}
          <div className="p-6 border-b border-fourth bg-gray-50">
            <div className="space-y-4 text-gray-700">
              <p className="text-base">Dear Sir/Madam,</p>
              <p className="text-base leading-relaxed">
                Thank you very much for the keen interest shown by you in our Solar Products. 
                We are pleased to enclose herewith the detailed quotation for your consideration.
              </p>
            </div>
          </div>

          {/* Quotation Items Summary Table */}
          <div className="p-6 border-b border-fourth">
            <h3 className="text-xl font-semibold text-secondary mb-6 border-b border-fourth pb-2">
              Quotation Summary
            </h3>
            
            {/* Desktop/Tablet Table View */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto rounded-lg border border-gray-300">
                <table className="min-w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-secondary">Product</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-secondary">Quantity</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-secondary">Unit Price</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-secondary">Discount</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-secondary">Total Amount</th>
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
                        productName = `${item.bundleId.name} (System)`;
                      } else if (productObj?.name) {
                        productName = productObj.name;
                      }
                      
                      const total = item.quantity * item.unitPrice * (1 - item.discount/100);
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-secondary">{productName}</div>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-700">{item.quantity}</td>
                          <td className="px-6 py-4 text-right text-sm text-gray-700">
                            ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-700">{item.discount}%</td>
                          <td className="px-6 py-4 text-right font-semibold text-secondary">
                            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-6 py-4 text-right" colSpan="4">
                        <span className="text-lg text-secondary">TOTAL AMOUNT</span>
                      </td>
                      <td className="px-6 py-4 text-right text-lg text-primary">
                        ₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="lg:hidden space-y-4">
              {quotation.quotationItems?.map((item, index) => (
                <ItemCard key={index} item={item} index={index} />
              ))}
              
              {/* Mobile Total */}
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-secondary">Total Amount</span>
                  <span className="text-lg font-bold text-primary">
                    ₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information Section */}
          {quotation.advancePaymentPercentage > 0 && (
            <div className="p-6 border-b border-fourth">
              <h3 className="text-xl font-semibold text-secondary mb-6 border-b border-fourth pb-2">
                Payment Information
              </h3>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-primary mt-1" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-secondary mb-2">Advance Payment Required</h4>
                    <div className="space-y-2">
                      <p className="text-gray-700">
                        <span className="font-medium">Payment Amount:</span> {quotation.advancePaymentPercentage}% of total amount
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        ₹{((quotation.total * quotation.advancePaymentPercentage / 100) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      {quotation.status === 'sent' && (
                        <p className="text-sm text-orange-700 mt-3 p-3 bg-orange-100 rounded">
                          <strong>Note:</strong> This advance payment must be completed before the quotation can be approved and processed further.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terms and Conditions Section */}
          <div className="p-6">
            <h3 className="text-xl font-semibold text-secondary mb-6 border-b border-fourth pb-2">
              Terms & Conditions
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-medium text-secondary mb-4">Terms & Conditions</h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {quotation.terms || 'Standard terms and conditions apply. Please contact us for detailed terms.'}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-secondary mb-4">Additional Notes</h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {quotation.notes || 'For any technical queries or customization requirements, please feel free to contact our technical team.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Footer */}
          <div className="p-6 bg-gray-50 border-t border-fourth">
            <div className="text-right">
              <p className="text-base text-secondary mb-2">For Sunlit Solar</p>
              <p className="text-base font-medium text-secondary">Authorized Signatory</p>
            </div>
          </div>
        </div>

        {/* Email timing display */}
        {emailSentTime && (
          <div className="text-center text-sm text-gray-500 mt-6 p-4 bg-tertiary rounded-lg border border-fourth">
            Email sent in {(emailSentTime / 1000).toFixed(2)} seconds.
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setConfirmAction(null);
          setConfirmActionType(null);
        }}
        onConfirm={() => {
          confirmAction?.();
          setShowConfirmDialog(false);
          setConfirmAction(null);
          setConfirmActionType(null);
        }}
        title={
          confirmActionType === 'send'
            ? "Send Quotation"
            : "Approve Quotation"
        }
        message={
          confirmActionType === 'send'
            ? "Are you sure you want to send this quotation to the lead? This action cannot be undone."
            : "Are you sure you want to approve this quotation? This may create related records and change its status."
        }
        confirmText={confirmActionType === 'send' ? "Yes, Send" : "Yes, Approve"}
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
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
  Mail
} from 'lucide-react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Toast from '../../../components/Toast';

export default function QuotationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [emailSentTime, setEmailSentTime] = useState(null);
  const [ws, setWs] = useState(null);
  const startTime = useRef(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = new WebSocket(`ws://set-crm-main-for-netli.onrender.com?token=Bearer ${token}`);
    
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
                fetchQuotation();
                const endTime = Date.now();
                setEmailSentTime(endTime - startTime.current);
                setToastMessage('Quotation sent successfully!');
                setShowToast(true);
                setIsSending(false);
              } else if (data.status === 'draft') {
                setIsSending(false);
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
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [id]);

  const fetchQuotation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/quotations/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        console.log('Quotation data:', data.data);
        setQuotation(data.data);
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuotation = async () => {
    try {
      setIsSending(true);
      startTime.current = Date.now();
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/quotations/${id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error sending quotation:', error);
      alert('Failed to send quotation: ' + error.message);
      setIsSending(false);
    }
  };

  const handleApproveQuotation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/quotations/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        fetchQuotation();
      }
    } catch (error) {
      console.error('Error approving quotation:', error);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://set-crm-main-for-netli.onrender.com/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quotationId: id })
      });
      const data = await response.json();
      if (data.success) {
        navigate(`/dashboard/invoices/${data.data._id}`);
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      draft: 'bg-gray-100 text-gray-800',
      sending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-yellow-100 text-yellow-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!quotation) {
    return <div>Quotation not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/quotations')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Quotation #{quotation.quotationNumber}
            </h2>
            <p className="text-muted-foreground">
              Created on {new Date(quotation.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(quotation.status === 'draft' || isSending) && (
            <>
              <button
                onClick={() => navigate(`/dashboard/quotations/${id}/edit`)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isSending}
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  setConfirmAction(() => handleSendQuotation);
                  setShowConfirmDialog(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 ${
                  isSending ? 'opacity-75 cursor-not-allowed' : ''
                }`}
                disabled={isSending}
              >
                {isSending ? (
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
          {quotation.status === 'sent' && !isSending && (
            <>
              <button
                onClick={() => {
                  setConfirmAction(() => handleApproveQuotation);
                  setShowConfirmDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Check className="h-4 w-4" />
                Approve
              </button>
            </>
          )}
          {quotation.status === 'approved' && (
            <button
              onClick={handleGenerateInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <FileText className="h-4 w-4" />
              Generate Invoice
            </button>
          )}
        </div>
      </div>

      {/* Quotation Details */}
      <div className="bg-white rounded-lg border p-6 space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(quotation.status)}`}>
            {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
          </span>
          <span className="text-sm text-gray-500">
            Valid until: {new Date(quotation.validUntil).toLocaleDateString()}
          </span>
        </div>

        {/* Lead Information */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-2">Lead Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p>{quotation.lead.firstName} {quotation.lead.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">businessName</p>
              <p>{quotation.lead.businessName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p>{quotation.lead.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p>{quotation.lead.phone}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-4">Items</h3>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="pb-2">Product</th>
                <th className="pb-2">Quantity</th>
                <th className="pb-2">Unit Price</th>
                <th className="pb-2">Discount</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotation.items.map((item, index) => {
                const total = item.quantity * item.unitPrice * (1 - item.discount/100);
                return (
                  <tr key={index}>
                    <td className="py-2">
                      {item.product ? item.product.name : 'Product Name Not Available'}
                    </td>
                    <td>{item.quantity}</td>
                    <td>${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td>{item.discount}%</td>
                    <td className="text-right">
                      ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t">
              <tr>
                <td colSpan="4" className="py-2 text-right font-medium">Subtotal</td>
                <td className="py-2 text-right">
                  ${quotation.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td colSpan="4" className="py-2 text-right font-medium">Tax (18%)</td>
                <td className="py-2 text-right">
                  ${quotation.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="font-bold">
                <td colSpan="4" className="py-2 text-right">Total</td>
                <td className="py-2 text-right">
                  ${quotation.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Terms and Notes */}
        <div className="border-t pt-4 grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Terms</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{quotation.terms}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Notes</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{quotation.notes}</p>
          </div>
        </div>
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
            : "Are you sure you want to approve this quotation? This will create a customer account for the lead."
        }
      />

      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
        />
      )}

      {emailSentTime && (
        <div className="text-sm text-gray-500 mt-2">
          Email sent in {(emailSentTime / 1000).toFixed(2)} seconds
        </div>
      )}
    </div>
  );
} 
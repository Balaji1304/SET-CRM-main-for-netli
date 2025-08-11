import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, Package, User, MapPin, Calendar, CreditCard, Download, Printer, Home, Building, Mail, Phone, Hash, UserCircle, Share2 } from 'lucide-react';
import { getInvoiceByPurchaseId } from '../../../services/invoiceService';
import html2pdf from 'html2pdf.js';
import { useAuth } from '../../../context/AuthContext';

// Helper to get nested properties safely
const getSafe = (fn, defaultValue = 'N/A') => {
  try {
    const value = fn();
    return value === undefined || value === null || value === '' ? defaultValue : value;
  } catch (e) {
    return defaultValue;
  }
};

export default function InvoicePage() {
  const { id: customerPurchaseId } = useParams();
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const invoiceContentRef = useRef(null);

  useEffect(() => {
    fetchInvoiceDetailsByPurchaseId();
  }, [customerPurchaseId]);

  const fetchInvoiceDetailsByPurchaseId = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login?returnUrl=/invoice/' + customerPurchaseId);
        throw new Error('No authentication token found. Please login.');
      }
      const response = await getInvoiceByPurchaseId(customerPurchaseId);

      if (response.success && response.data) {
        setInvoiceData(response.data);
      } else {
        throw new Error(response.message || 'Failed to fetch invoice details. Invoice may not exist or you may not have permission.');
      }
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!invoiceContentRef.current || !invoiceData) return;
    const opt = {
      margin: [0.2, 0.2, 0.2, 0.2],
      filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, width: invoiceContentRef.current.scrollWidth, windowWidth: invoiceContentRef.current.scrollWidth },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().from(invoiceContentRef.current).set(opt).save();
  };

  const generatePdfAsFile = async () => {
    if (!invoiceContentRef.current || !invoiceData) return null;
    const opt = {
      margin: [0.2, 0.2, 0.2, 0.2],
      filename: `invoice-${getSafe(() => invoiceData.invoiceNumber)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, width: invoiceContentRef.current.scrollWidth, windowWidth: invoiceContentRef.current.scrollWidth },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    try {
      const pdfBlob = await html2pdf().from(invoiceContentRef.current).set(opt).outputPdf('blob');
      return new File([pdfBlob], `invoice-${getSafe(() => invoiceData.invoiceNumber)}.pdf`, { type: 'application/pdf' });
    } catch (err) {
      console.error("Error generating PDF for sharing:", err);
      setError("Could not generate PDF for sharing. Please try downloading.");
      return null;
    }
  };

  const handleShareInvoice = async () => {
    if (!invoiceData) {
      setError('Invoice data not available for sharing.');
      return;
    }
    setIsSharing(true);
    try {
      const pdfFile = await generatePdfAsFile();
      const shareData = {
        title: `Invoice ${getSafe(() => invoiceData.invoiceNumber)}`,
        text: `Invoice ${getSafe(() => invoiceData.invoiceNumber)} from ${getSafe(() => invoiceData.companyDetails.name)}. View online: ${window.location.href}`,
        url: window.location.href,
      };

      let canShareFiles = false;
      if (pdfFile && navigator.canShare) {
        canShareFiles = navigator.canShare({ files: [pdfFile] });
      }

      if (navigator.share) {
        if (pdfFile && canShareFiles) {
          shareData.files = [pdfFile];
        } else if (pdfFile) {
          console.log("File sharing not fully supported, sharing text/URL.");
          // Optionally inform the user that PDF could not be attached to share sheet
        }
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(window.location.href);
        alert('Share API not supported. Invoice link copied to clipboard!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') { // AbortError means user cancelled
        console.error('Error sharing invoice:', err);
        setError(`Could not share invoice: ${err.message}. You can try copying the link.`);
      }
    } finally {
      setIsSharing(false);
    }
  };

  const printInvoice = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500"></div>
        <p className="ml-4 text-lg font-medium text-gray-700">Loading Invoice...</p>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 mb-2">Error Loading Invoice</h2>
        <p className="text-gray-600 mb-6 max-w-md">{error || 'Invoice data could not be loaded. It might not exist, or you might not have permission to view it.'}</p>
        <button
          onClick={() => navigate('/dashboard/my-products')}
          className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors flex items-center gap-2"
        >
          <Home className="h-5 w-5" /> Go to My Products
        </button>
      </div>
    );
  }

  const { 
    invoiceNumber,
    issueDate,
    companyDetails,
    customerDetails,
    items,
    totalAmount,
    paidAmount,
    paymentStatus,
    notes,
    quotation,
    customerPurchase
  } = invoiceData;

  return (
    <div className="bg-gray-100 min-h-screen p-4 md:p-8 print:p-0">
      <div className="max-w-4xl mx-auto mb-6 print:hidden flex flex-wrap justify-between items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Invoice <span className="text-orange-600">#{getSafe(() => invoiceNumber)}</span></h1>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={printInvoice}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2 transition-colors"
          >
            <Printer className="h-5 w-5" /> Print
          </button>
          <button
            onClick={downloadPDF}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2 transition-colors"
          >
            <Download className="h-5 w-5" /> Download PDF
          </button>
          <button
            onClick={handleShareInvoice}
            disabled={isSharing}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSharing ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span> Sharing...
              </>
            ) : (
              <>
                <Share2 className="h-5 w-5" /> Share
              </>
            )}
          </button>
        </div>
      </div>

      <div ref={invoiceContentRef} id="invoice-content" className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-6 md:p-10 print:shadow-none print:rounded-none">
        <div className="flex flex-col sm:flex-row justify-between items-start pb-6 mb-6 border-b-2 border-gray-200">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            {getSafe(() => companyDetails.logoUrl) !== 'N/A' && (
                <img src={getSafe(() => companyDetails.logoUrl)} alt="Company Logo" className="h-16 w-auto max-h-20 object-contain" />
            )}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{getSafe(() => companyDetails.name)}</h2>
              <p className="text-sm text-gray-500 whitespace-pre-line">{getSafe(() => companyDetails.address)}</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-3xl md:text-4xl font-bold text-orange-600 uppercase">Invoice</h3>
            <p className="text-gray-600 flex items-center justify-end"><Hash className="h-4 w-4 mr-1"/> {getSafe(() => invoiceNumber)}</p>
            <p className="text-gray-600 flex items-center justify-end"><Calendar className="h-4 w-4 mr-1"/> Issued: {formatDate(getSafe(() => issueDate))}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-700 mb-2 flex items-center"><Building className="h-5 w-5 mr-2 text-orange-500"/>From:</h4>
            <p className="font-bold text-gray-800">{getSafe(() => companyDetails.name)}</p>
            <p className="text-sm text-gray-600 whitespace-pre-line">{getSafe(() => companyDetails.address)}</p>
            {getSafe(() => companyDetails.phone) !== 'N/A' && <p className="text-sm text-gray-600 flex items-center"><Phone className="h-3 w-3 mr-1.5"/> {getSafe(() => companyDetails.phone)}</p>}
            {getSafe(() => companyDetails.email) !== 'N/A' && <p className="text-sm text-gray-600 flex items-center"><Mail className="h-3 w-3 mr-1.5"/> {getSafe(() => companyDetails.email)}</p>}
            {getSafe(() => companyDetails.taxId) !== 'N/A' && <p className="text-sm text-gray-600">Tax ID: {getSafe(() => companyDetails.taxId)}</p>}
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-gray-700 mb-2 flex items-center"><UserCircle className="h-5 w-5 mr-2 text-orange-500"/>Bill To:</h4>
            <p className="font-bold text-gray-800">{getSafe(() => customerDetails.name) !== 'N/A' ? getSafe(() => customerDetails.name) : 'Customer'}</p>
            <p className="text-sm text-gray-600 whitespace-pre-line">{getSafe(() => customerDetails.billingAddress)}</p>
            {getSafe(() => customerDetails.phone) !== 'N/A' && <p className="text-sm text-gray-600 flex items-center"><Phone className="h-3 w-3 mr-1.5"/>Phone: {getSafe(() => customerDetails.phone)}</p>}
            {getSafe(() => customerDetails.email) !== 'N/A' && <p className="text-sm text-gray-600 flex items-center"><Mail className="h-3 w-3 mr-1.5"/>Email: {getSafe(() => customerDetails.email)}</p>}
          </div>
        </div>

        <div className="mb-8">
          <h4 className="text-xl font-semibold text-gray-700 mb-3">Order Summary</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-orange-500 text-white">
                  <th className="p-3 font-semibold text-sm">#</th>
                  <th className="p-3 font-semibold text-sm">Product</th>
                  <th className="p-3 font-semibold text-sm text-right">Qty</th>
                  <th className="p-3 font-semibold text-sm text-right">Unit Price</th>
                  <th className="p-3 font-semibold text-sm text-right">Discount</th>
                  <th className="p-3 font-semibold text-sm text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {getSafe(() => items, []).map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-700">{index + 1}</td>
                    <td className="p-3 text-sm text-gray-700">
                      <p className="font-medium">{getSafe(() => item.name)}</p>
                    </td>
                    <td className="p-3 text-sm text-gray-700 text-right">{getSafe(() => item.quantity)}</td>
                    <td className="p-3 text-sm text-gray-700 text-right">{formatCurrency(getSafe(() => item.unitPrice, 0))}</td>
                    <td className="p-3 text-sm text-gray-700 text-right">{getSafe(() => item.discountPercentage, 0)}%</td>
                    <td className="p-3 text-sm text-gray-700 text-right font-medium">{formatCurrency(getSafe(() => item.itemTotal, 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end items-start mb-8">
          <div className="w-full sm:w-1/2 md:w-2/5 lg:w-1/3 space-y-2">
            <div className="flex justify-between text-gray-900 font-bold text-lg">
              <span>Total Amount:</span>
              <span>{formatCurrency(getSafe(() => totalAmount, 0))}</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold">
              <span>Amount Paid:</span>
              <span>{formatCurrency(getSafe(() => paidAmount, 0))}</span>
            </div>
            <div className="flex justify-between text-gray-700 font-semibold">
                <span>Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-sm ${getSafe(() => paymentStatus) === 'PAID' || getSafe(() => totalAmount) <= getSafe(() => paidAmount) ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {getSafe(() => paymentStatus) === 'PAID' || getSafe(() => totalAmount) <= getSafe(() => paidAmount) ? 'PAID' : getSafe(() => paymentStatus, 'N/A').toUpperCase()}
                </span>
            </div>
          </div>
        </div>

        {getSafe(() => notes) !== 'N/A' && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-md font-semibold text-gray-700 mb-2">Notes:</h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">{getSafe(() => notes)}</p>
          </div>
        )}
        
        <div className="border-t-2 border-gray-200 pt-6 text-sm text-gray-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <p><strong>Quotation Ref:</strong> {getSafe(() => quotation?.quotationNumber, 'N/A')}</p>
                    <p><strong>Purchase ID:</strong> {getSafe(() => customerPurchase?.purchaseID, 'N/A')}</p>
                    <p><strong>Purchase Date:</strong> {formatDate(getSafe(() => customerPurchase?.purchaseDate, null))}</p>
                </div>
                 <div className="md:text-right">
                    <p>Thank you for your business!</p>
                    <p>{getSafe(() => companyDetails.name)}</p>
                </div>
            </div>
          <div className="text-center">
            <p className="text-xs mt-4">
              Invoice generated by {getSafe(() => companyDetails.name)} CRM System.
            </p>
            <p className="text-xs mt-1">
              For questions, contact {getSafe(() => companyDetails.email)} or {getSafe(() => companyDetails.phone)}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = `
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    margin: 0;
    padding: 0;
  }
  .print\:hidden {
    display: none !important;
  }
  .print\:p-0 {
    padding: 0 !important;
  }
   .print\:shadow-none {
    box-shadow: none !important;
  }
  .print\:rounded-none {
    border-radius: 0 !important;
  }
}
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet); 
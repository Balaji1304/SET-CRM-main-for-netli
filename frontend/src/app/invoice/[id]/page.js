import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, Package, User, MapPin, Calendar, CreditCard, Download, Printer, Home, Building, Mail, Phone, Hash, UserCircle, Share2, ArrowLeft } from 'lucide-react';
import { getInvoiceByPurchaseId } from '../../../services/invoiceService';
import html2pdf from 'html2pdf.js';
import { useAuth } from '../../../context/AuthContext';

// Custom styles for mobile responsive design - only applies to mobile screens
const customStyles = `
  /* Mobile-only styles that don't interfere with desktop A4 layout */
  @media (max-width: 640px) {
    .mobile-action-compact {
      min-height: 40px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
    }
    
    .mobile-action-buttons {
      gap: 6px !important;
    }
    
    .mobile-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    
    .touch-target {
      min-height: 44px;
      padding: 12px 16px;
    }
    
    /* Header mobile improvements */
    .bg-white.rounded-lg.shadow-sm {
      margin: 0 -4px;
    }
    
    /* Back button mobile styling */
    .back-button-mobile {
      min-height: 44px !important;
      min-width: 44px !important;
    }
    
    /* Invoice content mobile adjustments */
    #invoice-content {
      padding: 12px !important;
    }
    
    /* Header adjustments for mobile */
    #invoice-content .flex.flex-col.sm\\:flex-row {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 16px;
    }
    
    #invoice-content .text-right {
      text-align: left !important;
      width: 100%;
    }
    
    /* Billing cards mobile adjustments */
    #invoice-content .bg-gray-50 {
      padding: 12px !important;
    }
    
    #invoice-content .grid.grid-cols-1.md\\:grid-cols-2 {
      gap: 16px !important;
      margin-bottom: 24px !important;
    }
    
    /* Table mobile adjustments */
    #invoice-content .overflow-x-auto {
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      scrollbar-color: #CBD5E0 #F7FAFC;
    }
    
    #invoice-content .overflow-x-auto::-webkit-scrollbar {
      height: 6px;
    }
    
    #invoice-content .overflow-x-auto::-webkit-scrollbar-track {
      background: #F7FAFC;
      border-radius: 3px;
    }
    
    #invoice-content .overflow-x-auto::-webkit-scrollbar-thumb {
      background: #CBD5E0;
      border-radius: 3px;
    }
    
    #invoice-content .overflow-x-auto::-webkit-scrollbar-thumb:hover {
      background: #A0AEC0;
    }
    
    #invoice-content .overflow-x-auto table {
      min-width: 700px !important;
      border-collapse: collapse;
    }
    
    #invoice-content table th {
      padding: 10px 8px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      white-space: nowrap;
      background-color: #EA580C !important;
    }
    
    #invoice-content table td {
      padding: 10px 8px !important;
      font-size: 11px !important;
      white-space: nowrap;
      border-bottom: 1px solid #E5E7EB;
    }
    
    #invoice-content table td:nth-child(2) {
      min-width: 200px;
      max-width: 250px;
      white-space: normal !important;
      word-wrap: break-word;
    }
    
    /* Payment summary mobile adjustments */
    #invoice-content .space-y-2 div {
      font-size: 14px !important;
    }
  }
  
  /* Extra small screens */
  @media (max-width: 480px) {
    .mobile-action-compact {
      min-height: 36px !important;
      font-size: 11px !important;
      padding: 8px 6px !important;
    }
    
    .mobile-action-buttons {
      gap: 4px !important;
    }
    
    /* Hide text on very small screens, show only icons */
    .mobile-action-compact .hidden.xs\\:inline {
      display: none !important;
    }
    
    #invoice-content {
      padding: 8px !important;
    }
    
    #invoice-content .bg-gray-50 {
      padding: 8px !important;
    }
    
    #invoice-content .overflow-x-auto table {
      min-width: 650px !important;
    }
    
    #invoice-content table th {
      padding: 8px 6px !important;
      font-size: 10px !important;
    }
    
    #invoice-content table td {
      padding: 8px 6px !important;
      font-size: 10px !important;
    }
    
    #invoice-content table td:nth-child(2) {
      min-width: 180px;
      max-width: 200px;
    }
  }
  
  /* Very small screens */
  @media (max-width: 375px) {
    .mobile-action-compact {
      min-height: 32px !important;
      padding: 6px 4px !important;
      font-size: 10px !important;
    }
    
    .mobile-action-buttons {
      gap: 3px !important;
    }
    
    /* Ensure buttons remain readable on very small screens */
    .bg-white.rounded-lg.shadow-sm {
      padding: 12px !important;
    }
    
    #invoice-content .overflow-x-auto table {
      min-width: 600px !important;
    }
    
    #invoice-content table th {
      padding: 6px 4px !important;
      font-size: 9px !important;
    }
    
    #invoice-content table td {
      padding: 6px 4px !important;
      font-size: 9px !important;
    }
    
    #invoice-content table td:nth-child(2) {
      min-width: 160px;
      max-width: 180px;
    }
  }
  
  /* Line clamping utility classes */
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

// Helper to get nested properties safely
const getSafe = (fn, defaultValue = 'N/A') => {
  try {
    const value = fn();
    return value === undefined || value === null || value === '' ? defaultValue : value;
  } catch (e) {
    return defaultValue;
  }
};

export default function ProformaInvoicePage() {
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
    
    // Temporarily disable mobile styles for PDF generation
    const styleElement = document.querySelector('style');
    const originalDisplay = styleElement ? styleElement.style.display : '';
    if (styleElement) styleElement.style.display = 'none';
    
    // Force desktop width for PDF generation
    const element = invoiceContentRef.current;
    const originalWidth = element.style.width;
    const originalMinWidth = element.style.minWidth;
    element.style.width = '800px';
    element.style.minWidth = '800px';
    
    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: `proforma-invoice-${invoiceData.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 1.5, 
        useCORS: true, 
        width: 800,
        windowWidth: 800,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().from(element).set(opt).save().then(() => {
      // Restore original styles after PDF generation
      if (styleElement) styleElement.style.display = originalDisplay;
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
    }).catch(() => {
      // Restore styles even if PDF generation fails
      if (styleElement) styleElement.style.display = originalDisplay;
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
    });
  };

  const generatePdfAsFile = async () => {
    if (!invoiceContentRef.current || !invoiceData) return null;
    
    // Temporarily disable mobile styles for PDF generation
    const styleElement = document.querySelector('style');
    const originalDisplay = styleElement ? styleElement.style.display : '';
    if (styleElement) styleElement.style.display = 'none';
    
    // Force desktop width for PDF generation
    const element = invoiceContentRef.current;
    const originalWidth = element.style.width;
    const originalMinWidth = element.style.minWidth;
    element.style.width = '800px';
    element.style.minWidth = '800px';
    
    const opt = {
      margin: [0.3, 0.3, 0.3, 0.3],
      filename: `proforma-invoice-${getSafe(() => invoiceData.invoiceNumber)}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 1.5, 
        useCORS: true, 
        width: 800,
        windowWidth: 800,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    try {
      const pdfBlob = await html2pdf().from(element).set(opt).outputPdf('blob');
      
      // Restore original styles after PDF generation
      if (styleElement) styleElement.style.display = originalDisplay;
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
      
      return new File([pdfBlob], `proforma-invoice-${getSafe(() => invoiceData.invoiceNumber)}.pdf`, { type: 'application/pdf' });
    } catch (err) {
      // Restore styles even if PDF generation fails
      if (styleElement) styleElement.style.display = originalDisplay;
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
      
      console.error("Error generating PDF for sharing:", err);
      setError("Could not generate PDF for sharing. Please try downloading.");
      return null;
    }
  };

  const handleShareInvoice = async () => {
    if (!invoiceData) {
      setError('Proforma Invoice data not available for sharing.');
      return;
    }
    setIsSharing(true);
    try {
      const pdfFile = await generatePdfAsFile();
      const shareData = {
        title: `Proforma Invoice ${getSafe(() => invoiceData.invoiceNumber)}`,
        text: `Proforma Invoice ${getSafe(() => invoiceData.invoiceNumber)} from ${getSafe(() => invoiceData.companyDetails.name)}. View online: ${window.location.href}`,
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
        alert('Share API not supported. Proforma Invoice link copied to clipboard!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') { // AbortError means user cancelled
        console.error('Error sharing proforma invoice:', err);
        setError(`Could not share proforma invoice: ${err.message}. You can try copying the link.`);
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
        <p className="ml-4 text-lg font-medium text-gray-700">Loading Proforma Invoice...</p>
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 mb-2">Error Loading Proforma Invoice</h2>
        <p className="text-gray-600 mb-6 max-w-md">{error || 'Proforma Invoice data could not be loaded. It might not exist, or you might not have permission to view it.'}</p>
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
      <style>{customStyles}</style>
      <div className="max-w-4xl mx-auto mb-4 sm:mb-6 print:hidden">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-0 sm:bg-transparent sm:shadow-none sm:border-none">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate('/dashboard/my-products')}
                className="back-button-mobile flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
                aria-label="Back to My Orders"
              >
                <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4 text-gray-600" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800 mobile-truncate leading-tight">
                  Proforma Invoice
                </h1>
                <p className="text-sm sm:text-base text-orange-600 font-semibold mt-1 sm:mt-0 sm:inline sm:ml-2">
                  #{getSafe(() => invoiceNumber)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mobile-action-buttons flex-shrink-0">
              <button
                onClick={printInvoice}
                className="mobile-action-compact flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-1 sm:gap-2 transition-colors text-sm sm:text-base"
              >
                <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline sm:inline">Print</span>
              </button>
              <button
                onClick={downloadPDF}
                className="mobile-action-compact flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center gap-1 sm:gap-2 transition-colors text-sm sm:text-base"
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden xs:inline sm:inline">PDF</span>
              </button>
              <button
                onClick={handleShareInvoice}
                disabled={isSharing}
                className="mobile-action-compact flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center justify-center gap-1 sm:gap-2 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                {isSharing ? (
                  <>
                    <span className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-t-2 border-b-2 border-white"></span>
                    <span className="hidden xs:inline sm:inline">...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden xs:inline sm:inline">Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div ref={invoiceContentRef} id="invoice-content" className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-6 md:p-10 print:shadow-none print:rounded-none">
        <div className="flex flex-col sm:flex-row justify-between items-start pb-6 mb-6 border-b-2 border-gray-200">
          <div className="flex items-start gap-4 mb-4 sm:mb-0 flex-1">
            {getSafe(() => companyDetails.logoUrl) !== 'N/A' && (
                <img src={getSafe(() => companyDetails.logoUrl)} alt="Company Logo" className="h-12 w-auto max-h-16 object-contain flex-shrink-0" />
            )}
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-1">{getSafe(() => companyDetails.name)}</h2>
              <p className="text-xs md:text-sm text-gray-500 whitespace-pre-line leading-tight">{getSafe(() => companyDetails.address)}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <h3 className="text-lg md:text-xl font-bold text-orange-600 uppercase mb-2 tracking-wide">Proforma Invoice</h3>
            <div className="space-y-1">
              <p className="text-gray-600 text-xs md:text-sm"><span className="font-medium">No:</span> {getSafe(() => invoiceNumber)}</p>
              <p className="text-gray-600 text-xs md:text-sm"><span className="font-medium">Issued:</span> {formatDate(getSafe(() => issueDate))}</p>
            </div>
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
          <div className="block sm:hidden text-xs text-gray-500 mb-2 flex items-center">
            <span>← Scroll horizontally to view all columns →</span>
          </div>
          <div className="overflow-x-auto relative">
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
              <strong>Note:</strong> This is a Proforma Invoice for reference only. Official invoice will be provided separately.
            </p>
            <p className="text-xs mt-2">
              Proforma Invoice generated by {getSafe(() => companyDetails.name)} CRM System.
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
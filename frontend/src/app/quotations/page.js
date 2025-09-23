import { useState, useEffect } from 'react';
import { Search, ChevronDown, Plus, Filter, RotateCcw } from 'lucide-react';
import QuotationsTable from './QuotationsTable';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSalespersons } from '../../services/enquiryService';
import ExportButton from '../../components/ExportButton';
import { exportQuotations } from '../../services/quotationService';
import { downloadCSV } from '../../utils/csv';

export default function QuotationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [amountFilter, setAmountFilter] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [salesPersons, setSalesPersons] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exportLoading, setExportLoading] = useState(false);

  const isSalesHead = user?.role === 'sales_head' || user?.role === 'marketing_coordinator' || user?.role === 'admin';

  // Fetch sales persons for creator filter
  useEffect(() => {
    if (isSalesHead) {
      const fetchSalesPersons = async () => {
        try {
          const response = await getSalespersons();
          if (response.success) {
            setSalesPersons(response.data);
          }
        } catch (error) {
          console.error('Failed to fetch sales persons:', error);
        }
      };
      fetchSalesPersons();
    }
  }, [isSalesHead]);

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSortOrder('newest');
    setPaymentStatusFilter('');
    setAmountFilter('');
    setCreatorFilter('');
    setExpiryFilter('');
    setPaymentMethodFilter('');
    setShowFilters(false);
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await exportQuotations();
      if (response.success) {
        downloadCSV(response.data, 'quotations');
      } else {
        console.error('Failed to export quotations:', response.message);
      }
    } catch (error) {
      console.error('Error exporting quotations:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Count active filters
  const activeFilterCount = [
    statusFilter,
    paymentStatusFilter,
    amountFilter,
    ...(isSalesHead ? [creatorFilter] : []),
    expiryFilter,
    paymentMethodFilter
  ].filter(filter => filter && filter !== '').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header Section - Page Title */}
      <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary mobile-truncate">Quotations Management</h1>
          {user?.role === 'admin' && <ExportButton onExport={handleExport} loading={exportLoading} />}
        </div>
      </div>

      {/* Main Content Area - Contains filters and table */}
      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Filter and Action Bar */}
        <div className="p-4 md:p-6 border-b border-fourth sticky top-0 bg-tertiary z-20">
          {/* Filter Status Indicator */}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                </span>
              </div>
              <button
                onClick={resetFilters}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-150"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Main Controls Row */}
          <div className="flex flex-col gap-3">
            {/* Search and Filter Toggle Row */}
            <div className="flex gap-2 items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search quotations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary placeholder-gray-400"
                />
              </div>
              
              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center justify-center p-2 border rounded-md transition-colors duration-150 ease-in-out ${
                  showFilters || activeFilterCount > 0
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Toggle filters"
              >
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="ml-1 text-xs font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Create Quotation Button - Desktop Position */}
              <button
                onClick={() => navigate('/dashboard/quotations/create')}
                className="hidden sm:inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Quotation
              </button>
            </div>

            {/* Create Quotation Button - Mobile Only */}
            <div className="w-full sm:hidden">
              <button
                onClick={() => navigate('/dashboard/quotations/create')}
                className="inline-flex items-center justify-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Quotation
              </button>
            </div>

            {/* Filters Section - Collapsible */}
            {showFilters && (
              <div className="border-t border-gray-200 pt-3 space-y-3">
                {/* Filter Row 1 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {/* Sort Order */}
                  <div className="relative">
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="amount_high">Amount ↓</option>
                      <option value="amount_low">Amount ↑</option>
                      <option value="expiry_soon">Expiry Soon</option>
                      <option value="expiry_later">Expiry Later</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Status</option>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="pending_approval">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="expired">Expired</option>
                      <option value="closed">Closed</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Payment Status Filter */}
                  <div className="relative">
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Payment</option>
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Amount Range Filter */}
                  <div className="relative">
                    <select
                      value={amountFilter}
                      onChange={(e) => setAmountFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Amount</option>
                      <option value="0-10000">₹0-10K</option>
                      <option value="10000-50000">₹10K-50K</option>
                      <option value="50000-100000">₹50K-1L</option>
                      <option value="100000-500000">₹1L-5L</option>
                      <option value="500000+">₹5L+</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Creator Filter - Only for Sales Head */}
                  {isSalesHead && (
                    <div className="relative">
                      <select
                        value={creatorFilter}
                        onChange={(e) => setCreatorFilter(e.target.value)}
                        className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                      >
                        <option value="">All Creator</option>
                        <option value="others">Others</option>
                        {salesPersons.map((person) => (
                          <option key={person._id} value={person._id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    </div>
                  )}

                  {/* Expiry Status Filter */}
                  <div className="relative">
                    <select
                      value={expiryFilter}
                      onChange={(e) => setExpiryFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Validity</option>
                      <option value="active">Valid</option>
                      <option value="expired">Expired</option>
                      <option value="expiring_soon">Expiring Soon</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>
                </div>

                {/* Filter Row 2 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {/* Payment Method Filter */}
                  <div className="relative">
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Methods</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="razorpay">Razorpay</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <QuotationsTable 
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          sortOrder={sortOrder}
          paymentStatusFilter={paymentStatusFilter}
          amountFilter={amountFilter}
          creatorFilter={creatorFilter}
          expiryFilter={expiryFilter}
          paymentMethodFilter={paymentMethodFilter}
        />
      </div>
    </div>
  );
} 

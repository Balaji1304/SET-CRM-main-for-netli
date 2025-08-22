import { useState, useEffect } from 'react';
import { Search, ChevronDown, Plus, Filter, RotateCcw } from 'lucide-react';
import QuotationsTable from './QuotationsTable';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSalespersons } from '../../services/enquiryService';

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
  const navigate = useNavigate();
  const { user } = useAuth();

  const isSalesHead = user?.role === 'sales_head';

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
      <div className="border-b border-fourth pb-5 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-secondary">Quotations Management</h1>
          {/* <p className="text-sm text-gray-500 mt-1">Create and manage quotations for leads</p> */}
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
          <div className="flex flex-col xl:flex-row gap-3 xl:gap-4 xl:items-center">
            {/* Left Side - Search */}
            <div className="relative xl:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search quotations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary placeholder-gray-400"
              />
            </div>
            
            {/* Center - Filters Group */}
            <div className="flex flex-wrap xl:flex-nowrap gap-2 xl:gap-3 xl:flex-1">
              {/* Sort Order */}
              <div className="relative min-w-[130px] flex-1 xl:flex-initial xl:w-32">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount_high">Amount: High to Low</option>
                  <option value="amount_low">Amount: Low to High</option>
                  <option value="expiry_soon">Expiring Soon</option>
                  <option value="expiry_later">Expiring Later</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative min-w-[100px] flex-1 xl:flex-initial xl:w-28">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                  <option value="closed">Closed</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>

              {/* Payment Status Filter */}
              <div className="relative min-w-[110px] flex-1 xl:flex-initial xl:w-30">
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                >
                  <option value="">All Payments</option>
                  <option value="PENDING">Payment Pending</option>
                  <option value="CONFIRMED">Payment Confirmed</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>

              {/* Amount Range Filter */}
              <div className="relative min-w-[100px] flex-1 xl:flex-initial xl:w-28">
                <select
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                  className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                >
                  <option value="">All Amounts</option>
                  <option value="0-10000">₹0-10K</option>
                  <option value="10000-50000">₹10K-50K</option>
                  <option value="50000-100000">₹50K-1L</option>
                  <option value="100000-500000">₹1L-5L</option>
                  <option value="500000+">₹5L+</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>

              {/* Creator Filter - Only for Sales Head */}
              {isSalesHead && (
                <div className="relative min-w-[100px] flex-1 xl:flex-initial xl:w-24">
                  <select
                    value={creatorFilter}
                    onChange={(e) => setCreatorFilter(e.target.value)}
                    className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                  >
                    <option value="">All Creators</option>
                    <option value="others">Others</option>
                    {salesPersons.map((person) => (
                      <option key={person._id} value={person._id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                </div>
              )}

              {/* Expiry Status Filter */}
              <div className="relative min-w-[100px] flex-1 xl:flex-initial xl:w-24">
                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value)}
                  className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                >
                  <option value="">All Validity</option>
                  <option value="active">Valid</option>
                  <option value="expired">Expired</option>
                  <option value="expiring_soon">Expiring Soon</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>

              {/* Payment Method Filter */}
              <div className="relative min-w-[100px] flex-1 xl:flex-initial xl:w-24">
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                >
                  <option value="">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="other">Other</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>

              {/* Reset Filters Button */}
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center px-3 py-2.5 border border-gray-300 rounded-md text-xs xl:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-150 ease-in-out min-w-[70px] xl:min-w-[80px]"
                  title="Reset all filters"
                >
                  <RotateCcw className="w-3 h-3 xl:w-3.5 xl:h-3.5 mr-1 xl:mr-2" />
                  Reset
                </button>
              )}
            </div>
            
            {/* Right Side - Create Button */}
            <div className="xl:ml-auto">
              <button
                onClick={() => navigate('/dashboard/quotations/create')}
                className="inline-flex items-center justify-center py-2.5 px-4 xl:px-5 border border-transparent shadow-sm text-xs xl:text-sm font-medium rounded-md text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap w-full xl:w-auto"
              >
                <Plus className="h-3.5 w-3.5 xl:h-4 xl:w-4 mr-1.5 xl:mr-2" />
                Create Quotation
              </button>
            </div>
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

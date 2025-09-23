import { useState, useEffect } from 'react';
import { Search, ChevronDown, Filter, RotateCcw, Calendar } from 'lucide-react';
import CustomersTable from './CustomersTable';
import { useAuth } from '../../context/AuthContext';
import { getSalespersons } from '../../services/enquiryService';
import ExportButton from '../../components/ExportButton';
import { exportCustomers } from '../../services/customerService';
import { downloadCSV } from '../../utils/csv';

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState('');
  const [salesPersons, setSalesPersons] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const [exportLoading, setExportLoading] = useState(false);

  // Check if user is sales head or marketing coordinator
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

  const handleExport = async ({ startDate, endDate }) => {
    setExportLoading(true);
    try {
      const response = await exportCustomers({ startDate, endDate });
      if (response.success) {
        downloadCSV(response.data, `customers-${startDate}-to-${endDate}.csv`);
      } else {
        console.error('Failed to export customers:', response.message);
      }
    } catch (error) {
      console.error('An error occurred during customer export:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Function to reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setSortOrder('newest');
    setCustomerTypeFilter('');
    setPurchaseStatusFilter('');
    setShowFilters(false);
    if (isSalesHead) {
      setCreatorFilter('');
    }
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || sortOrder !== 'newest' || 
    customerTypeFilter || purchaseStatusFilter || (isSalesHead && creatorFilter);

  // Count active filters (excluding sort order and search term for display)
  const activeFilterCount = [
    customerTypeFilter, 
    purchaseStatusFilter, 
    ...(isSalesHead ? [creatorFilter] : [])
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header Section - Page Title */}
      <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary">Customers</h1>
          {user?.role === 'admin' && (
            <ExportButton onExport={handleExport} loading={exportLoading} />
          )}
          {/* Optional: Subtitle if needed, can be text-gray-500 */}
          {/* <p className="text-sm text-gray-500 mt-1">Manage and view all customer records.</p> */}
        </div>
      </div>

      {/* Main Content Area - Contains filters and table */}
      {/* This div will have the consistent card styling */}
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
                  placeholder="Search customers..."
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
            </div>

            {/* Filters Section - Collapsible */}
            {showFilters && (
              <div className="border-t border-gray-200 pt-3 space-y-3">
                {/* Filter Row 1 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {/* Sort Order */}
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="pl-6 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Customer Type Filter */}
                  <div className="relative">
                    <select
                      value={customerTypeFilter}
                      onChange={(e) => setCustomerTypeFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Type</option>
                      <option value="end_user">End User</option>
                      <option value="plumber">Plumber</option>
                      <option value="dealer">Dealer</option>
                      <option value="builder">Builder</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Purchase Status Filter */}
                  <div className="relative">
                    <select
                      value={purchaseStatusFilter}
                      onChange={(e) => setPurchaseStatusFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Purchase</option>
                      <option value="has_purchases">Has Purchase</option>
                      <option value="no_purchases">No Purchase</option>
                      <option value="active_purchases">Active</option>
                      <option value="completed_purchases">Completed</option>
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
                </div>
              </div>
            )}
          </div>
        </div>
        <CustomersTable 
          searchTerm={searchTerm}
          sortOrder={sortOrder}
          customerTypeFilter={customerTypeFilter}
          creatorFilter={isSalesHead ? creatorFilter : ''}
          purchaseStatusFilter={purchaseStatusFilter}
        />
      </div>
    </div>
  );
}

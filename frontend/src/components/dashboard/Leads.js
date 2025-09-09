import { useState, useEffect } from 'react';
import { Search, ChevronDown, Plus, Calendar, Filter, RotateCcw } from 'lucide-react';
import LeadsTable from './LeadsTable';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSalespersons } from '../../services/enquiryService';

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [completionFilter, setCompletionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [salesPersons, setSalesPersons] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if user is sales head or marketing coordinator
  const isSalesHead = user?.role === 'sales_head' || user?.role === 'marketing_coordinator';

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

  // Function to reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSortOrder('newest');
    setCompletionFilter('');
    setSourceFilter('');
    setShowFilters(false);
    if (isSalesHead) {
      setCreatorFilter('');
    }
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || statusFilter || sortOrder !== 'newest' || 
    completionFilter || sourceFilter || (isSalesHead && creatorFilter);

  // Count active filters (excluding sort order and search term for display)
  const activeFilterCount = [
    statusFilter, 
    completionFilter, 
    sourceFilter, 
    ...(isSalesHead ? [creatorFilter] : [])
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header Section - Page Title */}
      <div className="border-b border-fourth pb-3 sm:pb-5 mb-4 sm:mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-secondary mobile-truncate">Leads Management</h1>
          {/* Optional: Subtitle if needed, can be text-gray-500 */}
          {/* <p className="text-sm text-gray-500 mt-1">View and manage all your leads in one place.</p> */}
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
                  placeholder="Search leads..."
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

              {/* Add Lead Button - Desktop Position */}
              <button
                onClick={() => navigate('/dashboard/add-lead')}
                className="hidden sm:inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </button>
            </div>

            {/* Add Lead Button - Mobile Only */}
            <div className="w-full sm:hidden">
              <button
                onClick={() => navigate('/dashboard/add-lead')}
                className="inline-flex items-center justify-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
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

                  {/* Status Filter */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="closed_won">Won</option>
                      <option value="closed_lost">Lost</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Completion Status Filter */}
                  <div className="relative">
                    <select
                      value={completionFilter}
                      onChange={(e) => setCompletionFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Complete</option>
                      <option value="complete">Complete</option>
                      <option value="incomplete">Incomplete</option>
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                  </div>

                  {/* Source Filter */}
                  <div className="relative">
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="pl-2 pr-6 py-1.5 w-full border border-fourth rounded text-xs text-secondary bg-tertiary focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                    >
                      <option value="">All Source</option>
                      <option value="enquiry">Enquiry</option>
                      <option value="direct">Direct</option>
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
        <LeadsTable 
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          sortOrder={sortOrder}
          completionFilter={completionFilter}
          sourceFilter={sourceFilter}
          creatorFilter={isSalesHead ? creatorFilter : ''}
        />
      </div>
    </div>
  );
} 
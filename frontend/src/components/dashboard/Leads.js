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
      <div className="border-b border-fourth pb-5 mb-8">
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
          <div className="flex flex-col xl:flex-row gap-3 xl:gap-4 xl:items-center">
            {/* Left Side - Search */}
            <div className="relative xl:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary placeholder-gray-400"
              />
            </div>
            
            {/* Center - Filters Group */}
            <div className="flex flex-wrap xl:flex-nowrap gap-2 xl:gap-3 xl:flex-1">
              {/* Sort Order */}
              <div className="relative min-w-[130px] flex-1 xl:flex-initial xl:w-32">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="pl-8 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div className="relative min-w-[120px] flex-1 xl:flex-initial xl:w-28">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                >
                  <option value="">Status</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="closed_won">Won</option>
                  <option value="closed_lost">Lost</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>

              {/* Completion Status Filter */}
              <div className="relative min-w-[120px] flex-1 xl:flex-initial xl:w-32">
                <select
                  value={completionFilter}
                  onChange={(e) => setCompletionFilter(e.target.value)}
                  className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                >
                  <option value="">Complete</option>
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>

              {/* Source Filter */}
              <div className="relative min-w-[110px] flex-1 xl:flex-initial xl:w-28">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                >
                  <option value="">Source</option>
                  <option value="enquiry">Enquiry</option>
                  <option value="direct">Direct</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              </div>

              {/* Creator Filter - Only for Sales Head */}
              {isSalesHead && (
                <div className="relative min-w-[110px] flex-1 xl:flex-initial xl:w-28">
                  <select
                    value={creatorFilter}
                    onChange={(e) => setCreatorFilter(e.target.value)}
                    className="pl-3 pr-7 py-2.5 w-full border border-fourth rounded-md focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-xs xl:text-sm text-secondary bg-tertiary"
                  >
                    <option value="">Creator</option>
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

              {/* Reset Button - Compact */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center py-2.5 px-3 border border-gray-300 shadow-sm text-xs xl:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-150 ease-in-out whitespace-nowrap min-w-[70px]"
                  title="Reset all filters"
                >
                  <RotateCcw className="h-3.5 w-3.5 xl:mr-1" />
                  <span className="hidden xl:inline">Reset</span>
                </button>
              )}
            </div>

            {/* Right Side - Add Button */}
            <div className="xl:ml-auto">
              <button
                onClick={() => navigate('/dashboard/add-lead')}
                className="inline-flex items-center justify-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap w-full xl:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </button>
            </div>
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
import { useState } from 'react';
import { Search, ChevronDown, Plus } from 'lucide-react';
import LeadsTable from './LeadsTable';
import { useNavigate } from 'react-router-dom';

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Header Section - Page Title */}
      <div className="border-b border-fourth pb-5 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-secondary">Leads Management</h1>
          {/* Optional: Subtitle if needed, can be text-gray-500 */}
          {/* <p className="text-sm text-gray-500 mt-1">View and manage all your leads in one place.</p> */}
        </div>
      </div>

      {/* Main Content Area - Contains filters and table */}
      {/* This div will have the consistent card styling */}
      <div className="bg-tertiary rounded-lg border border-fourth shadow-sm flex-1 flex flex-col overflow-hidden">
        {/* Filter and Action Bar */}
        <div className="p-4 md:p-6 border-b border-fourth sticky top-0 bg-tertiary z-20">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search Input - takes remaining space on left */}
            <div className="relative flex-grow md:flex-grow-0 w-full md:w-auto md:max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-150 ease-in-out text-sm text-secondary placeholder-gray-400"
              />
            </div>
            
            {/* Filters and Add Button - grouped on right */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-4 pr-10 py-2 w-full border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-sm text-secondary bg-tertiary"
                >
                  <option value="">All Statuses</option>
                  {[
                    { value: 'pending', label: 'Pending' },
                    { value: 'closed', label: 'Closed' },
                    { value: 'active', label: 'Active' },
                    { value: 'in_progress', label: 'In Progress' }
                  ].map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="pl-4 pr-10 py-2 w-full border border-fourth rounded-lg focus:ring-1 focus:ring-primary focus:border-primary appearance-none transition-colors duration-150 ease-in-out text-sm text-secondary bg-tertiary"
                >
                  <option value="">All Sources</option>
                  {[
                    { value: 'exhibition', label: 'Exhibition' },
                    { value: 'facebook', label: 'Facebook' },
                    { value: 'website', label: 'Website' },
                    { value: 'referral', label: 'Referral' },
                    { value: 'cold_call', label: 'Cold Call' }
                  ].map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
              <button
                onClick={() => navigate('/dashboard/add-lead')}
                className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-tertiary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary transition-opacity duration-150 ease-in-out whitespace-nowrap"
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
          sourceFilter={sourceFilter}
        />
      </div>
    </div>
  );
} 
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
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leads Management</h2>
          <p className="text-muted-foreground mt-1">View and manage all your leads in one place</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/add-lead')}
          className="inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-input sticky top-0 bg-white z-20">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-input rounded-lg w-full sm:w-[300px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-4 pr-10 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                >
                  <option value="">Filter by Status</option>
                  {[
                    { value: 'pending', label: 'Pending' },
                    { value: 'closed', label: 'Closed' },
                    { value: 'active', label: 'Active' }
                  ].map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="pl-4 pr-10 py-2 border border-input rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                >
                  <option value="">Filter by Source</option>
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
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
              </div>
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
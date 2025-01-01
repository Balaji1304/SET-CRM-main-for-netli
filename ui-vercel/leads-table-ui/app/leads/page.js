'use client'

import { useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import LeadsTable from '../../components/leads/LeadsTable'

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#111827]">Leads Management</h1>
          <p className="text-[#6B7280] mt-1">View and manage all your leads in one place</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-[#E5E7EB]">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg w-full sm:w-[300px] focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="pl-4 pr-10 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent appearance-none"
                  >
                    <option value="">Filter by Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed">Closed</option>
                    <option value="Active">Active</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="pl-4 pr-10 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent appearance-none"
                  >
                    <option value="">Filter by Source</option>
                    <option value="Exhibition">Exhibition</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Website">Website</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
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
    </div>
  )
}


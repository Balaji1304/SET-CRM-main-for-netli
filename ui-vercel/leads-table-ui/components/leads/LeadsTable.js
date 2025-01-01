'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Sample data
let sampleLeads = [
  {
    id: 1,
    name: 'John Doe',
    phone: '(987) 654-3210',
    email: 'john.doe@example.com',
    status: 'Pending',
    source: 'Facebook',
    owner: 'sarah.smith@company.com',
    activityCount: 2,
    createdDate: '2024-12-20',
    updatedDate: '2024-12-22',
    city: 'New York',
    state: 'NY',
    campaignName: 'SolarFest 2024'
  },
  {
    id: 2,
    name: 'Jane Smith',
    phone: '(555) 123-4567',
    email: 'jane.smith@example.com',
    status: 'Closed',
    source: 'Exhibition',
    owner: 'mike.jones@company.com',
    activityCount: 5,
    createdDate: '2024-12-18',
    updatedDate: '2024-12-23',
    city: 'Los Angeles',
    state: 'CA',
    campaignName: 'Winter Solar Drive'
  },
  {
    id: 3,
    name: 'Robert Johnson',
    phone: '(444) 567-8901',
    email: 'robert.j@example.com',
    status: 'Active',
    source: 'Website',
    owner: 'emma.wilson@company.com',
    activityCount: 3,
    createdDate: '2024-12-19',
    updatedDate: '2024-12-21',
    city: 'Chicago',
    state: 'IL',
    campaignName: 'Spring Energy Savings'
  }
];

export default function LeadsTable({ searchTerm = '', statusFilter = '', sourceFilter = '' }) {
  const [leads, setLeads] = useState(sampleLeads)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLead, setSelectedLead] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const itemsPerPage = 10
  
  // Filter leads based on search term and filters
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchTerm === '' || 
      Object.values(lead).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    
    const matchesStatus = statusFilter === '' || 
      lead.status === statusFilter
    
    const matchesSource = sourceFilter === '' || 
      lead.source === sourceFilter

    return matchesSearch && matchesStatus && matchesSource
  })

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentLeads = filteredLeads.slice(startIndex, endIndex)

  const handleDelete = useCallback((lead) => {
    setSelectedLead(lead)
    setIsDeleteModalOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    setLeads(prevLeads => prevLeads.filter(lead => lead.id !== selectedLead.id))
    setIsDeleteModalOpen(false)
    setShowSuccessToast(true)
    setTimeout(() => setShowSuccessToast(false), 3000)
  }, [selectedLead])

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1)
  }, [searchTerm, statusFilter, sourceFilter])

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <tr>
              {[
                'Name',
                'Phone Number',
                'Email',
                'Status',
                'Source',
                'Owner',
                'Activity Count',
                'Created Date',
                'Updated Date',
                'City',
                'State',
                'Campaign Name',
                'Actions'
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-sm font-medium text-[#6B7280]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {currentLeads.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-[#F9FAFB] transition-colors"
              >
                <td className="px-4 py-4 text-sm text-[#111827]">{lead.name}</td>
                <td className="px-4 py-4 text-sm text-[#6B7280]">{lead.phone}</td>
                <td className="px-4 py-4 text-sm text-[#6B7280]">{lead.email}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${
                      lead.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : lead.status === 'Closed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-[#6B7280]">{lead.source}</td>
                <td className="px-4 py-4 text-sm text-[#6B7280]">{lead.owner}</td>
                <td className="px-4 py-4 text-sm text-[#6B7280]">{lead.activityCount}</td>
                <td className="px-4 py-4 text-sm text-[#6B7280]">
                  {new Date(lead.createdDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 text-sm text-[#6B7280]">
                  {new Date(lead.updatedDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 text-sm text-[#6B7280]">{lead.city}</td>
                <td className="px-4 py-4 text-sm text-[#6B7280]">{lead.state}</td>
                <td className="px-4 py-4 text-sm text-[#6B7280]">{lead.campaignName}</td>
                <td className="px-4 py-4 text-sm">
                  <div className="flex gap-2">
                    <Link
                      href={`/leads/${lead.id}/edit`}
                      className="p-1 hover:bg-[#F9FAFB] rounded-md transition-colors"
                      title="Edit Lead"
                    >
                      <Edit2 className="w-4 h-4 text-[#6B7280]" />
                    </Link>
                    <button
                      onClick={() => handleDelete(lead)}
                      className="p-1 hover:bg-[#F9FAFB] rounded-md transition-colors"
                      title="Delete Lead"
                    >
                      <Trash2 className="w-4 h-4 text-[#6B7280]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
        <div className="flex items-center text-sm text-[#6B7280]">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredLeads.length)} of {filteredLeads.length} results
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 border border-[#E5E7EB] rounded-md disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 border border-[#E5E7EB] rounded-md disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Changes saved successfully
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


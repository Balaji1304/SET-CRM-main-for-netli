'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import LeadForm from '../../../../components/leads/LeadForm'

// Sample leads data
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
    campaignName: 'SolarFest 2024',
    address: '123 Main St, New York, NY 10001',
    businessName: 'Doe Enterprises',
    customerType: 'Business Owner',
    productCategory: 'Solar Panels',
    productRequirements: 'Looking for high-efficiency panels for commercial use',
    estimatedBudget: '50000',
    followUpRequired: true,
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
    campaignName: 'Winter Solar Drive',
    address: '456 Oak St, Los Angeles, CA 90001',
    businessName: 'Smith Solar Solutions',
    customerType: 'Dealer',
    productCategory: 'Batteries',
    productRequirements: 'Interested in high-capacity storage solutions',
    estimatedBudget: '75000',
    followUpRequired: false,
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
    campaignName: 'Spring Energy Savings',
    address: '789 Elm St, Chicago, IL 60601',
    businessName: 'Johnson Renewables',
    customerType: 'Individual',
    productCategory: 'Accessories',
    productRequirements: 'Looking for smart home integration devices',
    estimatedBudget: '10000',
    followUpRequired: true,
  }
];

// Function to simulate updating lead data
const updateLead = async (leadData) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const index = sampleLeads.findIndex(lead => lead.id === leadData.id);
  if (index !== -1) {
    sampleLeads[index] = { ...sampleLeads[index], ...leadData };
    return { success: true, data: sampleLeads[index] };
  } else {
    throw new Error('Lead not found');
  }
};

// Function to simulate fetching lead data
const fetchLead = async (id) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const lead = sampleLeads.find(lead => lead.id === parseInt(id));
  if (lead) {
    return lead;
  } else {
    throw new Error('Lead not found');
  }
};

export default function EditLeadPage({ params }) {
  const router = useRouter()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadLead = async () => {
      try {
        const data = await fetchLead(params.id)
        setLead(data)
      } catch (error) {
        console.error('Error loading lead:', error)
        setError('Failed to load lead data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadLead()
  }, [params.id])

  const handleSave = async (updatedData) => {
    setSaving(true);
    setError(null);
    try {
      const result = await updateLead(updatedData);
      if (result.success) {
        router.push('/leads');
      } else {
        throw new Error('Failed to update lead');
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      setError('Failed to save lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-[600px] bg-white rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Error</h2>
          <p className="mt-2 text-[#6B7280]">{error}</p>
          <button
            onClick={() => router.push('/leads')}
            className="mt-4 px-4 py-2 bg-[#E97040] text-white rounded-lg text-sm font-medium hover:bg-[#D65F30]"
          >
            Return to Leads
          </button>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-[#111827]">Lead Not Found</h2>
          <p className="mt-2 text-[#6B7280]">The requested lead could not be found.</p>
          <button
            onClick={() => router.push('/leads')}
            className="mt-4 px-4 py-2 bg-[#E97040] text-white rounded-lg text-sm font-medium hover:bg-[#D65F30]"
          >
            Return to Leads
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-[#F9FAFB] rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
            </button>
            <h1 className="text-xl font-semibold text-[#111827]">Edit Lead</h1>
          </div>
          <button
            onClick={() => handleSave(lead)}
            disabled={saving}
            className="px-4 py-2 bg-[#E97040] text-white rounded-lg text-sm font-medium hover:bg-[#D65F30] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        <LeadForm 
          initialData={lead}
          onSubmit={handleSave}
          isEditMode={true}
        />
      </div>
    </div>
  )
}


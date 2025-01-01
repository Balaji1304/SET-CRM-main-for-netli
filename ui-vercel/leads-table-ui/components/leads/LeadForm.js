'use client'

import { useState } from 'react'
import { MapPin, Calendar, Paperclip, ChevronDown } from 'lucide-react'

export default function LeadForm({ initialData = {}, onSubmit, isEditMode = false }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    businessName: '',
    customerType: '',
    location: '',
    productCategory: '',
    productRequirements: '',
    interestStage: '',
    estimatedBudget: '',
    followUpRequired: false,
    dateCollected: '',
    city: '',
    state: '',
    owner: '',
    campaignName: '',
    ...initialData
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-8 p-6">
        {/* Form sections */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-[#111827]">General Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#111827] mb-1">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="Enter name"
              />
            </div>

            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-[#111827] mb-1">
                Owner
              </label>
              <input
                id="owner"
                name="owner"
                type="email"
                value={formData.owner}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="Enter owner email"
              />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-[#111827] mb-1">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="Enter city"
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-[#111827] mb-1">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="Enter state"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#111827] mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#111827] mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="Enter email"
              />
            </div>

            <div>
              <label htmlFor="customerType" className="block text-sm font-medium text-[#111827] mb-1">
                Type of Customer
              </label>
              <div className="relative">
                <select
                  id="customerType"
                  name="customerType"
                  value={formData.customerType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent appearance-none"
                >
                  <option value="">Select type</option>
                  <option value="Individual">Individual</option>
                  <option value="Business Owner">Business Owner</option>
                  <option value="Dealer">Dealer</option>
                  <option value="Plumber">Plumber</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div>
              <label htmlFor="interestStage" className="block text-sm font-medium text-[#111827] mb-1">
                Stage of Interest
              </label>
              <div className="relative">
                <select
                  id="interestStage"
                  name="interestStage"
                  value={formData.interestStage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent appearance-none"
                >
                  <option value="">Select stage</option>
                  <option value="New Lead">New Lead</option>
                  <option value="In Negotiation">In Negotiation</option>
                  <option value="Quotation Sent">Quotation Sent</option>
                  <option value="Closed">Closed</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-[#111827] mb-1">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                  placeholder="Enter complete address"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="productRequirements" className="block text-sm font-medium text-[#111827] mb-1">
                Product Requirements
              </label>
              <textarea
                id="productRequirements"
                name="productRequirements"
                value={formData.productRequirements}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent resize-none"
                placeholder="Describe specific requirements..."
              ></textarea>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="followUpRequired"
            name="followUpRequired"
            checked={formData.followUpRequired}
            onChange={handleChange}
            className="w-4 h-4 text-[#E97040] border-gray-300 rounded focus:ring-[#E97040]"
          />
          <label htmlFor="followUpRequired" className="text-sm text-[#111827]">
            Follow-Up Required
          </label>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => onSubmit(initialData)}
            className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#E97040] text-white rounded-lg text-sm font-medium hover:bg-[#D65F30]"
          >
            {isEditMode ? 'Save Changes' : 'Create Lead'}
          </button>
        </div>
      </form>
    </div>
  )
}


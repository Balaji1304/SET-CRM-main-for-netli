'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Paperclip, ChevronDown, Search, Check } from 'lucide-react'

export default function LeadForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
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
    dateCollected: ''
  })

  const [errors, setErrors] = useState({})
  const [activeStep, setActiveStep] = useState(1)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Form submission logic here
    router.push('/dashboard')
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="text-sm text-[#6B7280] mb-2">Step {activeStep}</div>
        <h1 className="text-2xl font-semibold text-[#111827] mb-1">Lead Information</h1>
        <p className="text-[#6B7280]">Enter details of potential customers and their requirements</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Lead Type Selection */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[#111827]">Lead Type</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['New Customer', 'Referral', 'Event Lead'].map((type) => (
              <button
                key={type}
                type="button"
                className={`flex items-center p-4 border rounded-lg hover:border-[#E97040] transition-all
                  ${formData.leadType === type ? 'border-[#E97040] bg-[#FDF4F0]' : 'border-[#E5E7EB]'}
                `}
                onClick={() => handleChange({ target: { name: 'leadType', value: type } })}
              >
                <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center
                  ${formData.leadType === type ? 'border-[#E97040] bg-[#E97040]' : 'border-[#D1D5DB]'}
                `}>
                  {formData.leadType === type && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm font-medium">{type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Personal Information */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-[#111827]">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">First Name</label>
              <input
                type="text"
                name="firstName"
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="Enter first name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Last Name</label>
              <input
                type="text"
                name="lastName"
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="Enter last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Email Address</label>
              <input
                type="email"
                name="email"
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center">
                  <select
                    name="countryCode"
                    className="h-full py-0 pl-3 pr-7 border-transparent bg-transparent text-gray-500 sm:text-sm focus:ring-0"
                  >
                    <option>+1</option>
                    <option>+44</option>
                    <option>+91</option>
                  </select>
                </div>
                <input
                  type="tel"
                  name="phone"
                  className="w-full pl-16 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                  placeholder="(555) 000-0000"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="address"
                className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="Enter complete address"
              />
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-[#111827]">Business Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Business Name</label>
              <input
                type="text"
                name="businessName"
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                placeholder="Enter business name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Customer Type</label>
              <div className="relative">
                <select
                  name="customerType"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent appearance-none"
                >
                  <option value="">Select type</option>
                  <option value="individual">Individual</option>
                  <option value="plumber">Plumber</option>
                  <option value="dealer">Dealer</option>
                  <option value="businessOwner">Business Owner</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-[#111827]">Product Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Product Category</label>
              <div className="relative">
                <select
                  name="productCategory"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent appearance-none"
                >
                  <option value="">Select category</option>
                  <option value="solarPanels">Solar Panels</option>
                  <option value="batteries">Batteries</option>
                  <option value="accessories">Accessories</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Estimated Budget</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                <input
                  type="number"
                  name="estimatedBudget"
                  className="w-full pl-8 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                  placeholder="Enter amount"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Product Requirements</label>
            <textarea
              name="productRequirements"
              rows="4"
              className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent resize-none"
              placeholder="Describe specific requirements..."
            ></textarea>
            <div className="mt-1 text-sm text-gray-500 flex justify-end">0/1000</div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-[#111827]">Additional Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Stage of Interest</label>
              <div className="relative">
                <select
                  name="interestStage"
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent appearance-none"
                >
                  <option value="">Select stage</option>
                  <option value="newLead">New Lead</option>
                  <option value="inNegotiation">In Negotiation</option>
                  <option value="quotationSent">Quotation Sent</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-1">Date of Lead Collection</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  name="dateCollected"
                  className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#E97040] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="followUpRequired"
              name="followUpRequired"
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-[#E97040]"
            />
            <label htmlFor="followUpRequired" className="text-sm text-[#111827]">
              Follow-Up Required
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111827] mb-1">Attachments</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
              <div className="space-y-1 text-center">
                <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#E97040]"
                  >
                    <span>Upload files</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-[#E5E7EB]">
          <button
            type="button"
            className="px-6 py-2 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#6B7280] hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E97040]"
          >
            Reset Form
          </button>
          <button
            type="submit"
            className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#E97040] hover:bg-[#D65F30] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E97040]"
          >
            Save Lead
          </button>
        </div>
      </form>
    </div>
  )
}


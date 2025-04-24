"use client"

import { useState } from "react"
import { BarChart, LineChart, PieChart } from 'lucide-react'

// Placeholder chart component
const PlaceholderChart = ({ type }) => (
  <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
    {type === 'bar' && <BarChart className="w-16 h-16 text-gray-400" />}
    {type === 'line' && <LineChart className="w-16 h-16 text-gray-400" />}
    {type === 'pie' && <PieChart className="w-16 h-16 text-gray-400" />}
  </div>
)

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("last7days")
  const [category, setCategory] = useState("all")

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-[#FF7300]">Reports and Analytics</h1>

      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="last7days">Last 7 days</option>
          <option value="last30days">Last 30 days</option>
          <option value="last3months">Last 3 months</option>
          <option value="lastyear">Last year</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="all">All Categories</option>
          <option value="solar_panels">Solar Panels</option>
          <option value="inverters">Inverters</option>
          <option value="batteries">Batteries</option>
          <option value="accessories">Accessories</option>
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Stock Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Stock Status</h2>
          </div>
          <div className="p-4">
            <PlaceholderChart type="bar" />
          </div>
        </div>

        {/* Pricing Trends Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Pricing Trends</h2>
          </div>
          <div className="p-4">
            <PlaceholderChart type="line" />
          </div>
        </div>

        {/* Stock Distribution Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Stock Distribution by Category</h2>
          </div>
          <div className="p-4">
            <PlaceholderChart type="pie" />
          </div>
        </div>

        {/* Export Reports Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Reports</h2>
          </div>
          <div className="p-4 space-y-4">
            <button className="w-full px-4 py-2 bg-[#FF7300] hover:bg-[#FF8800] text-white rounded-lg transition-colors">
              Export Inventory Report (PDF)
            </button>
            <button className="w-full px-4 py-2 bg-[#FF7300] hover:bg-[#FF8800] text-white rounded-lg transition-colors">
              Export Price Data (Excel)
            </button>
            <button className="w-full px-4 py-2 bg-[#FF7300] hover:bg-[#FF8800] text-white rounded-lg transition-colors">
              Generate Custom Report
            </button>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
          <p className="text-2xl font-bold mt-1">1,234</p>
          <p className="text-xs text-gray-500 mt-1">+20% from last month</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Low Stock Items</h3>
          <p className="text-2xl font-bold mt-1">28</p>
          <p className="text-xs text-gray-500 mt-1">Requires attention</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
          <p className="text-2xl font-bold mt-1">$2.4M</p>
          <p className="text-xs text-gray-500 mt-1">Current inventory value</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Active Orders</h3>
          <p className="text-2xl font-bold mt-1">45</p>
          <p className="text-xs text-gray-500 mt-1">Processing</p>
        </div>
      </div>
    </div>
  )
} 
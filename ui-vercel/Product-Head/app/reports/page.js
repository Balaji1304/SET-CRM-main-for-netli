"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, LineChart, PieChart } from 'lucide-react'

// In a real application, you would use a charting library like Chart.js or Recharts
// For this example, we'll use placeholder components

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
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-[#FF7300]">Reports and Analytics</h1>

      <div className="flex space-x-4">
        <Select onValueChange={setDateRange} defaultValue={dateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last7days">Last 7 days</SelectItem>
            <SelectItem value="last30days">Last 30 days</SelectItem>
            <SelectItem value="last3months">Last 3 months</SelectItem>
            <SelectItem value="lastyear">Last year</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={setCategory} defaultValue={category}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="electronics">Electronics</SelectItem>
            <SelectItem value="clothing">Clothing</SelectItem>
            <SelectItem value="furniture">Furniture</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock Status</CardTitle>
          </CardHeader>
          <CardContent>
            <PlaceholderChart type="bar" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <PlaceholderChart type="line" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Distribution by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <PlaceholderChart type="pie" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full bg-[#FF7300] hover:bg-[#FF8800] text-white">
              Export Inventory Report (PDF)
            </Button>
            <Button className="w-full bg-[#FF7300] hover:bg-[#FF8800] text-white">
              Export Price Data (Excel)
            </Button>
            <Button className="w-full bg-[#FF7300] hover:bg-[#FF8800] text-white">
              Generate Custom Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


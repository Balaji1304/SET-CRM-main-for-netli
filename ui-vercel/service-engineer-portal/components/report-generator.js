"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText } from 'lucide-react'

export function ReportGenerator() {
  const [reportType, setReportType] = useState("")
  const [dateRange, setDateRange] = useState("")

  const handleGenerateReport = () => {
    // Logic to generate report
    console.log("Generating report:", { reportType, dateRange })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Report</CardTitle>
        <CardDescription>Create custom reports based on your criteria</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">Performance Report</SelectItem>
                <SelectItem value="tickets">Ticket Summary</SelectItem>
                <SelectItem value="customer-satisfaction">Customer Satisfaction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-range">Date Range</Label>
            <Input
              id="date-range"
              placeholder="e.g., Last 30 days"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={handleGenerateReport}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}


"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'

// Sample notifications data
const notifications = [
  { id: 1, message: "Low stock alert: Product XYZ (5 units remaining)", priority: "high", type: "stock" },
  { id: 2, message: "Price update required: Product ABC (last updated 30 days ago)", priority: "medium", type: "pricing" },
  { id: 3, message: "Restock completed: Product DEF (100 units added)", priority: "low", type: "restocking" },
  // Add more notifications as needed
]

export default function NotificationsPage() {
  const [filter, setFilter] = useState("all")

  const filteredNotifications = notifications.filter(notification =>
    filter === "all" || notification.type === filter
  )

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "medium":
        return <Info className="h-5 w-5 text-yellow-500" />
      case "low":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return null
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#FF7300]">Notifications</h1>
        <Select onValueChange={setFilter} defaultValue={filter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notifications</SelectItem>
            <SelectItem value="stock">Stock</SelectItem>
            <SelectItem value="pricing">Pricing</SelectItem>
            <SelectItem value="restocking">Restocking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredNotifications.map((notification) => (
          <Card key={notification.id}>
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center space-x-4">
                {getPriorityIcon(notification.priority)}
                <p>{notification.message}</p>
              </div>
              <Button variant="outline" size="sm">
                Mark as Read
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


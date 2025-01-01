import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Ticket, Calendar, MessageSquare } from 'lucide-react'

const notifications = [
  {
    id: "N-001",
    title: "New Ticket Assigned",
    description: "You have been assigned a new ticket: T-1234",
    date: "2023-06-15 09:30 AM",
    type: "ticket",
    read: false,
  },
  {
    id: "N-002",
    title: "Appointment Rescheduled",
    description: "Your appointment with client XYZ has been rescheduled to tomorrow at 2 PM",
    date: "2023-06-14 02:15 PM",
    type: "schedule",
    read: true,
  },
  {
    id: "N-003",
    title: "Customer Feedback Received",
    description: "New feedback received for ticket T-1230",
    date: "2023-06-13 11:45 AM",
    type: "feedback",
    read: false,
  },
  {
    id: "N-004",
    title: "Urgent: System Maintenance",
    description: "System maintenance scheduled for tonight at 11 PM",
    date: "2023-06-12 04:00 PM",
    type: "system",
    read: true,
  },
]

const getIcon = (type) => {
  switch (type) {
    case "ticket":
      return <Ticket className="h-4 w-4" />
    case "schedule":
      return <Calendar className="h-4 w-4" />
    case "feedback":
      return <MessageSquare className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

export function NotificationList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Notifications</CardTitle>
        <CardDescription>Stay updated with your latest notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-start space-x-4">
              <div className="mt-1">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <Badge variant="secondary">New</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {notification.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {notification.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const tickets = [
  {
    id: "T-1234",
    customer: "Alice Brown",
    issue: "Printer malfunction",
    status: "pending",
    priority: "high",
    avatar: "/placeholder.svg",
    initials: "AB",
  },
  {
    id: "T-1235",
    customer: "Bob Smith",
    issue: "Network connectivity",
    status: "in-progress",
    priority: "medium",
    avatar: "/placeholder.svg",
    initials: "BS",
  },
  {
    id: "T-1236",
    customer: "Carol Davis",
    issue: "Software installation",
    status: "pending",
    priority: "low",
    avatar: "/placeholder.svg",
    initials: "CD",
  },
  {
    id: "T-1237",
    customer: "David Wilson",
    issue: "Hardware replacement",
    status: "in-progress",
    priority: "high",
    avatar: "/placeholder.svg",
    initials: "DW",
  },
]

export function RecentTickets() {
  return (
    <div className="space-y-8">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src={ticket.avatar} alt={ticket.customer} />
            <AvatarFallback>{ticket.initials}</AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{ticket.customer}</p>
            <p className="text-sm text-muted-foreground">
              {ticket.issue}
            </p>
          </div>
          <div className="ml-auto font-medium">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                ticket.priority === 'high'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : ticket.priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}
            >
              {ticket.priority}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}


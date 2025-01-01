import { TicketsTable } from "@/components/tickets-table"
import { TicketFilters } from "@/components/ticket-filters"

export const metadata = {
  title: "Tickets | Service Engineer Portal",
  description: "Manage and view all assigned tickets",
}

export default function TicketsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tickets</h2>
      </div>
      <div className="space-y-4">
        <TicketFilters />
        <TicketsTable />
      </div>
    </div>
  )
}


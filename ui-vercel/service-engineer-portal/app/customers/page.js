import { CustomerList } from "@/components/customer-list"
import { CustomerSearch } from "@/components/customer-search"

export const metadata = {
  title: "Customers | Service Engineer Portal",
  description: "Manage and view customer information",
}

export default function CustomersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
      </div>
      <div className="space-y-4">
        <CustomerSearch />
        <CustomerList />
      </div>
    </div>
  )
}


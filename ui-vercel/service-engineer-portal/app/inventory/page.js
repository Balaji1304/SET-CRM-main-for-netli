import { InventoryList } from "@/components/inventory-list"
import { InventorySearch } from "@/components/inventory-search"

export const metadata = {
  title: "Inventory | Service Engineer Portal",
  description: "Manage and view inventory items",
}

export default function InventoryPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
      </div>
      <div className="space-y-4">
        <InventorySearch />
        <InventoryList />
      </div>
    </div>
  )
}


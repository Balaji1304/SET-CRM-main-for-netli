import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus, Minus } from 'lucide-react'

const inventoryItems = [
  {
    id: "INV-001",
    name: "Laptop",
    category: "Electronics",
    quantity: 50,
    status: "In Stock",
  },
  {
    id: "INV-002",
    name: "Printer Cartridge",
    category: "Supplies",
    quantity: 100,
    status: "Low Stock",
  },
  {
    id: "INV-003",
    name: "Network Cable",
    category: "Networking",
    quantity: 200,
    status: "In Stock",
  },
  {
    id: "INV-004",
    name: "Hard Drive",
    category: "Storage",
    quantity: 30,
    status: "Low Stock",
  },
]

export function InventoryList() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inventoryItems.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>
              <Badge
                variant={item.status === "In Stock" ? "default" : "secondary"}
              >
                {item.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4 text-primary" />
                <span className="sr-only">Increase quantity</span>
              </Button>
              <Button variant="ghost" size="icon">
                <Minus className="h-4 w-4 text-primary" />
                <span className="sr-only">Decrease quantity</span>
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}


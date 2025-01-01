import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreHorizontal, Phone, Mail } from 'lucide-react'

const customers = [
  {
    id: "C-1001",
    name: "Alice Johnson",
    company: "Tech Solutions Inc.",
    email: "alice@techsolutions.com",
    phone: "+1 (555) 123-4567",
    avatar: "/placeholder.svg",
    initials: "AJ",
  },
  {
    id: "C-1002",
    name: "Bob Smith",
    company: "Innovate Systems",
    email: "bob@innovatesystems.com",
    phone: "+1 (555) 987-6543",
    avatar: "/placeholder.svg",
    initials: "BS",
  },
  {
    id: "C-1003",
    name: "Carol Davis",
    company: "Global Networks",
    email: "carol@globalnetworks.com",
    phone: "+1 (555) 246-8135",
    avatar: "/placeholder.svg",
    initials: "CD",
  },
  {
    id: "C-1004",
    name: "David Wilson",
    company: "Data Dynamics",
    email: "david@datadynamics.com",
    phone: "+1 (555) 369-2580",
    avatar: "/placeholder.svg",
    initials: "DW",
  },
]

export function CustomerList() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={customer.avatar} alt={customer.name} />
                  <AvatarFallback>{customer.initials}</AvatarFallback>
                </Avatar>
                {customer.name}
              </div>
            </TableCell>
            <TableCell>{customer.company}</TableCell>
            <TableCell>{customer.email}</TableCell>
            <TableCell>{customer.phone}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon">
                <Phone className="h-4 w-4 text-primary" />
                <span className="sr-only">Call</span>
              </Button>
              <Button variant="ghost" size="icon">
                <Mail className="h-4 w-4 text-primary" />
                <span className="sr-only">Email</span>
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


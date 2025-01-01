"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreHorizontal, FileEdit, Trash2 } from 'lucide-react'

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
    status: "resolved",
    priority: "high",
    avatar: "/placeholder.svg",
    initials: "DW",
  },
]

export function TicketsTable() {
  const [selectedTicket, setSelectedTicket] = useState(null)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket ID</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Issue</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="font-medium">{ticket.id}</TableCell>
            <TableCell>
              <div className="flex items-center">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={ticket.avatar} alt={ticket.customer} />
                  <AvatarFallback>{ticket.initials}</AvatarFallback>
                </Avatar>
                {ticket.customer}
              </div>
            </TableCell>
            <TableCell>{ticket.issue}</TableCell>
            <TableCell>
              <Badge
                variant={
                  ticket.status === "resolved"
                    ? "success"
                    : ticket.status === "in-progress"
                    ? "warning"
                    : "default"
                }
              >
                {ticket.status}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  ticket.priority === "high"
                    ? "destructive"
                    : ticket.priority === "medium"
                    ? "warning"
                    : "default"
                }
              >
                {ticket.priority}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ticket Details</DialogTitle>
                    <DialogDescription>
                      View and manage ticket information
                    </DialogDescription>
                  </DialogHeader>
                  {selectedTicket && (
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-bold">ID:</span>
                        <span className="col-span-3">{selectedTicket.id}</span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-bold">Customer:</span>
                        <span className="col-span-3">{selectedTicket.customer}</span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-bold">Issue:</span>
                        <span className="col-span-3">{selectedTicket.issue}</span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-bold">Status:</span>
                        <span className="col-span-3">{selectedTicket.status}</span>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-bold">Priority:</span>
                        <span className="col-span-3">{selectedTicket.priority}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline">
                      <FileEdit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}


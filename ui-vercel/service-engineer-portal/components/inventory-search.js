"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter } from 'lucide-react'

export function InventorySearch() {
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="flex w-full max-w-sm items-center space-x-2">
      <Input
        type="text"
        placeholder="Search inventory..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Search className="h-4 w-4" />
        <span className="sr-only">Search</span>
      </Button>
      <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
        <Filter className="h-4 w-4" />
        <span className="sr-only">Filter</span>
      </Button>
    </div>
  )
}


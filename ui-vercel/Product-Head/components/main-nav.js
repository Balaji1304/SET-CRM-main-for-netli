"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Package, Bell, BarChart, LogOut } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Products",
    icon: Package,
    href: "/products",
    color: "text-pink-500",
  },
  {
    label: "Notifications",
    icon: Bell,
    href: "/notifications",
    color: "text-violet-500",
  },
  {
    label: "Reports",
    icon: BarChart,
    href: "/reports",
    color: "text-orange-500",
  },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col space-y-2">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "flex items-center gap-x-2 px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100",
            pathname === route.href
              ? "text-[#FF7300] bg-orange-50"
              : "text-gray-600 hover:text-[#FF7300]"
          )}
        >
          <route.icon className={cn("h-5 w-5", route.color)} />
          {route.label}
        </Link>
      ))}
      <Link
        href="/login"
        className="flex items-center gap-x-2 px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-[#FF7300] mt-auto"
      >
        <LogOut className="h-5 w-5" />
        Logout
      </Link>
    </nav>
  )
}


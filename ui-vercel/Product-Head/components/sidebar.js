import Link from "next/link"
import { LayoutDashboard, Package, Bell, BarChart, LogOut } from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Package, label: "Products", href: "/products" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: BarChart, label: "Reports", href: "/reports" },
]

export function Sidebar() {
  return (
    <div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
      <div className="flex h-14 items-center border-b border-gray-200 px-4">
        <span className="text-xl font-bold text-[#FF7300]">Product Head</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                <item.icon className="mr-3 h-5 w-5 text-[#FF7300]" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-gray-200 p-4">
        <Link
          href="/logout"
          className="flex items-center rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="mr-3 h-5 w-5 text-[#FF7300]" />
          Logout
        </Link>
      </div>
    </div>
  )
}


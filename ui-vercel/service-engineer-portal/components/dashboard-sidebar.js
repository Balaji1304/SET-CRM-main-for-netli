'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Ticket, Calendar, Users, Box, BookOpen, BarChart2, FileText, Bell, LogOut } from 'lucide-react'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const navigation = [
  {
    title: 'Main',
    items: [
      { title: 'Dashboard', icon: Home, href: '/' },
      { title: 'Tickets', icon: Ticket, href: '/tickets' },
      { title: 'Schedule', icon: Calendar, href: '/schedule' },
      { title: 'Customers', icon: Users, href: '/customers' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { title: 'Inventory', icon: Box, href: '/inventory' },
      { title: 'Knowledge Base', icon: BookOpen, href: '/knowledge' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { title: 'Performance', icon: BarChart2, href: '/performance' },
      { title: 'Reports', icon: FileText, href: '/reports' },
      { title: 'Notifications', icon: Bell, href: '/notifications' },
    ],
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  const memoizedNavigation = useMemo(() => 
    navigation.map(group => ({
      ...group,
      items: group.items.map(item => ({
        ...item,
        isActive: pathname === item.href
      }))
    }))
  , [pathname])

  return (
    <Sidebar className="border-r border-border bg-background">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>SE</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Service Engineer</span>
            <span className="text-xs text-muted-foreground">ID: SE12345</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {memoizedNavigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-muted-foreground">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <Link href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <div className="mt-auto border-t border-border p-4">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground" size="sm">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
      <SidebarRail />
    </Sidebar>
  )
}


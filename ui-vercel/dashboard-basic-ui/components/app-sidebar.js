"use client"

import { Home, Ticket, Calendar, Users, Box, BookOpen, BarChart2, FileText, Bell, LogOut } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

const navigation = [
  {
    title: 'Main',
    items: [
      { title: 'Dashboard', icon: Home, href: '/', isActive: true },
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

export function AppSidebar() {
  return (
    <Sidebar className="border-r bg-white">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">SolarCRM</span>
            <span className="text-xs text-muted-foreground">Admin Portal</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="text-muted-foreground">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <a href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <div className="mt-auto border-t p-4">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-accent hover:text-accent-foreground" size="sm">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
      <SidebarRail />
    </Sidebar>
  )
}


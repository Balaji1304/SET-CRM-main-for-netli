import { NotificationList } from "@/components/notification-list"

export const metadata = {
  title: "Notifications | Service Engineer Portal",
  description: "View your notifications and updates",
}

export default function NotificationsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
      </div>
      <NotificationList />
    </div>
  )
}


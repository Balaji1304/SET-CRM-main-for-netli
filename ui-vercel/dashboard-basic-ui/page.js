export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="h-[200px] rounded-lg border border-dashed border-border bg-muted/50 flex items-center justify-center text-muted-foreground">
        Main content area
      </div>
    </div>
  )
}


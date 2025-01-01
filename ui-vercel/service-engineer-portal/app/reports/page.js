import { ReportGenerator } from "@/components/report-generator"
import { RecentReports } from "@/components/recent-reports"

export const metadata = {
  title: "Reports | Service Engineer Portal",
  description: "Generate and view reports",
}

export default function ReportsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
      </div>
      <div className="space-y-4">
        <ReportGenerator />
        <RecentReports />
      </div>
    </div>
  )
}


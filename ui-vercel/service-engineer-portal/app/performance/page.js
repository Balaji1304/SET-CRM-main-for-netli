import { PerformanceOverview } from "@/components/performance-overview"
import { PerformanceMetrics } from "@/components/performance-metrics"

export const metadata = {
  title: "Performance | Service Engineer Portal",
  description: "View your performance metrics and statistics",
}

export default function PerformancePage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Performance</h2>
      </div>
      <div className="space-y-4">
        <PerformanceOverview />
        <PerformanceMetrics />
      </div>
    </div>
  )
}


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Clock, CheckCircle2, Star } from 'lucide-react'

const performanceData = [
  {
    title: "Tickets Resolved",
    value: "156",
    description: "Last 30 days",
    icon: CheckCircle2,
  },
  {
    title: "Average Resolution Time",
    value: "3h 24m",
    description: "Last 30 days",
    icon: Clock,
  },
  {
    title: "Customer Satisfaction",
    value: "4.8",
    description: "Out of 5 stars",
    icon: Star,
  },
  {
    title: "Efficiency Rate",
    value: "92%",
    description: "Tasks completed on time",
    icon: BarChart,
  },
]

export function PerformanceOverview() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {performanceData.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {item.title}
            </CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


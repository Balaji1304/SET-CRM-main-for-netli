'use client'

import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  {
    date: "Jan",
    tickets: 12,
    resolved: 10,
  },
  {
    date: "Feb",
    tickets: 15,
    resolved: 13,
  },
  {
    date: "Mar",
    tickets: 18,
    resolved: 15,
  },
  {
    date: "Apr",
    tickets: 14,
    resolved: 12,
  },
  {
    date: "May",
    tickets: 20,
    resolved: 17,
  },
  {
    date: "Jun",
    tickets: 24,
    resolved: 18,
  },
]

export function DashboardOverview() {
  return (
    <ChartContainer
      config={{
        tickets: {
          label: "Total Tickets",
          color: "hsl(28 100% 50%)",
        },
        resolved: {
          label: "Resolved Tickets",
          color: "hsl(32 100% 50%)",
        },
      }}
      className="h-[350px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 10,
            left: 10,
            bottom: 0,
          }}
        >
          <Tooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="tickets"
            strokeWidth={2}
            activeDot={{
              r: 6,
              style: { fill: "hsl(28 100% 50%)" },
            }}
          />
          <Line
            type="monotone"
            dataKey="resolved"
            strokeWidth={2}
            activeDot={{
              r: 6,
              style: { fill: "hsl(32 100% 50%)" },
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}


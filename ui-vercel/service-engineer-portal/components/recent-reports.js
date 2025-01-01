import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Eye } from 'lucide-react'

const recentReports = [
  {
    id: "REP-001",
    name: "Monthly Performance Summary",
    date: "2023-06-01",
    type: "Performance",
  },
  {
    id: "REP-002",
    name: "Quarterly Ticket Analysis",
    date: "2023-05-15",
    type: "Tickets",
  },
  {
    id: "REP-003",
    name: "Customer Satisfaction Survey Results",
    date: "2023-05-01",
    type: "Customer Satisfaction",
  },
  {
    id: "REP-004",
    name: "Annual Efficiency Report",
    date: "2023-04-15",
    type: "Performance",
  },
]

export function RecentReports() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Reports</CardTitle>
        <CardDescription>View and download your recently generated reports</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentReports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">{report.name}</TableCell>
                <TableCell>{report.date}</TableCell>
                <TableCell>{report.type}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="sr-only">View</span>
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4 text-primary" />
                    <span className="sr-only">Download</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


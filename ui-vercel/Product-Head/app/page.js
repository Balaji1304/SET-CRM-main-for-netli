import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, AlertTriangle, ShoppingCart, TrendingUp, Plus, Eye, FileText } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-[#FF7300]">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-[#FF7300]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +20% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-stock Products</CardTitle>
            <ShoppingCart className="h-4 w-4 text-[#FF7300]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,000</div>
            <p className="text-xs text-muted-foreground">
              80% of total products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out-of-stock Products</CardTitle>
            <AlertTriangle className="h-4 w-4 text-[#FF7300]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">
              20% of total products
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Restocks</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#FF7300]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">
              Expected within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-[#FF7300]" />
                <p className="ml-2 text-sm font-medium">Low stock alert: Product XYZ (5 units remaining)</p>
              </div>
              <div className="flex items-center">
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-[#FF8800]" />
                <p className="ml-2 text-sm font-medium">Price update required: Product ABC (last updated 30 days ago)</p>
              </div>
              <div className="flex items-center">
                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-green-500" />
                <p className="ml-2 text-sm font-medium">Restock completed: Product DEF (100 units added)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full bg-[#FF7300] hover:bg-[#FF8800] text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
            <Button className="w-full bg-[#FF7300] hover:bg-[#FF8800] text-white">
              <Eye className="mr-2 h-4 w-4" /> View Products
            </Button>
            <Button className="w-full bg-[#FF7300] hover:bg-[#FF8800] text-white">
              <FileText className="mr-2 h-4 w-4" /> Generate Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Video, PenToolIcon as Tool, Book } from 'lucide-react'

const categories = [
  {
    title: "Troubleshooting Guides",
    description: "Step-by-step guides for common issues",
    icon: Tool,
  },
  {
    title: "Product Manuals",
    description: "Detailed product documentation",
    icon: Book,
  },
  {
    title: "Training Videos",
    description: "Video tutorials and demonstrations",
    icon: Video,
  },
  {
    title: "Technical Articles",
    description: "In-depth technical information",
    icon: FileText,
  },
]

export function KnowledgeBaseCategories() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => (
        <Card key={category.title} className="cursor-pointer hover:bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <category.icon className="mr-2 h-4 w-4 text-primary" />
              {category.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>{category.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


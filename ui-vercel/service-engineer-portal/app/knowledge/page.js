import { KnowledgeBaseSearch } from "@/components/knowledge-base-search"
import { KnowledgeBaseCategories } from "@/components/knowledge-base-categories"

export const metadata = {
  title: "Knowledge Base | Service Engineer Portal",
  description: "Access and search the knowledge base",
}

export default function KnowledgeBasePage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
      </div>
      <div className="space-y-4">
        <KnowledgeBaseSearch />
        <KnowledgeBaseCategories />
      </div>
    </div>
  )
}


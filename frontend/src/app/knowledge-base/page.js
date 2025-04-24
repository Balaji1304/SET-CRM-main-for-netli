import React from 'react';
import { Search, FileText, FolderOpen } from 'lucide-react';

const KnowledgeBasePage = () => {
  const articles = [
    {
      id: 1,
      title: "Solar Panel Installation Guide",
      category: "Installation",
      lastUpdated: "2024-02-25",
    },
    {
      id: 2,
      title: "Maintenance Best Practices",
      category: "Maintenance",
      lastUpdated: "2024-02-24",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
          <p className="text-muted-foreground mt-1">Access guides, documentation and resources</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-input sticky top-0 bg-white z-20">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search articles..."
                className="pl-10 pr-4 py-2 border border-input rounded-lg w-full sm:w-[300px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="p-4 border border-input rounded-lg hover:border-orange-500 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-orange-500" />
                  <div>
                    <h3 className="font-medium text-foreground">{article.title}</h3>
                    <p className="text-sm text-muted-foreground">{article.category}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Last updated: {article.lastUpdated}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBasePage; 
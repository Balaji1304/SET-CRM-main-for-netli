import { MainNav } from "@/components/main-nav"

export default function AuthenticatedLayout({
  children,
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 border-r bg-gray-50/50 lg:block p-6">
        <div className="flex h-full flex-col justify-between">
          <div className="space-y-6">
            <div className="flex h-12 items-center gap-x-3">
              <span className="font-bold text-xl">Product Head</span>
            </div>
            <MainNav />
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}


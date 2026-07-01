import { AdminSidebar } from '@/components/admin/sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex min-h-screen bg-[#F1E8D7]">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}

import { SidebarColumn, TeacherDrawer } from "@/components/teacher/teacher-drawer"

export function TeacherShell({
  name,
  organization,
  children,
}: {
  name: string
  organization: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-svh overflow-hidden bg-[#F8FAFC] text-[#0B1220]">
      <aside className="hidden h-svh w-60 shrink-0 flex-col bg-[#0B1220] text-[#F8FAFC] md:flex">
        <SidebarColumn name={name} organization={organization} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TeacherDrawer name={name} organization={organization} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-10 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

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
    <div className="flex min-h-svh bg-[#F8FAFC] text-[#0B1220]">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col bg-[#0B1220] text-[#F8FAFC] md:flex">
        <SidebarColumn name={name} organization={organization} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <TeacherDrawer name={name} organization={organization} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-10 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

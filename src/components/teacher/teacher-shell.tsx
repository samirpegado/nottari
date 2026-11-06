import Image from "next/image"
import { LogOut } from "lucide-react"
import { signOut } from "@/app/auth/actions"
import { TeacherNav } from "@/components/teacher/teacher-nav"
import { cn } from "@/lib/utils"

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
        <div className="px-5 pt-6">
          <Image
            src="/brand/logo.png"
            alt="Nottari"
            width={960}
            height={243}
            priority
            className="h-auto w-36"
          />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1 px-3" aria-label="Principal">
          <TeacherNav />
        </nav>
        <AccountFooter name={name} organization={organization} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between bg-[#0B1220] px-4 py-3 text-[#F8FAFC] md:hidden">
          <Image
            src="/brand/logo.png"
            alt="Nottari"
            width={960}
            height={243}
            className="h-auto w-28"
          />
          <SignOutButton />
        </header>
        <nav
          className="flex gap-1 overflow-x-auto bg-[#0B1220] px-2 pb-3 md:hidden"
          aria-label="Principal"
        >
          <TeacherNav className="shrink-0" />
        </nav>
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-10 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function AccountFooter({
  name,
  organization,
}: {
  name: string
  organization: string
}) {
  return (
    <div className="border-t border-white/10 p-4">
      <p className="truncate text-sm font-medium">{name}</p>
      <p className="truncate text-xs text-[#94A3B8]">{organization}</p>
      <SignOutButton className="mt-3" />
    </div>
  )
}

function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={cn(
          "inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white",
          className,
        )}
      >
        <LogOut className="size-4" />
        Sair
      </button>
    </form>
  )
}

import Image from "next/image"
import { LogOut } from "lucide-react"
import { signOutStudent } from "@/app/auth/actions"

export function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-[#F8FAFC] text-[#0B1220]">
      <header className="z-40 shrink-0 bg-[#0B1220] text-[#F8FAFC]">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-3 px-4 md:px-8">
          <Image
            src="/brand/logo.png"
            alt="Nottari"
            width={960}
            height={243}
            priority
            className="h-auto w-28"
          />
          <form action={signOutStudent}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#94A3B8] hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  )
}

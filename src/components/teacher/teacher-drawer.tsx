"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { TeacherNav } from "@/components/teacher/teacher-nav"
import { AccountFooter } from "@/components/teacher/account-footer"

export function SidebarColumn({
  name,
  organization,
  onClose,
}: {
  name: string
  organization: string
  onClose?: () => void
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3 px-5 pt-6">
        <Image
          src="/brand/logo.png"
          alt="Nottari"
          width={960}
          height={243}
          priority
          className="h-auto w-36"
        />
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="grid size-9 shrink-0 place-items-center rounded-full text-[#94A3B8] hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto px-3" aria-label="Principal">
        <TeacherNav onNavigate={onClose} />
      </nav>
      <AccountFooter name={name} organization={organization} />
    </>
  )
}

export function TeacherDrawer({
  name,
  organization,
}: {
  name: string
  organization: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <>
      <header className="z-40 flex h-14 shrink-0 items-center gap-2 bg-[#0B1220] px-3 text-[#F8FAFC] md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="grid size-10 place-items-center rounded-lg hover:bg-white/10"
        >
          <Menu className="size-5" />
        </button>
        <Image
          src="/brand/logo.png"
          alt="Nottari"
          width={960}
          height={243}
          className="h-auto w-28"
        />
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-[#0B1220]/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[#0B1220] text-[#F8FAFC] shadow-xl">
            <SidebarColumn
              name={name}
              organization={organization}
              onClose={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  )
}

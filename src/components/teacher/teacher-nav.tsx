"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  House,
  Library,
  Settings,
  Users,
  Wallet,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { label: "Início", href: "/inicio", icon: House },
  { label: "Alunos", href: "/alunos", icon: Users },
  { label: "Agenda", href: "/agenda", icon: CalendarDays },
  { label: "Mensalidades", href: "/mensalidades", icon: Wallet },
  { label: "Materiais", href: "/materiais", icon: Library },
  { label: "Configurações", icon: Settings },
]

export function TeacherNav({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <>
      {navigation.map((item) => {
        const Icon = item.icon
        const current = item.href
          ? pathname === item.href || pathname.startsWith(`${item.href}/`)
          : false

        if (!item.href) {
          return (
            <span
              key={item.label}
              aria-disabled="true"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#94A3B8]"
            >
              <Icon className="size-4" />
              {item.label}
            </span>
          )
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
              current
                ? "bg-[#3B82F6] text-white"
                : "text-[#94A3B8] hover:bg-white/5 hover:text-white",
              className,
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

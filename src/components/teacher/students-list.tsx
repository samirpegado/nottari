"use client"

import Link from "next/link"
import { Clock, Mail, Music2, Phone } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { StudentActions } from "@/components/teacher/students-toolbar"
import { formatBrPhone } from "@/lib/auth-fields"
import { formatCpf } from "@/lib/br-docs"
import { StudentAvatar } from "@/components/teacher/student-avatar"
import { studentTheme } from "@/lib/student-profile"

export type StudentRow = {
  id: string
  full_name: string
  phone: string
  email: string | null
  cpf: string | null
  instrument: string | null
  skillLevel: string | null
  nextLesson: string | null
  chargeStatus: "pending" | "ok" | null
  photoUrl: string | null
  color: string
}

export function StudentsList({
  rows,
  emptyLabel,
  query,
  page,
  pages,
  total,
  showingFrom,
  showingTo,
}: {
  rows: StudentRow[]
  emptyLabel: string
  query: string
  page: number
  pages: number
  total: number
  showingFrom: number
  showingTo: number
}) {
  return (
    <div>
      {rows.length === 0 ? (
        <p className="rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-10 text-center text-sm text-[#64748B]">
          {emptyLabel}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((student) => (
            <li key={student.id}>
              <StudentCard student={student} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
        <p className="text-sm text-[#475569]">
          {showingFrom}–{showingTo} de {total}
        </p>
        <div className="flex items-center gap-2">
          <PageLink query={query} page={page - 1} disabled={page <= 1}>
            Anterior
          </PageLink>
          <PageLink query={query} page={page + 1} disabled={page >= pages}>
            Próxima
          </PageLink>
        </div>
      </div>
    </div>
  )
}

function StudentCard({ student }: { student: StudentRow }) {
  const phone = formatBrPhone(student.phone)
  const digits = student.phone.replace(/\D/g, "")
  const whatsapp = digits ? `https://wa.me/55${digits}` : null

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)] transition-[box-shadow,border-color] duration-200 hover:border-[#c7d2fe] hover:shadow-[0_14px_28px_-18px_rgba(15,23,42,.28)]">
      <div className="relative h-11" style={{ background: studentTheme(student.color).banner }}>
        <div className="absolute top-1.5 right-2">
          <StudentActions
            studentId={student.id}
            studentName={student.full_name}
            variant="overlay"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
        <div className="relative -mt-7">
          <StudentAvatar name={student.full_name} photoUrl={student.photoUrl} color={student.color} />
        </div>
        <div>
          <Link href={`/alunos/${student.id}`}>
            <h2 className="text-lg leading-tight font-semibold tracking-tight text-[#0B1220] hover:text-[#3B82F6]">
              {student.full_name}
            </h2>
          </Link>
          <p className="mt-0.5 text-xs text-[#64748B]">
            {student.cpf ? `CPF ${formatCpf(student.cpf)}` : "CPF não informado"}
          </p>
        </div>
        {student.instrument || student.skillLevel ? (
          <div className="flex flex-wrap gap-1.5">
            {student.instrument ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#dbeafe] px-2.5 py-0.5 text-xs font-semibold text-[#1e40af]">
                <Music2 className="size-3" />
                {student.instrument}
              </span>
            ) : null}
            {student.skillLevel ? (
              <span className="inline-flex items-center rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-xs font-medium text-[#334155]">
                {student.skillLevel}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5 rounded-xl border border-[#e8edf4] bg-[#f8fafc] px-2.5 py-2">
            <span className="text-[11px] font-medium text-[#64748B]">Próxima aula</span>
            <span className="flex items-center gap-1 text-sm font-semibold text-[#0B1220]">
              <Clock className="size-3 text-[#475569]" />
              {student.nextLesson ?? "—"}
            </span>
          </div>
          <ChargeBadge status={student.chargeStatus} />
        </div>
        <div className="flex flex-col gap-1.5 border-t border-[#eef2f7] pt-3 text-sm text-[#1e293b]">
          <p className="flex items-center gap-2 tabular-nums">
            <Phone className="size-3.5 shrink-0 text-[#64748B]" />
            {phone || "Sem telefone"}
          </p>
          <p className="flex min-w-0 items-center gap-2">
            <Mail className="size-3.5 shrink-0 text-[#64748B]" />
            <span className="truncate">{student.email || "Sem e-mail"}</span>
          </p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] text-sm font-semibold text-[#047857] hover:bg-[#d1fae5]"
            >
              WhatsApp
            </a>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-xl border border-[#e2e8f0] text-sm font-semibold text-[#94A3B8]">
              WhatsApp
            </span>
          )}
          {student.email ? (
            <a
              href={`mailto:${student.email}`}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] text-sm font-semibold text-[#1e293b] hover:bg-[#e2e8f0]"
            >
              E-mail
            </a>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-xl border border-[#e2e8f0] text-sm font-semibold text-[#94A3B8]">
              E-mail
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function ChargeBadge({ status }: { status: StudentRow["chargeStatus"] }) {
  if (status === "pending") {
    return (
      <div className="flex flex-col gap-0.5 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-2.5 py-2">
        <span className="text-[11px] font-medium text-[#78350f]">Mensalidade</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#92400e]">
          <span className="size-1.5 rounded-full bg-[#d97706]" />
          Pendente
        </span>
      </div>
    )
  }
  if (status === "ok") {
    return (
      <div className="flex flex-col gap-0.5 rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-2">
        <span className="text-[11px] font-medium text-[#065f46]">Mensalidade</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#047857]">
          <span className="size-1.5 rounded-full bg-[#059669]" />
          Em dia
        </span>
      </div>
    )
  }
  return (
      <div className="flex flex-col gap-0.5 rounded-xl border border-[#e8edf4] bg-[#f8fafc] px-2.5 py-2">
      <span className="text-[11px] font-medium text-[#64748B]">Mensalidade</span>
      <span className="text-sm font-semibold text-[#0B1220]">—</span>
    </div>
  )
}

function PageLink({
  query,
  page,
  disabled,
  children,
}: {
  query: string
  page: number
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className={buttonVariants({ variant: "outline" }) + " pointer-events-none opacity-50"}>
        {children}
      </span>
    )
  }
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  if (page > 1) params.set("page", String(page))
  const href = params.toString() ? `/alunos?${params.toString()}` : "/alunos"
  return (
    <Link href={href} className={buttonVariants({ variant: "outline" })}>
      {children}
    </Link>
  )
}

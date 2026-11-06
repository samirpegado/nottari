import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { TeacherShell } from "@/components/teacher/teacher-shell"
import { EndEnrollmentButton } from "@/components/teacher/end-enrollment-button"
import { formatBrPhone } from "@/lib/auth-fields"
import { WEEKDAY_LONG, saoPauloNow } from "@/lib/schedule"
import { getTeacherContext } from "@/lib/teacher"

export const metadata: Metadata = {
  title: "Aluno",
}

type RuleJoin = {
  weekday: number
  start_time: string
  duration_minutes: number
  active: boolean
}

type EnrollmentJoin = {
  id: string
  billing_type: string
  amount: number | string
  due_day: number | null
  notes: string | null
  schedule_rules: RuleJoin | RuleJoin[] | null
}

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, organizationId, organizationName, fullName } = await getTeacherContext()
  if (!organizationId) notFound()

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, stage_name, phone, email")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle()

  if (!student) notFound()

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, billing_type, amount, due_day, notes, schedule_rules(weekday, start_time, duration_minutes, active)")
    .eq("student_id", student.id)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const plan = enrollment as EnrollmentJoin | null
  const rules = list(plan?.schedule_rules).filter((rule) => rule.active)
  const name = student.stage_name?.trim() || student.full_name
  const amount = Number(plan?.amount ?? 0)
  const billing = plan?.billing_type === "monthly" ? "Mensalidade" : "Hora/aula"

  return (
    <TeacherShell name={fullName} organization={organizationName}>
      <Link
        href="/alunos"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#64748B] hover:text-[#0B1220]"
      >
        <ChevronLeft className="size-4" />
        Alunos
      </Link>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Aluno</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">{name}</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          {formatBrPhone(student.phone)}
          {student.email ? ` · ${student.email}` : ""}
        </p>
      </header>

      <section className="mt-6 max-w-xl rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0B1220]/5">
        <h2 className="text-sm font-semibold">Matrícula</h2>
        {plan ? (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-[#334155]">
              {billing} de{" "}
              {amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              {plan.due_day ? `, vence no dia ${plan.due_day}` : ""}
            </p>
            {rules.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm text-[#334155]">
                {rules
                  .slice()
                  .sort((a, b) => weekdayOrder(a.weekday) - weekdayOrder(b.weekday))
                  .map((rule) => (
                    <li key={`${rule.weekday}-${rule.start_time}`}>
                      {WEEKDAY_LONG[rule.weekday]}, {rule.start_time.slice(0, 5)} · {rule.duration_minutes} min
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-[#64748B]">Nenhum horário fixo nesta matrícula.</p>
            )}
            {plan.notes ? <p className="text-sm text-[#64748B]">{plan.notes}</p> : null}
            <div>
              <EndEnrollmentButton
                enrollmentId={plan.id}
                studentName={name}
                today={saoPauloNow().ymd}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#64748B]">Este aluno ainda não tem matrícula ativa.</p>
        )}
      </section>
    </TeacherShell>
  )
}

function list<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function weekdayOrder(weekday: number) {
  return weekday === 0 ? 7 : weekday
}

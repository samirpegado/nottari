import type { Metadata } from "next"
import { redirect } from "next/navigation"
import {
  CalendarDays,
  CheckCircle2,
  TriangleAlert,
  Wallet,
} from "lucide-react"
import { TeacherShell } from "@/components/teacher/teacher-shell"
import { QuickMetronome } from "@/components/teacher/quick-metronome"
import { StatusDonut } from "@/components/teacher/status-donut"
import { WeekCalendar, type WeekDay } from "@/components/teacher/week-calendar"
import { createClient } from "@/lib/supabase/server"
import { ensureCurrentMonthCharges } from "@/app/mensalidades/actions"

export const metadata: Metadata = {
  title: "Início",
}

const TIME_ZONE = "America/Sao_Paulo"
const WEEKDAY_LONG = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
]

export default async function TeacherHomePage() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/")

  const { data: membership } = await supabase
    .from("members")
    .select("display_name, organization_id, organizations(name)")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle()

  const organizationId = membership?.organization_id ?? null
  const organizationName = organizationNameOf(membership?.organizations) || "Sua conta"
  const fullName = membership?.display_name?.trim() || nameFromEmail(auth.user.email)
  const firstName = fullName.split(" ")[0] || "Professor"

  const today = saoPauloYmd()
  const weekStart = addDaysYmd(today, -weekdayIndex(today))
  const startISO = dayStartISO(today)
  const endISO = dayEndISO(today)
  const weekStartISO = dayStartISO(weekStart)
  const weekEndISO = dayEndISO(addDaysYmd(weekStart, 6))
  const now = new Date().toISOString()

  if (organizationId) await ensureCurrentMonthCharges()

  const [periodResult, weekResult, upcomingResult, chargesResult] =
    organizationId
      ? await Promise.all([
          supabase
            .from("lessons")
            .select("status")
            .eq("organization_id", organizationId)
            .gte("scheduled_at", startISO)
            .lte("scheduled_at", endISO),
          supabase
            .from("lessons")
            .select(
              "id, scheduled_at, status, enrollments(students(full_name, stage_name))",
            )
            .eq("organization_id", organizationId)
            .gte("scheduled_at", weekStartISO)
            .lte("scheduled_at", weekEndISO)
            .order("scheduled_at", { ascending: true }),
          supabase
            .from("lessons")
            .select(
              "id, scheduled_at, status, duration_minutes, enrollments(students(full_name, stage_name)), lesson_notes(piece)",
            )
            .eq("organization_id", organizationId)
            .eq("status", "scheduled")
            .gte("scheduled_at", now)
            .order("scheduled_at", { ascending: true })
            .limit(5),
          supabase
            .from("charges")
            .select("amount")
            .eq("organization_id", organizationId)
            .in("status", ["pending", "overdue"]),
        ])
      : [null, null, null, null]

  const counts = countByStatus(periodResult?.data ?? [])
  const totalLessons = Object.values(counts).reduce((sum, n) => sum + n, 0)
  const done = counts.done ?? 0
  const missed = counts.missed ?? 0
  const attended = done + missed
  const presence = attended > 0 ? Math.round((done / attended) * 100) : null
  const openAmount = (chargesResult?.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  )
  const openCount = chargesResult?.data?.length ?? 0

  const weekDays = buildWeekDays(weekStart, today, weekResult?.data ?? [])

  const upcoming = (upcomingResult?.data ?? []).map((lesson) => {
    const student = one(one(lesson.enrollments)?.students)
    const note = one(lesson.lesson_notes)
    return {
      id: lesson.id as string,
      student: studentName(student),
      when: formatLessonWhen(lesson.scheduled_at as string),
      detail: note?.piece || `${lesson.duration_minutes ?? 0} min`,
    }
  })

  return (
    <TeacherShell name={fullName} organization={organizationName}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
          Painel
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">
          Olá, {firstName}!
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          {organizationName} · {todayLabel()}
        </p>
      </header>

      <section
        className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4"
        aria-label="Indicadores de hoje"
      >
        <Stat
          label="Aulas de hoje"
          value={String(totalLessons)}
          icon={<CalendarDays className="size-5" />}
          tone="blue"
        />
        <Stat
          label="Concluídas"
          value={String(done)}
          icon={<CheckCircle2 className="size-5" />}
          tone="green"
          hint={presence !== null ? `${presence}% de presença` : undefined}
        />
        <Stat
          label="Faltas"
          value={String(missed)}
          icon={<TriangleAlert className="size-5" />}
          tone={missed > 0 ? "red" : "muted"}
          hint={missed > 0 ? "hoje" : "Nenhuma falta"}
        />
        <Stat
          label="Mensalidades em aberto"
          value={brl(openAmount)}
          icon={<Wallet className="size-5" />}
          tone={openCount > 0 ? "amber" : "muted"}
          hint={
            openCount > 0
              ? `${openCount} ${openCount === 1 ? "cobrança" : "cobranças"}`
              : "Tudo em dia"
          }
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <QuickMetronome />

        <WeekCalendar days={weekDays} />

        <StatusDonut counts={counts} periodLabel="Hoje" />

        <section
          aria-label="Próximas aulas"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0B1220]/5"
        >
            <h2 className="text-base font-semibold">Próximas aulas</h2>
            {upcoming.length === 0 ? (
              <p className="py-8 text-sm text-[#64748B]">
                Nenhuma aula marcada daqui para frente. Quando a agenda tiver
                horários, eles aparecem aqui.
              </p>
            ) : (
              <ul className="mt-3">
                {upcoming.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-center gap-3 border-t border-[#0B1220]/5 py-3 first:border-t-0"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#3B82F6]/10 text-sm font-semibold text-[#3B82F6]">
                      {initials(lesson.student)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {lesson.student}
                      </span>
                      <span className="block truncate text-sm text-[#64748B]">
                        {lesson.when} · {lesson.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>
    </TeacherShell>
  )
}

const TONES: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "bg-[#3B82F6]/10", fg: "text-[#3B82F6]" },
  green: { bg: "bg-[#10B981]/12", fg: "text-[#047857]" },
  red: { bg: "bg-[#EF4444]/10", fg: "text-[#B91C1C]" },
  amber: { bg: "bg-[#F59E0B]/15", fg: "text-[#B45309]" },
  muted: { bg: "bg-[#0B1220]/5", fg: "text-[#64748B]" },
}

function Stat({
  label,
  value,
  icon,
  tone,
  hint,
}: {
  label: string
  value: string
  icon: React.ReactNode
  tone: keyof typeof TONES
  hint?: string
}) {
  const colors = TONES[tone]
  return (
    <article className="flex flex-col gap-2 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-[#0B1220]/5 sm:gap-3 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium leading-snug text-[#64748B] sm:text-sm">
          {label}
        </span>
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9 ${colors.bg} ${colors.fg}`}
        >
          {icon}
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
      {hint ? <p className="text-xs text-[#64748B]">{hint}</p> : null}
    </article>
  )
}

function countByStatus(rows: { status: string | null }[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.status ?? "scheduled"
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

type WeekLessonRow = {
  id: string
  scheduled_at: string
  status: string
  enrollments: unknown
}

function buildWeekDays(
  weekStart: string,
  today: string,
  lessons: WeekLessonRow[],
): WeekDay[] {
  const buckets = new Map<string, WeekDay["lessons"]>()
  for (const lesson of lessons) {
    const ymd = saoPauloYmd(new Date(lesson.scheduled_at))
    const student = one((one(lesson.enrollments) as { students?: unknown })?.students)
    const entry = {
      id: lesson.id,
      time: spTime(lesson.scheduled_at),
      student: studentName(student as { full_name?: string; stage_name?: string } | null),
      status: lesson.status,
    }
    const list = buckets.get(ymd)
    if (list) list.push(entry)
    else buckets.set(ymd, [entry])
  }

  return Array.from({ length: 7 }).map((_, index) => {
    const ymd = addDaysYmd(weekStart, index)
    return {
      key: ymd,
      weekdayLong: WEEKDAY_LONG[index],
      dayNumber: String(Number(ymd.split("-")[2])),
      isToday: ymd === today,
      lessons: buckets.get(ymd) ?? [],
    }
  })
}

function studentName(
  student: { full_name?: string; stage_name?: string | null } | null,
) {
  if (!student) return "Aluno"
  return student.stage_name?.trim() || student.full_name?.trim() || "Aluno"
}

function organizationNameOf(value: unknown) {
  const row = one(value as { name: string } | { name: string }[] | null)
  return row?.name ?? ""
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function nameFromEmail(email: string | undefined) {
  const local = email?.split("@")[0]?.trim()
  return local || "Professor"
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "A"
}

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

function saoPauloYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function addDaysYmd(ymd: string, delta: number) {
  const base = new Date(`${ymd}T12:00:00-03:00`)
  base.setUTCDate(base.getUTCDate() + delta)
  return saoPauloYmd(base)
}

function dayStartISO(ymd: string) {
  return new Date(`${ymd}T00:00:00-03:00`).toISOString()
}

function dayEndISO(ymd: string) {
  return new Date(`${ymd}T23:59:59.999-03:00`).toISOString()
}

function weekdayIndex(ymd: string) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(new Date(`${ymd}T12:00:00-03:00`))
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[name] ?? 0
}

function spTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(iso))
}

function todayLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  }).format(new Date())
}

function formatLessonWhen(iso: string) {
  const date = new Date(iso)
  const time = spTime(iso)
  const day = saoPauloYmd(date)
  const today = saoPauloYmd()
  if (day === today) return `Hoje · ${time}`
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TIME_ZONE,
  }).format(date)
  return `${label} · ${time}`
}

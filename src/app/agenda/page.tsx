import type { Metadata } from "next"
import { TeacherShell } from "@/components/teacher/teacher-shell"
import { AgendaBoard, type AgendaBlock } from "@/components/teacher/agenda-board"
import type { EnrollmentDefaults } from "@/components/teacher/enroll-dialog"
import {
  COLUMN_WEEKDAYS,
  DAY_END,
  DAY_START,
  addDays,
  dateForWeekday,
  mondayOf,
  saoPauloNow,
  shownOnDate,
  timeToMinutes,
  weekRangeLabel,
} from "@/lib/schedule"
import { getTeacherContext } from "@/lib/teacher"

export const metadata: Metadata = {
  title: "Agenda",
}

type RuleRow = {
  id: string
  weekday: number
  start_time: string
  duration_minutes: number
  valid_from: string
  valid_to: string | null
  active: boolean
  enrollments:
    | EnrollmentJoin
    | EnrollmentJoin[]
    | null
}

type EnrollmentJoin = {
  id: string
  student_id: string
  billing_type: string
  amount: number | string
  due_day: number | null
  notes: string | null
  students:
    | { full_name: string; stage_name: string | null }
    | { full_name: string; stage_name: string | null }[]
    | null
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; hora?: string }>
}) {
  const params = await searchParams
  const now = saoPauloNow()
  const requested = /^\d{4}-\d{2}-\d{2}$/.test(params.semana ?? "")
    ? params.semana!
    : now.ymd
  const weekMonday = mondayOf(requested)

  const { supabase, organizationId, organizationName, fullName } =
    await getTeacherContext()

  const [rulesResult, studentsResult, enrollmentsResult] = organizationId
    ? await Promise.all([
        supabase
          .from("schedule_rules")
          .select(
            "id, weekday, start_time, duration_minutes, valid_from, valid_to, active, enrollments(id, student_id, billing_type, amount, due_day, notes, students(full_name, stage_name))",
          )
          .eq("organization_id", organizationId)
          .eq("active", true),
        supabase
          .from("students")
          .select("id, full_name, stage_name, active")
          .eq("organization_id", organizationId)
          .eq("active", true)
          .order("full_name", { ascending: true }),
        supabase
          .from("enrollments")
          .select("student_id, billing_type, amount, due_day, notes, created_at")
          .eq("organization_id", organizationId)
          .eq("active", true)
          .order("created_at", { ascending: false }),
      ])
    : [null, null, null]

  const blocks: AgendaBlock[] = ((rulesResult?.data ?? []) as RuleRow[])
    .filter((rule) =>
      shownOnDate(
        rule.valid_from,
        rule.valid_to,
        dateForWeekday(weekMonday, rule.weekday),
      ),
    )
    .map((rule) => {
      const enrollment = one(rule.enrollments)
      const student = one(enrollment?.students ?? null)
      const billing = enrollment?.billing_type === "monthly" ? "monthly" : "per_lesson"
      return {
        id: rule.id,
        enrollmentId: enrollment?.id ?? "",
        studentId: enrollment?.student_id ?? "",
        weekday: rule.weekday,
        startMinutes: timeToMinutes(rule.start_time),
        durationMinutes: rule.duration_minutes,
        student: student?.stage_name?.trim() || student?.full_name || "Aluno",
        billingType: billing as "per_lesson" | "monthly",
        amount: Number(enrollment?.amount ?? 0),
        dueDay: typeof enrollment?.due_day === "number" ? enrollment.due_day : null,
        notes: enrollment?.notes ?? "",
      }
    })

  const students = (studentsResult?.data ?? []).map((student) => ({
    id: student.id as string,
    name:
      (student.stage_name as string | null)?.trim() ||
      (student.full_name as string),
  }))

  const enrollments: EnrollmentDefaults[] = []
  for (const row of enrollmentsResult?.data ?? []) {
    const studentId = row.student_id as string
    if (enrollments.some((item) => item.studentId === studentId)) continue
    const billing = row.billing_type === "monthly" ? "monthly" : "per_lesson"
    enrollments.push({
      studentId,
      billingType: billing,
      amount: Number(row.amount ?? 0),
      dueDay: typeof row.due_day === "number" ? row.due_day : null,
      notes: (row.notes as string | null) ?? "",
    })
  }

  const days = COLUMN_WEEKDAYS.map((weekday) => {
    const ymd = dateForWeekday(weekMonday, weekday)
    return {
      weekday,
      dayNumber: String(Number(ymd.slice(-2))),
      ymd,
      isToday: ymd === now.ymd,
    }
  })

  return (
    <TeacherShell name={fullName} organization={organizationName}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
          Agenda
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">
          Semana de aulas
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Horários livres ficam em branco. Clique num horário ou use Matricular.
        </p>
      </header>

      <div className="mt-6">
        <AgendaBoard
          days={days}
          blocks={blocks}
          students={students}
          enrollments={enrollments}
          weekLabel={weekRangeLabel(weekMonday)}
          prevWeek={addDays(weekMonday, -7)}
          nextWeek={addDays(weekMonday, 7)}
          todayYmd={now.ymd}
          nowMinutes={now.minutes}
          focusStart={focusMinutes(params.hora)}
        />
      </div>
    </TeacherShell>
  )
}

function focusMinutes(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return null
  const minutes = Number(value)
  if (minutes < DAY_START || minutes >= DAY_END) return null
  return minutes
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

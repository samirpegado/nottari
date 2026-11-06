import type { Metadata } from "next"
import { TeacherShell } from "@/components/teacher/teacher-shell"
import { AgendaBoard, type AgendaBlock } from "@/components/teacher/agenda-board"
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

  const [rulesResult, studentsCount] = organizationId
    ? await Promise.all([
        supabase
          .from("schedule_rules")
          .select(
            "id, weekday, start_time, duration_minutes, valid_from, valid_to, active, enrollments(id, student_id, students(full_name, stage_name))",
          )
          .eq("organization_id", organizationId)
          .eq("active", true),
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("active", true),
      ])
    : [null, null]

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
      return {
        id: rule.id,
        studentId: enrollment?.student_id ?? "",
        weekday: rule.weekday,
        startMinutes: timeToMinutes(rule.start_time),
        durationMinutes: rule.duration_minutes,
        student: student?.stage_name?.trim() || student?.full_name || "Aluno",
      }
    })

  const hasStudents = (studentsCount?.count ?? 0) > 0

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
          hasStudents={hasStudents}
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

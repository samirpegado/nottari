import { addDays, saoPauloNow, WEEKDAY_SHORT, weekdayOf } from "@/lib/schedule"

export const LESSON_STATUSES = ["done", "missed", "scheduled", "rescheduled", "makeup"] as const
export type LessonStatus = (typeof LESSON_STATUSES)[number]

export const LESSON_STATUS_META: Record<
  LessonStatus,
  { label: string; chip: string; dot: string }
> = {
  done: { label: "Feita", chip: "bg-[#D1FAE5] text-[#047857]", dot: "bg-[#10B981]" },
  missed: { label: "Falta", chip: "bg-[#FEE2E2] text-[#B91C1C]", dot: "bg-[#EF4444]" },
  scheduled: { label: "Agendada", chip: "bg-[#DBEAFE] text-[#1D4ED8]", dot: "bg-[#3B82F6]" },
  rescheduled: { label: "Remarcada", chip: "bg-[#FEF3C7] text-[#B45309]", dot: "bg-[#F59E0B]" },
  makeup: { label: "Reposição", chip: "bg-[#EDE9FE] text-[#6D28D9]", dot: "bg-[#8B5CF6]" },
}

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export function isLessonStatus(value: string | null | undefined): value is LessonStatus {
  return LESSON_STATUSES.includes(value as LessonStatus)
}

export function parseBpm(raw: string | number | null | undefined) {
  if (raw === null || raw === undefined || raw === "") return { ok: true as const, bpm: null }
  const value = typeof raw === "number" ? raw : Number(String(raw).trim())
  if (!Number.isInteger(value) || value < 1 || value > 399) {
    return { ok: false as const, error: "O BPM precisa ser um número entre 1 e 399." }
  }
  return { ok: true as const, bpm: value }
}

export function formatLessonStamp(iso: string, todayYmd: string) {
  const ymd = saoPauloNow(new Date(iso)).ymd
  if (ymd === todayYmd) return "Hoje"
  if (ymd === addDays(todayYmd, -1)) return "Ontem"
  const [year, month, day] = ymd.split("-")
  const weekday = WEEKDAY_SHORT[weekdayOf(ymd)]
  const label = `${weekday}, ${Number(day)} ${MONTHS_SHORT[Number(month) - 1]}`
  return year === todayYmd.slice(0, 4) ? label : `${label} ${year}`
}

export function formatRelativeAgo(iso: string, todayYmd: string) {
  const ymd = saoPauloNow(new Date(iso)).ymd
  if (ymd === todayYmd) return "hoje"
  const yesterday = addDays(todayYmd, -1)
  if (ymd === yesterday) return "ontem"
  let days = 0
  let cursor = ymd
  while (cursor < todayYmd && days < 60) {
    cursor = addDays(cursor, 1)
    days += 1
  }
  if (days === 1) return "há 1 dia"
  if (days > 1 && days < 60) return `há ${days} dias`
  return formatLessonStamp(iso, todayYmd)
}

export function lessonHasNote(note: {
  piece?: string | null
  measure?: string | null
  bpm?: number | null
  homework?: string | null
  notes?: string | null
}) {
  return Boolean(note.piece || note.measure || note.bpm || note.homework || note.notes)
}

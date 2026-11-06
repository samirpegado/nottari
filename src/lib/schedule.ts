export const DAY_START = 6 * 60
export const DAY_END = 24 * 60
export const SLOT_MINUTES = 30
export const DURATIONS = [30, 60, 90] as const
export const LESSON_HORIZON = 8

const TIME_ZONE = "America/Sao_Paulo"

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
export const WEEKDAY_LONG = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
]

/** Colunas da grade, começando na segunda. 0 = domingo. */
export const COLUMN_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]

export function saoPauloNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00"
  return {
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  }
}

export function addDays(ymd: string, delta: number) {
  const base = new Date(`${ymd}T12:00:00-03:00`)
  base.setUTCDate(base.getUTCDate() + delta)
  return saoPauloNow(base).ymd
}

export function weekdayOf(ymd: string) {
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

export function mondayOf(ymd: string) {
  const weekday = weekdayOf(ymd)
  const delta = weekday === 0 ? -6 : 1 - weekday
  return addDays(ymd, delta)
}

export function dateForWeekday(weekMonday: string, weekday: number) {
  const delta = weekday === 0 ? 6 : weekday - 1
  return addDays(weekMonday, delta)
}

export function upcomingDates(weekday: number, fromYmd: string, count: number) {
  const start = weekdayOf(fromYmd)
  const delta = (weekday - start + 7) % 7
  return Array.from({ length: count }, (_, index) =>
    addDays(fromYmd, delta + index * 7),
  )
}

/** Próxima data em que esse dia e horário ainda não passaram. */
export function nextLessonDate(
  weekday: number,
  startMinutes: number,
  now = saoPauloNow(),
) {
  const delta = (weekday - weekdayOf(now.ymd) + 7) % 7
  let ymd = addDays(now.ymd, delta)
  if (ymd === now.ymd && startMinutes <= now.minutes) ymd = addDays(ymd, 7)
  return ymd
}

export function formatLongDate(ymd: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  }).format(new Date(`${ymd}T12:00:00-03:00`))
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":")
  return Number(hours) * 60 + Number(minutes)
}

export function overlaps(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
) {
  return startA < startB + durationB && startB < startA + durationA
}

export type SlotBlock = {
  weekday: number
  startMinutes: number
  durationMinutes: number
}

export function freeStarts(
  blocks: SlotBlock[],
  weekday: number,
  duration: number,
) {
  const sameDay = blocks.filter((block) => block.weekday === weekday)
  const starts: number[] = []
  for (let minute = DAY_START; minute + duration <= DAY_END; minute += SLOT_MINUTES) {
    const taken = sameDay.some((block) =>
      overlaps(minute, duration, block.startMinutes, block.durationMinutes),
    )
    if (!taken) starts.push(minute)
  }
  return starts
}

export function weekRangeLabel(weekMonday: string) {
  const end = addDays(weekMonday, 6)
  const startDate = new Date(`${weekMonday}T12:00:00-03:00`)
  const endDate = new Date(`${end}T12:00:00-03:00`)
  const day = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    timeZone: TIME_ZONE,
  })
  const endLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(endDate)
  return `${day.format(startDate)}–${endLabel}`
}

export function slotIso(ymd: string, minutes: number) {
  return `${ymd}T${formatMinutes(minutes)}:00-03:00`
}

export function coversDate(
  validFrom: string,
  validTo: string | null,
  ymd: string,
) {
  const from = validFrom.slice(0, 10)
  const to = validTo?.slice(0, 10) ?? null
  if (from > ymd) return false
  if (to && to < ymd) return false
  return true
}

/** Mostra o horário na semana vista, inclusive quando a primeira aula é na próxima. */
export function shownOnDate(
  validFrom: string,
  validTo: string | null,
  ymd: string,
) {
  if (coversDate(validFrom, validTo, ymd)) return true
  const from = validFrom.slice(0, 10)
  const to = validTo?.slice(0, 10) ?? null
  if (to && (to < ymd || to < from)) return false
  return addDays(ymd, 7) === from
}

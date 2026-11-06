"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react"
import {
  assignSlot,
  enrollmentPlanFor,
  searchStudents,
  updateSlot,
  type StudentSearchHit,
} from "@/app/agenda/actions"
import { Button } from "@/components/ui/button"
import {
  COLUMN_WEEKDAYS,
  DURATIONS,
  WEEKDAY_LONG,
  formatLongDate,
  formatMinutes,
  freeStarts,
  mondayOf,
  nextLessonDate,
} from "@/lib/schedule"
import { cn } from "@/lib/utils"

const WEEKDAY_LETTER = ["D", "S", "T", "Q", "Q", "S", "S"]

const PERIODS = [
  { label: "Manhã", from: 6 * 60, to: 12 * 60 },
  { label: "Tarde", from: 12 * 60, to: 18 * 60 },
  { label: "Noite", from: 18 * 60, to: 24 * 60 },
]

export type EnrollmentEdit = {
  ruleId: string
  enrollmentId: string
  studentId: string
  billingType: "per_lesson" | "monthly"
  amount: number
  dueDay: number | null
  notes: string
}

export function EnrollDialog({
  weekday,
  startMinutes,
  duration,
  blocks,
  todayYmd,
  nowMinutes,
  lockedStudent = null,
  editing = null,
  onClose,
}: {
  weekday: number
  startMinutes: number
  duration: number
  blocks: { id?: string; weekday: number; startMinutes: number; durationMinutes: number }[]
  todayYmd: string
  nowMinutes: number
  lockedStudent?: { id: string; name: string } | null
  editing?: EnrollmentEdit | null
  onClose: () => void
}) {
  const initialPlan = editing
    ? {
        billingType: editing.billingType,
        amount: formatAmount(editing.amount),
        dueDay: editing.dueDay,
        notes: editing.notes,
      }
    : { billingType: "per_lesson" as const, amount: "", dueDay: null, notes: "" }
  const [studentId, setStudentId] = useState(editing?.studentId || lockedStudent?.id || "")
  const [studentLabel, setStudentLabel] = useState(lockedStudent?.name ?? "")
  const [day, setDay] = useState(weekday)
  const [length, setLength] = useState(duration)
  const [start, setStart] = useState(startMinutes)
  const [billingType, setBillingType] = useState(initialPlan.billingType)
  const [amount, setAmount] = useState(initialPlan.amount)
  const [pinnedDue, setPinnedDue] = useState(initialPlan.dueDay)
  const [notes, setNotes] = useState(initialPlan.notes)
  const [notesOpen, setNotesOpen] = useState(Boolean(initialPlan.notes))
  const [periodLabel, setPeriodLabel] = useState<string | null>(null)
  const [oneOff, setOneOff] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const starts = freeStarts(
    blocks.filter((block) => block.id !== editing?.ruleId),
    day,
    length,
  )
  const firstDate = nextLessonDate(day, start, { ymd: todayYmd, minutes: nowMinutes })
  const dueDay = pinnedDue ?? Number(firstDate.slice(-2))
  const activePeriod =
    PERIODS.find((period) => period.label === periodLabel) ??
    PERIODS.find((period) => start >= period.from && start < period.to) ??
    PERIODS[0]
  const visibleTimes = starts.filter(
    (minute) => minute >= activePeriod.from && minute < activePeriod.to,
  )
  const slotReady = starts.includes(start)

  async function chooseStudent(student: StudentSearchHit) {
    setStudentId(student.id)
    setStudentLabel(student.name)
    const result = await enrollmentPlanFor(student.id)
    if (!result.ok) return
    if (!oneOff) {
      setBillingType(result.plan.billingType)
      setPinnedDue(result.plan.dueDay)
    }
    setAmount(result.plan.amount ? formatAmount(result.plan.amount) : "")
    setNotes(result.plan.notes)
    setNotesOpen(Boolean(result.plan.notes))
  }

  function openStarts(nextDay: number, nextDuration: number) {
    return freeStarts(
      blocks.filter((block) => block.id !== editing?.ruleId),
      nextDay,
      nextDuration,
    )
  }

  function chooseDay(nextDay: number) {
    const options = openStarts(nextDay, length)
    setDay(nextDay)
    setPeriodLabel(null)
    if (!options.includes(start)) setStart(options[0] ?? start)
  }

  function chooseDuration(nextDuration: number) {
    const options = openStarts(day, nextDuration)
    setLength(nextDuration)
    setPeriodLabel(null)
    if (!options.includes(start)) setStart(options[0] ?? start)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const value = parseAmount(amount)
    if (!studentId) {
      setError("Escolha o aluno.")
      return
    }
    if (!slotReady) {
      setError("Escolha um horário livre.")
      return
    }
    if (value === null) {
      setError("Informe o valor.")
      return
    }
    setPending(true)
    setError(undefined)
    const result = editing
      ? await updateSlot({
          ruleId: editing.ruleId,
          enrollmentId: editing.enrollmentId,
          weekday: day,
          startMinutes: start,
          durationMinutes: length,
          billingType,
          amount: value,
          dueDay,
          notes,
        })
      : await assignSlot({
          studentId,
          weekday: day,
          startMinutes: start,
          durationMinutes: length,
          billingType: oneOff ? "per_lesson" : billingType,
          amount: value,
          dueDay,
          notes,
          oneOff,
        })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (editing) router.refresh()
    else router.push(`/agenda?semana=${mondayOf(firstDate)}&hora=${start}`)
    onClose()
  }

  const summary = slotReady
    ? `${WEEKDAY_LONG[day]}, ${formatMinutes(start)} · ${length} min`
    : "Escolha um horário livre"
  const priceSummary = amount.trim()
    ? `R$ ${amount.trim()} ${oneOff || billingType !== "monthly" ? "por aula" : "por mês"}`
    : "Sem valor"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1220]/40 p-4 sm:items-center">
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-labelledby="enroll-title"
        className="flex max-h-[90svh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
          <div>
            <h2 id="enroll-title" className="text-lg font-semibold">
              {editing ? "Editar matrícula" : oneOff ? "Aula avulsa" : "Matricular"}
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              {oneOff ? "Uma aula avulsa, sem horário fixo." : "Aluno, horário da semana e cobrança."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 shrink-0 place-items-center rounded-full text-[#64748B] hover:bg-[#F1F5F9]"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-3 overflow-y-auto px-5 pb-4">
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            Aluno
            {editing || lockedStudent ? (
              <p className="flex h-11 items-center rounded-xl border border-[#0B1220]/10 bg-[#F8FAFC] px-3.5 text-sm font-normal">
                {studentLabel || "Aluno"}
              </p>
            ) : (
              <StudentSearch
                value={studentId}
                label={studentLabel}
                onSelect={chooseStudent}
                onClear={() => setStudentId("")}
              />
            )}
          </div>

          <section className="rounded-2xl bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8] uppercase">Aula</h3>
              {editing ? null : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={oneOff}
                  onClick={() => {
                    const next = !oneOff
                    setOneOff(next)
                    if (next) setBillingType("per_lesson")
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-[#334155]"
                >
                  Avulsa
                  <span
                    className={cn(
                      "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                      oneOff ? "bg-[#3B82F6]" : "bg-[#CBD5E1]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
                        oneOff && "translate-x-4",
                      )}
                    />
                  </span>
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {COLUMN_WEEKDAYS.map((weekday) => (
                <button
                  key={weekday}
                  type="button"
                  aria-label={WEEKDAY_LONG[weekday]}
                  onClick={() => chooseDay(weekday)}
                  className={cn(
                    "h-9 rounded-lg text-xs font-semibold",
                    day === weekday
                      ? "bg-[#0B1220] text-white"
                      : "bg-white text-[#0B1220] ring-1 ring-[#0B1220]/10 hover:ring-[#3B82F6]/40",
                  )}
                >
                  {WEEKDAY_LETTER[weekday]}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-white p-1 ring-1 ring-[#0B1220]/10">
              {DURATIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => chooseDuration(option)}
                  className={cn(
                    "h-9 rounded-lg text-sm font-medium",
                    length === option ? "bg-[#0B1220] text-white" : "text-[#64748B] hover:text-[#0B1220]",
                  )}
                >
                  {option} min
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-1 rounded-xl bg-[#0B1220]/5 p-1">
              {PERIODS.map((period) => {
                const count = starts.filter(
                  (minute) => minute >= period.from && minute < period.to,
                ).length
                const selected = period.label === activePeriod.label
                return (
                  <button
                    key={period.label}
                    type="button"
                    onClick={() => setPeriodLabel(period.label)}
                    className={cn(
                      "h-8 flex-1 rounded-lg text-sm font-medium",
                      selected ? "bg-white text-[#0B1220] shadow-sm" : "text-[#64748B] hover:text-[#0B1220]",
                      count === 0 && "opacity-40",
                    )}
                  >
                    {period.label}
                  </button>
                )
              })}
            </div>

            {starts.length === 0 ? (
              <p className="mt-3 text-sm text-[#64748B]">Não há horário livre nesse dia para essa duração.</p>
            ) : visibleTimes.length === 0 ? (
              <p className="mt-3 text-sm text-[#64748B]">Nenhum horário livre neste período.</p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {visibleTimes.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => {
                      setStart(minute)
                      setPeriodLabel(null)
                    }}
                    className={cn(
                      "h-10 w-full rounded-lg text-sm font-medium",
                      start === minute
                        ? "bg-[#3B82F6] text-white"
                        : "bg-white text-[#0B1220] ring-1 ring-[#0B1220]/10 hover:ring-[#3B82F6]/40",
                    )}
                  >
                    {formatMinutes(minute)}
                  </button>
                ))}
              </div>
            )}

            {slotReady ? (
              <p className="mt-3 text-sm text-[#64748B]">
                {oneOff
                  ? `Aula avulsa em ${formatLongDate(firstDate)}.`
                  : `Primeira aula ${formatLongDate(firstDate)}. Depois, toda ${WEEKDAY_LONG[day].toLowerCase()} às ${formatMinutes(start)}.`}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl bg-[#F8FAFC] p-4">
            <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8] uppercase">Pagamento</h3>
            {oneOff ? null : (
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white p-1 ring-1 ring-[#0B1220]/10">
                <button
                  type="button"
                  onClick={() => setBillingType("per_lesson")}
                  className={cn(
                    "h-9 rounded-lg text-sm font-medium",
                    billingType === "per_lesson" ? "bg-[#0B1220] text-white" : "text-[#64748B]",
                  )}
                >
                  Hora/aula
                </button>
                <button
                  type="button"
                  onClick={() => setBillingType("monthly")}
                  className={cn(
                    "h-9 rounded-lg text-sm font-medium",
                    billingType === "monthly" ? "bg-[#0B1220] text-white" : "text-[#64748B]",
                  )}
                >
                  Mensalidade
                </button>
              </div>
            )}

            <div className={cn("mt-3 grid grid-cols-1 gap-3", oneOff ? "" : "sm:grid-cols-2")}>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {oneOff || billingType !== "monthly" ? "Valor da aula" : "Valor mensal"}
                <span className="flex h-11 items-center rounded-xl bg-white px-3 ring-1 ring-[#0B1220]/10 focus-within:ring-[#3B82F6]">
                  <span className="text-sm font-normal text-[#94A3B8]">R$</span>
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0,00"
                    className="h-full w-full bg-transparent px-2 font-normal outline-none"
                  />
                </span>
              </label>
              {oneOff ? null : <DueDayField value={dueDay} onChange={setPinnedDue} />}
            </div>
            {oneOff ? null : (
              <p className="mt-2 text-sm text-[#64748B]">
                {billingType === "monthly"
                  ? `A mensalidade vence todo dia ${dueDay}.`
                  : `O pagamento das aulas é acompanhado no dia ${dueDay} de cada mês.`}
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-[#F8FAFC] px-4 py-3">
            <button
              type="button"
              onClick={() => setNotesOpen((open) => !open)}
              aria-expanded={notesOpen}
              className="flex w-full items-center justify-between gap-3 text-sm font-medium"
            >
              Observação
              <ChevronDown className={cn("size-4 text-[#64748B] transition-transform", notesOpen && "rotate-180")} />
            </button>
            {notesOpen ? (
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Como o aluno está, combinados da aula, o que observar."
                className="mt-3 w-full resize-none rounded-xl bg-white px-3 py-2.5 text-sm font-normal ring-1 ring-[#0B1220]/10 outline-none focus:ring-[#3B82F6]"
              />
            ) : (
              <p className="mt-1 text-xs text-[#94A3B8]">Opcional. Abra para anotar algo sobre o aluno.</p>
            )}
          </section>

          {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
        </div>

        <footer className="flex flex-col gap-3 border-t border-[#0B1220]/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{studentLabel || "Escolha o aluno"}</p>
            <p className="text-xs text-[#64748B]">
              {summary} · {priceSummary}
              {oneOff ? "" : ` · dia ${dueDay}`}
            </p>
          </div>
          <Button
            type="submit"
            disabled={pending || !slotReady || !studentId}
            className="w-full sm:w-auto"
          >
            {pending ? "Salvando..." : editing ? "Salvar" : oneOff ? "Agendar aula" : "Matricular"}
          </Button>
        </footer>
      </form>
    </div>
  )
}

function StudentSearch({
  value,
  label,
  onSelect,
  onClear,
}: {
  value: string
  label: string
  onSelect: (student: StudentSearchHit) => void | Promise<void>
  onClear: () => void
}) {
  const [query, setQuery] = useState(label)
  const [hits, setHits] = useState<StudentSearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const request = useRef(0)

  useEffect(() => {
    setQuery(label)
  }, [label])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  useEffect(() => {
    const term = query.trim()
    if (!term || term === label) {
      setHits([])
      setLoading(false)
      return
    }
    const timeout = window.setTimeout(() => {
      const ticket = request.current + 1
      request.current = ticket
      setLoading(true)
      void searchStudents(term).then((result) => {
        if (ticket !== request.current) return
        setHits(result.students)
        setLoading(false)
        setOpen(true)
      })
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [query, label])

  return (
    <div ref={rootRef} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94A3B8]" />
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          if (value) onClear()
          setOpen(true)
        }}
        onFocus={() => {
          if (hits.length > 0) setOpen(true)
        }}
        placeholder="Buscar por nome, telefone ou CPF"
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-[#0B1220]/10 bg-white pr-3 pl-10 text-sm font-normal outline-none focus:border-[#3B82F6]"
      />
      {open && query.trim() && query.trim() !== label ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-[#0B1220]/10 bg-white p-1.5 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2.5 text-sm text-[#64748B]">Buscando...</li>
          ) : hits.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-[#64748B]">Nenhum aluno encontrado.</li>
          ) : (
            hits.map((student) => {
              const selected = student.id === value
              return (
                <li key={student.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setQuery(student.name)
                      setOpen(false)
                      void onSelect(student)
                    }}
                    className={cn(
                      "flex w-full flex-col rounded-lg px-3 py-2.5 text-left",
                      selected ? "bg-[#3B82F6] text-white" : "text-[#0B1220] hover:bg-[#F1F5F9]",
                    )}
                  >
                    <span className="text-sm font-medium">{student.name}</span>
                    {student.instrument ? (
                      <span className={cn("text-xs", selected ? "text-white/80" : "text-[#64748B]")}>
                        {student.instrument}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}

function DueDayField({
  value,
  onChange,
}: {
  value: number
  onChange: (day: number) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col gap-1.5 text-sm font-medium">
        Vence no dia
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex h-11 items-center justify-between rounded-xl bg-white px-3 ring-1 ring-[#0B1220]/10"
        >
          <span>Dia {value}</span>
          <CalendarDays className="mr-1 size-4 text-[#64748B]" />
        </button>
      </div>
      {open ? (
        <DueCalendar
          value={value}
          onSelect={(day) => {
            onChange(day)
            setOpen(false)
          }}
        />
      ) : null}
    </>
  )
}

function DueCalendar({
  value,
  onSelect,
}: {
  value: number
  onSelect: (day: number) => void
}) {
  const [cursor, setCursor] = useState(() => monthForDay(value))
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(cursor.year, cursor.month, 1))
  const leading = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7
  const count = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: count }, (_, index) => index + 1),
  ]

  function moveMonth(delta: number) {
    const next = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: next.getFullYear(), month: next.getMonth() })
  }

  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-[#0B1220]/10 sm:col-span-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => moveMonth(-1)}
          className="grid size-8 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold capitalize">{label}</p>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => moveMonth(1)}
          className="grid size-8 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {COLUMN_WEEKDAYS.map((weekday) => (
          <span
            key={weekday}
            className="text-center text-[11px] font-semibold text-[#94A3B8]"
          >
            {WEEKDAY_LETTER[weekday]}
          </span>
        ))}
        {cells.map((day, index) =>
          day === null ? (
            <span key={`empty-${index}`} />
          ) : (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "h-9 rounded-lg text-sm font-medium",
                day === value
                  ? "bg-[#3B82F6] text-white"
                  : "text-[#0B1220] hover:bg-[#F1F5F9]",
              )}
            >
              {day}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

function monthForDay(day: number) {
  const start = new Date()
  for (let offset = 0; offset < 12; offset += 1) {
    const cursor = new Date(start.getFullYear(), start.getMonth() + offset, 1)
    const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    if (day <= count) return { year: cursor.getFullYear(), month: cursor.getMonth() }
  }
  return { year: start.getFullYear(), month: 0 }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

function formatAmount(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function parseAmount(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/[^\d,.-]/g, "")
  const lastComma = normalized.lastIndexOf(",")
  const lastDot = normalized.lastIndexOf(".")
  const numeric =
    lastComma > lastDot
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "")
  const value = Number(numeric)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

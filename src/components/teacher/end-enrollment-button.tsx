"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { endEnrollment } from "@/app/alunos/actions"
import { Button } from "@/components/ui/button"
import { COLUMN_WEEKDAYS, formatLongDate } from "@/lib/schedule"

const WEEKDAY_LETTER = ["D", "S", "T", "Q", "Q", "S", "S"]
import { cn } from "@/lib/utils"

export function EndEnrollmentButton({
  enrollmentId,
  studentName,
  today,
}: {
  enrollmentId: string
  studentName: string
  today: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [endDate, setEndDate] = useState(today)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onConfirm() {
    if (!reason.trim()) {
      setError("Escreva o motivo.")
      return
    }
    setPending(true)
    setError(undefined)
    const result = await endEnrollment({ enrollmentId, endDate, reason })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          setError(undefined)
          setOpen(true)
        }}
      >
        Encerrar matrícula
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1220]/50 p-4 sm:items-center">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void onConfirm()
            }}
            role="dialog"
            aria-labelledby="end-enrollment-title"
            className="flex max-h-[90svh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="overflow-y-auto px-5 pt-5 pb-4">
              <h2 id="end-enrollment-title" className="text-lg font-semibold">
                Encerrar matrícula
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {studentName} permanece até o dia escolhido. As aulas depois dessa data saem da agenda.
              </p>
              <div className="mt-4">
                <DateMenu value={endDate} onChange={setEndDate} />
              </div>
              <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium">
                Motivo
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  placeholder="Por que a matrícula está sendo encerrada."
                  className="resize-none rounded-xl px-3 py-2.5 font-normal ring-1 ring-[#0B1220]/10 outline-none focus:ring-[#DC2626]"
                />
              </label>
              {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-[#0B1220]/8 px-5 py-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Voltar
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Encerrando..." : "Encerrar matrícula"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  )
}

function DateMenu({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [year, month] = value.split("-").map(Number)
  const [cursor, setCursor] = useState({ year, month: month - 1 })
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

  function ymd(day: number) {
    return `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium">
      Dia de encerramento
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 items-center justify-between rounded-xl bg-white px-3 ring-1 ring-[#0B1220]/10"
      >
        <span className="font-normal capitalize">{formatLongDate(value)}</span>
        <CalendarDays className="mr-1 size-4 text-[#64748B]" />
      </button>
      {open ? (
        <div className="rounded-xl bg-[#F8FAFC] p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => moveMonth(-1)}
              className="grid size-8 place-items-center rounded-lg text-[#64748B] hover:bg-white"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-semibold capitalize">{label}</p>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => moveMonth(1)}
              className="grid size-8 place-items-center rounded-lg text-[#64748B] hover:bg-white"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {COLUMN_WEEKDAYS.map((weekday) => (
              <span key={weekday} className="text-center text-[11px] font-semibold text-[#94A3B8]">
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
                  onClick={() => {
                    onChange(ymd(day))
                    setOpen(false)
                  }}
                  className={cn(
                    "h-9 rounded-lg text-sm font-medium",
                    ymd(day) === value ? "bg-[#DC2626] text-white" : "text-[#0B1220] hover:bg-white",
                  )}
                >
                  {day}
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

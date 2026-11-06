"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Printer,
  Search,
  SlidersHorizontal,
  Undo2,
  X,
} from "lucide-react"
import { searchStudents, type StudentSearchHit } from "@/app/agenda/actions"
import {
  markChargePaid,
  undoChargePayment,
  type ChargeRow,
} from "@/app/faturamento/actions"
import { StudentAvatar } from "@/components/teacher/student-avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MONTH_SHORT,
  PAYMENT_METHODS,
  addMonths,
  displayStatus,
  formatAmountInput,
  formatBrl,
  chargeKindLabel,
  formatCompetence,
  formatCompetenceLong,
  formatDateBr,
  isStatusFilter,
  maxChargeMonth,
  minChargeMonth,
  statusLabel,
  whatsappHref,
  type ChargeDisplayStatus,
  type ChargeStatusFilter,
} from "@/lib/charges"
import { cn } from "@/lib/utils"

const fieldClass =
  "h-11 rounded-xl border border-[#0B1220]/10 px-3 font-normal outline-none focus:border-[#3B82F6]"

export function ChargesBoard({
  rows,
  month,
  today,
  studentFilter,
  statusFilter,
}: {
  rows: ChargeRow[]
  month: string
  today: string
  studentFilter: { id: string; name: string } | null
  statusFilter: string
}) {
  const status = isStatusFilter(statusFilter) ? statusFilter : "all"
  const filtered = Boolean(studentFilter || status !== "all")
  const [pay, setPay] = useState<ChargeRow | null>(null)
  const [undo, setUndo] = useState<ChargeRow | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <MonthNav month={month} today={today} studentId={studentFilter?.id} status={status} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href={chargesHref({
              month,
              today,
              studentId: studentFilter?.id,
              status,
              path: "/faturamento/relatorio",
            })}
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            <Printer data-icon="inline-start" />
            Imprimir PDF
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            className="w-full sm:w-auto"
          >
            <SlidersHorizontal data-icon="inline-start" />
            Filtros
            {filtered ? (
              <span className="ml-1 rounded-full bg-[#3B82F6] px-1.5 text-[11px] font-semibold text-white">
                {(studentFilter ? 1 : 0) + (status !== "all" ? 1 : 0)}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-10 text-center text-sm text-[#64748B]">
          {emptyLabel(month, today, filtered)}
        </p>
      ) : (
        <>
          <ul className="mt-4 grid gap-3 md:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <ChargeCard
                  row={row}
                  today={today}
                  onPay={() => setPay(row)}
                  onUndo={() => setUndo(row)}
                />
              </li>
            ))}
          </ul>
          <div className="mt-4 hidden overflow-hidden rounded-[22px] border border-[#e2e8f0] bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] text-left text-xs font-semibold tracking-wide text-[#64748B] uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Aluno</th>
                  <th className="px-4 py-3 font-semibold">Referência</th>
                  <th className="px-4 py-3 font-semibold">Vencimento</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const shown = displayStatus(row.status, row.dueDate, today)
                  return (
                    <tr key={row.id} className="border-t border-[#0B1220]/5">
                      <td className="px-4 py-3">
                        <StudentLink row={row} />
                      </td>
                      <td className="px-4 py-3 text-[#334155]">
                        <p>{chargeKindLabel(row.kind)}</p>
                        <p className="text-xs text-[#94A3B8]">
                          {row.kind === "one_off"
                            ? formatDateBr(row.dueDate)
                            : formatCompetence(row.competence)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[#334155]">{formatDateBr(row.dueDate)}</td>
                      <td className="px-4 py-3 font-medium tabular-nums">{formatBrl(row.amount)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={shown} />
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          row={row}
                          today={today}
                          onPay={() => setPay(row)}
                          onUndo={() => setUndo(row)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {filtersOpen ? (
        <FiltersModal
          month={month}
          today={today}
          studentFilter={studentFilter}
          status={status}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
      {pay ? <PayModal row={pay} today={today} onClose={() => setPay(null)} /> : null}
      {undo ? <UndoModal row={undo} onClose={() => setUndo(null)} /> : null}
    </div>
  )
}

function MonthNav({
  month,
  today,
  studentId,
  status,
}: {
  month: string
  today: string
  studentId?: string
  status: ChargeStatusFilter
}) {
  const min = minChargeMonth(today)
  const max = maxChargeMonth(today)
  const prev = addMonths(month, -1)
  const next = addMonths(month, 1)
  return (
    <div className="flex items-center gap-2">
      <MonthNavLink
        href={chargesHref({ month: prev, today, studentId, status })}
        label="Mês anterior"
        disabled={month <= min}
      >
        <ChevronLeft />
      </MonthNavLink>
      <p className="min-w-40 text-center text-sm font-semibold">
        {formatCompetenceLong(month)}
      </p>
      <MonthNavLink
        href={chargesHref({ month: next, today, studentId, status })}
        label="Próximo mês"
        disabled={month >= max}
      >
        <ChevronRight />
      </MonthNavLink>
    </div>
  )
}

function MonthNavLink({
  href,
  label,
  disabled,
  children,
}: {
  href: string
  label: string
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "pointer-events-none opacity-40")}
      >
        {children}
      </span>
    )
  }
  return (
    <Link href={href} aria-label={label} className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
      {children}
    </Link>
  )
}

function ChargeCard({
  row,
  today,
  onPay,
  onUndo,
}: {
  row: ChargeRow
  today: string
  onPay: () => void
  onUndo: () => void
}) {
  const shown = displayStatus(row.status, row.dueDate, today)
  return (
    <article className="rounded-[22px] border border-[#e2e8f0] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <StudentLink row={row} />
        <StatusBadge status={shown} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-[#94A3B8]">Referência</dt>
          <dd className="font-medium">
            {chargeKindLabel(row.kind)} ·{" "}
            {row.kind === "one_off" ? formatDateBr(row.dueDate) : formatCompetence(row.competence)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[#94A3B8]">Vencimento</dt>
          <dd className="font-medium">{formatDateBr(row.dueDate)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-[#94A3B8]">Valor</dt>
          <dd className="text-base font-semibold tabular-nums">{formatBrl(row.amount)}</dd>
        </div>
      </dl>
      <div className="mt-3">
        <RowActions row={row} today={today} onPay={onPay} onUndo={onUndo} stacked />
      </div>
    </article>
  )
}

function StudentLink({ row }: { row: ChargeRow }) {
  return (
    <Link href={`/alunos/${row.studentId}`} className="flex min-w-0 items-center gap-2.5">
      <StudentAvatar name={row.studentName} photoUrl={row.photoUrl} color={row.studentColor} size="sm" />
      <span className="truncate font-medium text-[#0B1220]">{row.studentName}</span>
    </Link>
  )
}

function StatusBadge({ status }: { status: ChargeDisplayStatus }) {
  const styles = {
    pending: "bg-[#EFF6FF] text-[#1D4ED8]",
    due_today: "bg-[#FEF3C7] text-[#B45309]",
    overdue: "bg-[#FEF2F2] text-[#B91C1C]",
    paid: "bg-[#ECFDF5] text-[#047857]",
  }
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", styles[status])}>
      {statusLabel(status)}
    </span>
  )
}

function RowActions({
  row,
  today,
  onPay,
  onUndo,
  stacked = false,
}: {
  row: ChargeRow
  today: string
  onPay: () => void
  onUndo: () => void
  stacked?: boolean
}) {
  const shown = displayStatus(row.status, row.dueDate, today)
  const paid = shown === "paid"
  const whatsapp = whatsappHref(row.studentPhone, chargeMessage(row))
  return (
    <div className={cn("flex flex-wrap gap-2", stacked && "flex-col sm:flex-row")}>
      {paid ? (
        <>
          <Link
            href={`/faturamento/${row.id}/recibo`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <FileText data-icon="inline-start" />
            Recibo
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={onUndo}>
            <Undo2 data-icon="inline-start" />
            Estornar
          </Button>
        </>
      ) : (
        <>
          <Button type="button" size="sm" onClick={onPay}>
            <Check data-icon="inline-start" />
            Marcar pago
          </Button>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              aria-label="Cobrar no WhatsApp"
              title="WhatsApp"
              className="inline-flex size-8 shrink-0 items-center justify-center"
            >
              <Image src="/whatsapp.png" alt="" width={32} height={32} className="size-8" />
            </a>
          ) : null}
        </>
      )}
    </div>
  )
}

function FiltersModal({
  month,
  today,
  studentFilter,
  status,
  onClose,
}: {
  month: string
  today: string
  studentFilter: { id: string; name: string } | null
  status: ChargeStatusFilter
  onClose: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [nextMonth, setNextMonth] = useState(month)
  const [studentId, setStudentId] = useState(studentFilter?.id ?? "")
  const [studentLabel, setStudentLabel] = useState(studentFilter?.name ?? "")
  const [nextStatus, setNextStatus] = useState<ChargeStatusFilter>(status)

  function apply() {
    router.replace(
      chargesHref({
        month: nextMonth,
        today,
        studentId,
        status: nextStatus,
        path: pathname,
      }),
    )
    onClose()
  }

  function clear() {
    router.replace("/faturamento")
    onClose()
  }

  return (
    <ModalLayer onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="charges-filters-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="charges-filters-title" className="text-lg font-semibold">
            Filtros
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 shrink-0 place-items-center rounded-full text-[#64748B] hover:bg-[#F1F5F9]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            Período
            <MonthPicker value={nextMonth} today={today} onChange={setNextMonth} />
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Aluno
            <StudentPicker
              value={studentId}
              label={studentLabel}
              onSelect={(student) => {
                setStudentId(student.id)
                setStudentLabel(student.name)
              }}
              onClear={() => {
                setStudentId("")
                setStudentLabel("")
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Status
            <select
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as ChargeStatusFilter)}
              className={fieldClass}
            >
              <option value="all">Todos</option>
              <option value="pending">A vencer</option>
              <option value="overdue">Atrasado</option>
              <option value="paid">Pago</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={clear}>
            Limpar
          </Button>
          <Button type="button" onClick={apply}>
            Aplicar
          </Button>
        </div>
      </div>
    </ModalLayer>
  )
}

function PayModal({
  row,
  today,
  onClose,
}: {
  row: ChargeRow
  today: string
  onClose: () => void
}) {
  const router = useRouter()
  const [paidAt, setPaidAt] = useState(today)
  const [amount, setAmount] = useState(formatAmountInput(row.amount))
  const [method, setMethod] = useState("pix")
  const [notes, setNotes] = useState(row.notes ?? "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    const result = await markChargePaid({
      chargeId: row.id,
      paidAt,
      paidAmount: amount,
      method,
      notes,
    })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <ModalLayer onClose={pending ? undefined : onClose}>
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-charge-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="pay-charge-title" className="text-lg font-semibold">
          Marcar como pago
        </h2>
        <p className="mt-1 text-sm text-[#64748B]">
          {row.studentName} · {chargeKindLabel(row.kind)} ·{" "}
          {row.kind === "one_off" ? formatDateBr(row.dueDate) : formatCompetence(row.competence)}
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Data do pagamento
            <input
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              required
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Valor recebido
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Forma de pagamento
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className={fieldClass}
            >
              {PAYMENT_METHODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Observação
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="rounded-xl border border-[#0B1220]/10 px-3 py-2 font-normal outline-none focus:border-[#3B82F6]"
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Confirmar baixa"}
          </Button>
        </div>
      </form>
    </ModalLayer>
  )
}

function UndoModal({ row, onClose }: { row: ChargeRow; onClose: () => void }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function onConfirm() {
    setPending(true)
    setError(undefined)
    const result = await undoChargePayment(row.id)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <ModalLayer onClose={pending ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="undo-charge-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="undo-charge-title" className="text-lg font-semibold">
          Estornar pagamento
        </h2>
        <p className="mt-2 text-sm text-[#475569]">
          Voltar a cobrança de <span className="font-semibold text-[#0B1220]">{row.studentName}</span>{" "}
          ({chargeKindLabel(row.kind)} ·{" "}
          {row.kind === "one_off" ? formatDateBr(row.dueDate) : formatCompetence(row.competence)}) para em
          aberto?
        </p>
        {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? "Estornando..." : "Estornar"}
          </Button>
        </div>
      </div>
    </ModalLayer>
  )
}

function StudentPicker({
  value,
  label,
  onSelect,
  onClear,
}: {
  value: string
  label: string
  onSelect: (student: StudentSearchHit) => void
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
      {value ? (
        <button
          type="button"
          onClick={() => {
            onClear()
            setQuery("")
            setHits([])
          }}
          aria-label="Limpar aluno"
          className="absolute top-1/2 right-2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full text-[#64748B] hover:bg-[#F1F5F9]"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
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
        placeholder="Todos os alunos"
        autoComplete="off"
        className={`${fieldClass} w-full pr-10 pl-10`}
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
            hits.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={student.id === value}
                  onClick={() => {
                    setQuery(student.name)
                    setOpen(false)
                    onSelect(student)
                  }}
                  className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left text-[#0B1220] hover:bg-[#F1F5F9]"
                >
                  <span className="text-sm font-medium">{student.name}</span>
                  {student.instrument ? (
                    <span className="text-xs text-[#64748B]">{student.instrument}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}

function ModalLayer({
  onClose,
  children,
}: {
  onClose?: () => void
  children: React.ReactNode
}) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current?.()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0B1220]/40 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current?.()
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

function MonthPicker({
  value,
  today,
  onChange,
}: {
  value: string
  today: string
  onChange: (month: string) => void
}) {
  const current = today.slice(0, 7)
  const min = minChargeMonth(today)
  const max = maxChargeMonth(today)
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => Number(value.slice(0, 4)))
  const rootRef = useRef<HTMLDivElement>(null)
  const minYear = Number(min.slice(0, 4))
  const maxYear = Number(max.slice(0, 4))

  useEffect(() => {
    setYear(Number(value.slice(0, 4)))
  }, [value])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  function choose(month: string) {
    onChange(month)
    setYear(Number(month.slice(0, 4)))
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className={cn(
          fieldClass,
          "flex w-full items-center justify-between gap-3 bg-white pr-3 text-left font-medium",
        )}
      >
        <span className="truncate">{formatCompetenceLong(value)}</span>
        <CalendarDays className="size-4 shrink-0 text-[#64748B]" />
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Escolher mês"
          className="absolute z-30 mt-1.5 w-full rounded-2xl border border-[#0B1220]/10 bg-white p-3 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Ano anterior"
              disabled={year <= minYear}
              onClick={() => setYear((currentYear) => currentYear - 1)}
              className="grid size-8 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="text-sm font-semibold tabular-nums">{year}</p>
            <button
              type="button"
              aria-label="Próximo ano"
              disabled={year >= maxYear}
              onClick={() => setYear((currentYear) => currentYear + 1)}
              className="grid size-8 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {MONTH_SHORT.map((label, index) => {
              const month = `${year}-${String(index + 1).padStart(2, "0")}`
              const selected = month === value
              const enabled = month >= min && month <= max
              return (
                <button
                  key={month}
                  type="button"
                  disabled={!enabled}
                  onClick={() => choose(month)}
                  className={cn(
                    "h-9 rounded-lg text-sm font-medium capitalize",
                    selected
                      ? "bg-[#3B82F6] text-white"
                      : enabled
                        ? "text-[#0B1220] hover:bg-[#F1F5F9]"
                        : "cursor-not-allowed text-[#CBD5E1]",
                    !selected && month === current && enabled ? "ring-1 ring-[#3B82F6]/35" : null,
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => choose(current)}
            className="mt-2 w-full rounded-lg py-1.5 text-xs font-semibold text-[#3B82F6] hover:bg-[#F1F5F9]"
          >
            Este mês
          </button>
        </div>
      ) : null}
    </div>
  )
}

function emptyLabel(month: string, today: string, filtered: boolean) {
  if (filtered) return "Nenhuma cobrança com esses filtros."
  if (month > today.slice(0, 7)) {
    return `As cobranças de ${formatCompetenceLong(month)} são geradas no começo do mês.`
  }
  return "Nenhuma cobrança neste mês. Mensalidades, hora/aula e aulas avulsas aparecem aqui."
}

function chargesHref({
  month,
  today,
  studentId,
  status,
  path = "/faturamento",
}: {
  month: string
  today: string
  studentId?: string
  status: ChargeStatusFilter
  path?: string
}) {
  const params = new URLSearchParams()
  if (month && month !== today.slice(0, 7)) params.set("competencia", month)
  if (studentId) params.set("aluno", studentId)
  if (status !== "all") params.set("status", status)
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

function chargeMessage(row: ChargeRow) {
  if (row.kind === "one_off") {
    return `Olá, ${row.studentName}! A aula avulsa de ${formatDateBr(row.dueDate)} no valor de ${formatBrl(row.amount)} está em aberto.`
  }
  if (row.kind === "lesson") {
    return `Olá, ${row.studentName}! As aulas de ${formatCompetence(row.competence)} no valor de ${formatBrl(row.amount)} vencem em ${formatDateBr(row.dueDate)}.`
  }
  return `Olá, ${row.studentName}! A mensalidade de ${formatCompetence(row.competence)} no valor de ${formatBrl(row.amount)} vence em ${formatDateBr(row.dueDate)}.`
}

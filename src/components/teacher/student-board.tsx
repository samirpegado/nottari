"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronLeft,
  CirclePlay,
  File,
  FileText,
  Library,
  MessageCircle,
  MoreVertical,
  Music,
  NotebookPen,
  Pencil,
} from "lucide-react"
import { getStudent } from "@/app/alunos/actions"
import {
  deleteLessonNote,
  listShareableMaterials,
  saveLessonNote,
  setStudentMaterialAccess,
  type AssignedMaterial,
  type StudentBoard as BoardData,
  type TimelineEntry,
} from "@/app/alunos/[id]/actions"
import { openMaterial } from "@/app/materiais/actions"
import { EditEnrollmentButton } from "@/components/teacher/edit-enrollment-button"
import { EndEnrollmentButton } from "@/components/teacher/end-enrollment-button"
import { QuickMetronome } from "@/components/teacher/quick-metronome"
import { StudentAvatar } from "@/components/teacher/student-avatar"
import { StudentActions } from "@/components/teacher/students-toolbar"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatBrPhone } from "@/lib/auth-fields"
import { formatBrl, formatCompetence, statusLabel, whatsappHref } from "@/lib/charges"
import {
  LESSON_STATUS_META,
  LESSON_STATUSES,
  formatLessonStamp,
  formatRelativeAgo,
  lessonHasNote,
  type LessonStatus,
} from "@/lib/lessons"
import { MATERIAL_TYPE_META, type MaterialType } from "@/lib/materials"
import { WEEKDAY_LONG, saoPauloNow, timeToMinutes } from "@/lib/schedule"
import { cn } from "@/lib/utils"

const fieldClass =
  "h-11 rounded-xl border border-[#0B1220]/10 px-3 font-normal outline-none focus:border-[#3B82F6]"

export function StudentBoard({ board }: { board: BoardData }) {
  const router = useRouter()
  const [composer, setComposer] = useState<TimelineEntry | "new" | null>(null)
  const [entryMenu, setEntryMenu] = useState<TimelineEntry | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const student = board.student
  const whatsapp = whatsappHref(student.phone, `Olá, ${student.name}!`)

  return (
    <div>
      <Link
        href="/alunos"
        className="inline-flex items-center gap-1 text-sm font-medium text-[#64748B] hover:text-[#0B1220]"
      >
        <ChevronLeft className="size-4" />
        Alunos
      </Link>

      <header className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <StudentAvatar
            name={student.name}
            photoUrl={student.photoUrl}
            color={student.color}
            size="lg"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Aluno</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">{student.name}</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              {formatBrPhone(student.phone)}
              {student.email ? ` · ${student.email}` : ""}
            </p>
            {student.instrument || student.skillLevel ? (
              <p className="mt-2 flex flex-wrap gap-2 text-sm">
                {student.instrument ? (
                  <span className="inline-flex rounded-full bg-[#dbeafe] px-3 py-1 font-semibold text-[#1e40af]">
                    {student.instrument}
                  </span>
                ) : null}
                {student.skillLevel ? (
                  <span className="inline-flex rounded-full bg-[#f1f5f9] px-3 py-1 font-medium text-[#334155]">
                    {student.skillLevel}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" className="w-full sm:w-auto" onClick={() => setComposer("new")}>
            <NotebookPen data-icon="inline-start" />
            Registrar aula
          </Button>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
            >
              <MessageCircle data-icon="inline-start" />
              WhatsApp
            </a>
          ) : (
            <Button type="button" variant="outline" className="w-full sm:w-auto" disabled>
              WhatsApp
            </Button>
          )}
          <StudentActions studentId={student.id} studentName={student.name} variant="header" />
        </div>
      </header>

      <WhereWeLeft lastNote={board.lastNote} today={board.today} onRegister={() => setComposer("new")} />

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-[22px] border border-[#e2e8f0] bg-white p-4">
            <h2 className="text-sm font-semibold">Prontuário</h2>

            {board.timeline.length === 0 ? (
              <p className="mt-3 rounded-xl bg-[#F8FAFC] px-3 py-4 text-sm text-[#64748B]">
                Nenhuma aula registrada ainda. Toque em Registrar aula para anotar onde vocês pararam.
              </p>
            ) : (
              <>
                <ol className="mt-3">
                  {board.timeline.map((entry, index) => (
                    <TimelineItem
                      key={entry.lessonId}
                      entry={entry}
                      today={board.today}
                      last={index === board.timeline.length - 1}
                      onMenu={() => setEntryMenu(entry)}
                    />
                  ))}
                </ol>
                {board.pages > 1 ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[#64748B]">
                      {showingFrom(board)}–{showingTo(board)} de {board.total}
                    </p>
                    <div className="flex items-center gap-2">
                      <PageLink studentId={student.id} page={board.page - 1} disabled={board.page <= 1}>
                        Anterior
                      </PageLink>
                      <PageLink studentId={student.id} page={board.page + 1} disabled={board.page >= board.pages}>
                        Próxima
                      </PageLink>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <MaterialsCard materials={board.materials} onShare={() => setShareOpen(true)} />
            <AccessCard studentId={student.id} name={student.name} phone={student.phone} />
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <QuickMetronome initialBpm={board.lastNote?.bpm} className="min-h-0" />
          <EnrollmentCard board={board} />
          <ChargeCard studentId={student.id} charge={board.charge} />
        </aside>
      </div>

      {composer ? (
        <NoteModal
          studentId={student.id}
          today={board.today}
          lastNote={board.lastNote}
          entry={composer === "new" ? null : composer}
          onClose={() => setComposer(null)}
        />
      ) : null}
      {entryMenu ? (
        <EntryActions
          studentId={student.id}
          entry={entryMenu}
          onEdit={() => {
            setComposer(entryMenu)
            setEntryMenu(null)
          }}
          onClose={() => setEntryMenu(null)}
          onDeleted={() => {
            setEntryMenu(null)
            router.refresh()
          }}
        />
      ) : null}
      {shareOpen ? (
        <ShareMaterialsModal studentId={student.id} onClose={() => setShareOpen(false)} />
      ) : null}
    </div>
  )
}

function WhereWeLeft({
  lastNote,
  today,
  onRegister,
}: {
  lastNote: TimelineEntry | null
  today: string
  onRegister: () => void
}) {
  if (!lastNote || !lessonHasNote(lastNote)) {
    return (
      <section className="mt-6 rounded-[22px] border border-[#BFDBFE] bg-[#EFF6FF] p-5">
        <p className="text-xs font-semibold tracking-wide text-[#1D4ED8] uppercase">Onde paramos</p>
        <p className="mt-2 text-sm text-[#1E3A8A]">
          Ainda não há registro. Na primeira aula, anote a peça, a página e o BPM — na próxima você abre o aluno e já
          sabe por onde continuar.
        </p>
        <Button type="button" className="mt-4" onClick={onRegister}>
          Registrar a primeira aula
        </Button>
      </section>
    )
  }

  const bits = [lastNote.piece, lastNote.measure].filter(Boolean)
  return (
    <section className="mt-6 rounded-[22px] border border-[#BFDBFE] bg-[#EFF6FF] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#1D4ED8] uppercase">Onde paramos</p>
          <p className="mt-1 text-lg font-semibold text-[#0B1220]">
            {bits.join(" · ") || "Aula registrada"}
          </p>
        </div>
        <span className="text-xs font-medium text-[#1D4ED8]">{formatRelativeAgo(lastNote.scheduledAt, today)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {lastNote.bpm ? (
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold tabular-nums text-[#1D4ED8]">
            {lastNote.bpm} BPM
          </span>
        ) : null}
        <span className={cn("inline-flex rounded-full px-3 py-1 text-sm font-semibold", LESSON_STATUS_META[lastNote.status].chip)}>
          {LESSON_STATUS_META[lastNote.status].label}
        </span>
      </div>
      {lastNote.homework ? (
        <p className="mt-3 text-sm text-[#1E3A8A]">
          <span className="font-semibold">Tarefa: </span>
          {lastNote.homework}
        </p>
      ) : null}
    </section>
  )
}

function TimelineItem({
  entry,
  today,
  last,
  onMenu,
}: {
  entry: TimelineEntry
  today: string
  last: boolean
  onMenu: () => void
}) {
  const meta = LESSON_STATUS_META[entry.status]
  const title = [entry.piece, entry.measure, entry.bpm ? `${entry.bpm} BPM` : null]
    .filter(Boolean)
    .join(" · ")
  return (
    <li className="flex gap-2.5">
      <div className="flex w-4 shrink-0 flex-col items-center">
        <span className={cn("mt-1.5 size-2 rounded-full", meta.dot)} />
        {last ? null : <span className="mt-1 w-px flex-1 bg-[#E2E8F0]" />}
      </div>
      <article className={cn("min-w-0 flex-1 pb-3", last && "pb-0.5")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 text-sm leading-5">
              <span className="font-semibold">{formatLessonStamp(entry.scheduledAt, today)}</span>
              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.chip)}>
                {meta.label}
              </span>
            </p>
            {title ? <p className="mt-0.5 truncate text-sm text-[#334155]">{title}</p> : null}
            {entry.homework ? (
              <p className="mt-0.5 truncate text-xs text-[#475569]">Tarefa: {entry.homework}</p>
            ) : null}
            {entry.notes ? <p className="mt-0.5 line-clamp-2 text-xs text-[#64748B]">{entry.notes}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Mais ações"
            onClick={onMenu}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
          >
            <MoreVertical className="size-4" />
          </button>
        </div>
      </article>
    </li>
  )
}

function EnrollmentCard({ board }: { board: BoardData }) {
  const plan = board.enrollment
  const slot = plan?.rules[0]
  const now = saoPauloNow()
  return (
    <section className="rounded-[22px] border border-[#e2e8f0] bg-white p-4">
      <h2 className="text-sm font-semibold">Matrícula</h2>
      {plan ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-[#334155]">
            {plan.billingType === "monthly" ? "Mensalidade" : "Hora/aula"} de {formatBrl(plan.amount)}
            {plan.dueDay ? `, vence no dia ${plan.dueDay}` : ""}
          </p>
          {plan.rules.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm text-[#334155]">
              {plan.rules.map((rule) => (
                <li key={rule.id}>
                  {WEEKDAY_LONG[rule.weekday]}, {rule.startTime.slice(0, 5)} · {rule.durationMinutes} min
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#64748B]">Nenhum horário fixo nesta matrícula.</p>
          )}
          {plan.notes ? <p className="text-sm text-[#64748B]">{plan.notes}</p> : null}
          <div className="flex flex-wrap gap-2">
            {slot ? (
              <EditEnrollmentButton
                student={{ id: board.student.id, name: board.student.name }}
                weekday={slot.weekday}
                startMinutes={timeToMinutes(slot.startTime)}
                duration={slot.durationMinutes}
                blocks={board.scheduleBlocks}
                todayYmd={board.today}
                nowMinutes={now.minutes}
                editing={{
                  ruleId: slot.id,
                  enrollmentId: plan.id,
                  studentId: board.student.id,
                  billingType: plan.billingType,
                  amount: plan.amount,
                  dueDay: plan.dueDay,
                  notes: plan.notes ?? "",
                }}
              />
            ) : null}
            <EndEnrollmentButton enrollmentId={plan.id} studentName={board.student.name} today={board.today} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#64748B]">
          Este aluno ainda não tem matrícula ativa.{" "}
          <Link href="/agenda" className="font-semibold text-[#1D4ED8] hover:underline">
            Matricular na Agenda
          </Link>
        </p>
      )}
    </section>
  )
}

function MaterialsCard({
  materials,
  onShare,
}: {
  materials: AssignedMaterial[]
  onShare: () => void
}) {
  const [error, setError] = useState<string>()

  async function open(id: string) {
    setError(undefined)
    const result = await openMaterial(id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  return (
    <section className="rounded-[22px] border border-[#e2e8f0] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Materiais do aluno</h2>
        <Library className="size-4 text-[#94A3B8]" />
      </div>
      {materials.length === 0 ? (
        <p className="mt-3 text-sm text-[#64748B]">Nenhum material compartilhado ainda.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {materials.map((item) => {
            const meta = MATERIAL_TYPE_META[item.type]
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void open(item.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left hover:bg-[#F8FAFC]"
                >
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", meta.icon)}>
                    <TypeIcon type={item.type} className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {error ? <p className="mt-2 text-sm text-[#B91C1C]">{error}</p> : null}
      <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={onShare}>
        Compartilhar material
      </Button>
      <Link
        href="/materiais"
        className="mt-2 block text-center text-xs font-medium text-[#64748B] hover:text-[#1D4ED8]"
      >
        Abrir biblioteca
      </Link>
    </section>
  )
}

function ChargeCard({
  studentId,
  charge,
}: {
  studentId: string
  charge: BoardData["charge"]
}) {
  return (
    <section className="rounded-[22px] border border-[#e2e8f0] bg-white p-4">
      <h2 className="text-sm font-semibold">Mensalidades</h2>
      {charge ? (
        <p className="mt-3 text-sm text-[#334155]">
          {formatCompetence(charge.competence)} · {formatBrl(charge.amount)} · {statusLabel(charge.status)}
        </p>
      ) : (
        <p className="mt-3 text-sm text-[#64748B]">Nenhuma cobrança neste mês.</p>
      )}
      <Link
        href={`/mensalidades?aluno=${studentId}`}
        className="mt-3 inline-flex text-sm font-semibold text-[#1D4ED8] hover:underline"
      >
        Ver mensalidades
      </Link>
    </section>
  )
}

function AccessCard({ studentId, name, phone }: { studentId: string; name: string; phone: string }) {
  const [pin, setPin] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function loadPin() {
    setPending(true)
    setError(undefined)
    const result = await getStudent(studentId)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return null
    }
    setPin(result.student.pin)
    return result.student.pin
  }

  async function sendPin() {
    const value = pin ?? (await loadPin())
    if (!value) return
    const href = whatsappHref(
      phone,
      `Olá, ${name}! Seu acesso à área do aluno no Nottari:\nTelefone: ${formatBrPhone(phone)}\nPIN: ${value}`,
    )
    if (href) window.open(href, "_blank", "noopener,noreferrer")
  }

  return (
    <section className="rounded-[22px] border border-[#e2e8f0] bg-white p-4">
      <h2 className="text-sm font-semibold">Acesso do aluno</h2>
      <p className="mt-3 text-sm text-[#334155]">{formatBrPhone(phone) || "Sem telefone"}</p>
      <p className="mt-1 text-sm tabular-nums text-[#334155]">PIN {pin ?? "••••"}</p>
      {error ? <p className="mt-2 text-sm text-[#B91C1C]">{error}</p> : null}
      <div className="mt-3 flex flex-col gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void loadPin()} disabled={pending}>
          {pin ? "Atualizar PIN" : pending ? "Abrindo..." : "Mostrar PIN"}
        </Button>
        <Button type="button" size="sm" onClick={() => void sendPin()} disabled={pending || !phone}>
          Enviar por WhatsApp
        </Button>
      </div>
    </section>
  )
}

function NoteModal({
  studentId,
  today,
  lastNote,
  entry,
  onClose,
}: {
  studentId: string
  today: string
  lastNote: TimelineEntry | null
  entry: TimelineEntry | null
  onClose: () => void
}) {
  const router = useRouter()
  const editing = Boolean(entry)
  const seed = entry ?? lastNote
  const [date, setDate] = useState(entry?.ymd ?? today)
  const [status, setStatus] = useState<LessonStatus>(entry?.status ?? "done")
  const [piece, setPiece] = useState(seed?.piece ?? "")
  const [measure, setMeasure] = useState(seed?.measure ?? "")
  const [bpm, setBpm] = useState(seed?.bpm ? String(seed.bpm) : "")
  const [homework, setHomework] = useState(seed?.homework ?? "")
  const [notes, setNotes] = useState(seed?.notes ?? "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    const result = await saveLessonNote({
      studentId,
      lessonId: entry?.lessonId,
      date,
      status,
      piece,
      measure,
      bpm,
      homework,
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{editing ? "Editar aula" : "Registrar aula"}</h2>
        <p className="mt-1 text-sm text-[#64748B]">Peça, onde parou e BPM já vêm da última aula — só ajuste o que mudou.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Data
            <Input
              type="date"
              required
              value={date}
              disabled={editing}
              onChange={(event) => setDate(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as LessonStatus)}
              className={fieldClass}
            >
              {LESSON_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {LESSON_STATUS_META[item].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
          Peça / método
          <Input value={piece} onChange={(event) => setPiece(event.target.value)} className={fieldClass} placeholder="Método Bona" />
        </label>
        <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
          Onde parou
          <Input
            value={measure}
            onChange={(event) => setMeasure(event.target.value)}
            className={fieldClass}
            placeholder="pág. 34, compasso 12"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
          BPM
          <Input
            value={bpm}
            onChange={(event) => setBpm(event.target.value)}
            inputMode="numeric"
            className={fieldClass}
            placeholder="80"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
          Tarefa de casa
          <Input value={homework} onChange={(event) => setHomework(event.target.value)} className={fieldClass} />
        </label>
        <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
          Observações
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="rounded-xl border border-[#0B1220]/10 px-3 py-2 text-sm font-normal outline-none focus:border-[#3B82F6]"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </ModalLayer>
  )
}

function EntryActions({
  studentId,
  entry,
  onEdit,
  onClose,
  onDeleted,
}: {
  studentId: string
  entry: TimelineEntry
  onEdit: () => void
  onClose: () => void
  onDeleted: () => void
}) {
  const [mode, setMode] = useState<"menu" | "delete">("menu")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function confirmDelete() {
    setPending(true)
    const result = await deleteLessonNote({ studentId, lessonId: entry.lessonId })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onDeleted()
  }

  if (mode === "delete") {
    return (
      <ModalLayer onClose={pending ? undefined : onClose}>
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
          <h2 className="text-lg font-semibold">Excluir registro</h2>
          <p className="mt-2 text-sm text-[#475569]">
            Excluir a observação desta aula? Aulas da agenda continuam no calendário; registros avulsos saem do prontuário.
          </p>
          {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={pending}>
              Excluir
            </Button>
          </div>
        </div>
      </ModalLayer>
    )
  }

  return (
    <ModalLayer onClose={onClose}>
      <div
        role="dialog"
        className="w-full max-w-sm rounded-2xl bg-white p-2 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-[#F8FAFC]"
        >
          <Pencil className="size-4" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => setMode("delete")}
          className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#B91C1C] hover:bg-[#FEF2F2]"
        >
          Excluir
        </button>
      </div>
    </ModalLayer>
  )
}

function ShareMaterialsModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const router = useRouter()
  const [items, setItems] = useState<{ id: string; title: string; type: MaterialType; assigned: boolean }[]>()
  const [error, setError] = useState<string>()
  const [pendingId, setPendingId] = useState<string>()

  useEffect(() => {
    void listShareableMaterials(studentId).then((result) => {
      if (!result.ok) {
        setError(result.error)
        return
      }
      setItems(result.materials)
    })
  }, [studentId])

  async function toggle(id: string, assigned: boolean) {
    setPendingId(id)
    setError(undefined)
    const result = await setStudentMaterialAccess(studentId, id, !assigned)
    setPendingId(undefined)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setItems((current) => current?.map((item) => (item.id === id ? { ...item, assigned: !assigned } : item)))
    router.refresh()
  }

  return (
    <ModalLayer onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Compartilhar material</h2>
        <p className="mt-1 text-sm text-[#64748B]">Marque o que este aluno pode ver na área dele.</p>
        {!items ? (
          <p className="mt-4 text-sm text-[#64748B]">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-[#64748B]">
            A biblioteca ainda está vazia.{" "}
            <Link href="/materiais" className="font-semibold text-[#1D4ED8]">
              Enviar um arquivo
            </Link>
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-1">
            {items.map((item) => {
              const meta = MATERIAL_TYPE_META[item.type]
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={pendingId === item.id}
                    onClick={() => void toggle(item.id, item.assigned)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm",
                      item.assigned ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]",
                    )}
                  >
                    <span className={cn("grid size-8 place-items-center rounded-lg", meta.icon)}>
                      <TypeIcon type={item.type} className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                    <span className="text-xs font-semibold text-[#1D4ED8]">{item.assigned ? "Compartilhado" : "Liberar"}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </ModalLayer>
  )
}

function TypeIcon({ type, className }: { type: MaterialType; className?: string }) {
  if (type === "pdf") return <FileText className={className} />
  if (type === "document") return <File className={className} />
  if (type === "audio") return <Music className={className} />
  return <CirclePlay className={className} />
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

function showingFrom(board: BoardData) {
  if (board.total === 0) return 0
  return (board.page - 1) * 5 + 1
}

function showingTo(board: BoardData) {
  return Math.min(board.page * 5, board.total)
}

function PageLink({
  studentId,
  page,
  disabled,
  children,
}: {
  studentId: string
  page: number
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")}>
        {children}
      </span>
    )
  }
  const href = page > 1 ? `/alunos/${studentId}?pagina=${page}` : `/alunos/${studentId}`
  return (
    <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
      {children}
    </Link>
  )
}

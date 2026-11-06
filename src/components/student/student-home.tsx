"use client"

import { useState } from "react"
import { CirclePlay, File, FileText, Library, Music } from "lucide-react"
import { openStudentMaterial, type StudentArea } from "@/app/area/actions"
import { QuickMetronome } from "@/components/teacher/quick-metronome"
import { StudentAvatar } from "@/components/teacher/student-avatar"
import { formatCompetenceLong } from "@/lib/charges"
import {
  LESSON_STATUS_META,
  formatLessonWhen,
  formatRelativeAgo,
  lessonHasNote,
} from "@/lib/lessons"
import { MATERIAL_TYPE_META, type MaterialType } from "@/lib/materials"
import { cn } from "@/lib/utils"

export function StudentHome({ area }: { area: StudentArea }) {
  const student = area.student
  return (
    <div>
      <header className="flex min-w-0 items-start gap-4">
        <StudentAvatar name={student.name} color={student.color} size="lg" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Olá</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">{student.name}</h1>
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
      </header>

      <HomeworkCard note={area.lastNote} today={area.today} />

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <UpcomingCard lessons={area.upcoming} today={area.today} />
          <MaterialsCard materials={area.materials} />
        </div>
        <QuickMetronome initialBpm={area.lastNote?.bpm} className="min-h-0" />
      </div>
    </div>
  )
}

function HomeworkCard({
  note,
  today,
}: {
  note: StudentArea["lastNote"]
  today: string
}) {
  if (!note || !lessonHasNote(note)) {
    return (
      <section className="mt-6 rounded-[22px] border border-[#BFDBFE] bg-[#EFF6FF] p-5">
        <p className="text-xs font-semibold tracking-wide text-[#1D4ED8] uppercase">Sua tarefa</p>
        <p className="mt-2 text-sm text-[#1E3A8A]">
          Ainda não há tarefa registrada. Depois da próxima aula, o professor anota aqui o que estudar.
        </p>
      </section>
    )
  }

  const bits = [note.piece, note.measure].filter(Boolean)
  return (
    <section className="mt-6 rounded-[22px] border border-[#BFDBFE] bg-[#EFF6FF] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#1D4ED8] uppercase">Sua tarefa</p>
          <p className="mt-1 text-lg font-semibold text-[#0B1220]">{bits.join(" · ") || "Última aula"}</p>
        </div>
        <span className="text-xs font-medium text-[#1D4ED8]">{formatRelativeAgo(note.at, today)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {note.bpm ? (
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold tabular-nums text-[#1D4ED8]">
            {note.bpm} BPM
          </span>
        ) : null}
      </div>
      {note.homework ? (
        <p className="mt-3 text-sm text-[#1E3A8A]">
          <span className="font-semibold">Tarefa: </span>
          {note.homework}
        </p>
      ) : null}
    </section>
  )
}

function UpcomingCard({
  lessons,
  today,
}: {
  lessons: StudentArea["upcoming"]
  today: string
}) {
  return (
    <section className="rounded-[22px] border border-[#e2e8f0] bg-white p-4">
      <h2 className="text-sm font-semibold">Aulas de {formatCompetenceLong(`${today.slice(0, 7)}-01`)}</h2>
      {lessons.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[#F8FAFC] px-3 py-4 text-sm text-[#64748B]">
          Nenhuma aula neste mês.
        </p>
      ) : (
        <ol className="mt-3 flex flex-col">
          {lessons.map((lesson, index) => {
            const meta = LESSON_STATUS_META[lesson.status]
            return (
              <li key={lesson.id} className="flex gap-2.5">
                <div className="flex w-4 shrink-0 flex-col items-center">
                  <span className={cn("mt-1.5 size-2 rounded-full", meta.dot)} />
                  {index === lessons.length - 1 ? null : <span className="mt-1 w-px flex-1 bg-[#E2E8F0]" />}
                </div>
                <article className={cn("min-w-0 flex-1 pb-3", index === lessons.length - 1 && "pb-0.5")}>
                  <p className="flex flex-wrap items-center gap-1.5 text-sm leading-5">
                    <span className="font-semibold">{formatLessonWhen(lesson.scheduledAt, today)}</span>
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.chip)}>
                      {meta.label}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-[#64748B]">{lesson.durationMinutes} min</p>
                </article>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

function MaterialsCard({ materials }: { materials: StudentArea["materials"] }) {
  const [error, setError] = useState<string>()

  async function open(id: string) {
    setError(undefined)
    const result = await openStudentMaterial(id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  return (
    <section className="rounded-[22px] border border-[#e2e8f0] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Seus materiais</h2>
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
    </section>
  )
}

function TypeIcon({ type, className }: { type: MaterialType; className?: string }) {
  if (type === "pdf") return <FileText className={className} />
  if (type === "document") return <File className={className} />
  if (type === "audio") return <Music className={className} />
  return <CirclePlay className={className} />
}

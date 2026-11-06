"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { EnrollDialog, type EnrollmentEdit } from "@/components/teacher/enroll-dialog"
import type { EnrollmentDefaults } from "@/components/teacher/enroll-dialog"
import {
  DAY_END,
  DAY_START,
  SLOT_MINUTES,
  WEEKDAY_SHORT,
  formatMinutes,
  freeStarts,
  overlaps,
} from "@/lib/schedule"

const SLOT_PX = 36

export type AgendaStudent = { id: string; name: string }

export type AgendaBlock = {
  id: string
  enrollmentId: string
  studentId: string
  weekday: number
  startMinutes: number
  durationMinutes: number
  student: string
  billingType: "per_lesson" | "monthly"
  amount: number
  dueDay: number | null
  notes: string
}

export type AgendaDay = {
  weekday: number
  dayNumber: string
  ymd: string
  isToday: boolean
}

export function AgendaBoard({
  days,
  blocks,
  students,
  enrollments,
  weekLabel,
  prevWeek,
  nextWeek,
  todayYmd,
  nowMinutes,
  focusStart = null,
}: {
  days: AgendaDay[]
  blocks: AgendaBlock[]
  students: AgendaStudent[]
  enrollments: EnrollmentDefaults[]
  weekLabel: string
  prevWeek: string
  nextWeek: string
  todayYmd: string
  nowMinutes: number
  focusStart?: number | null
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const totalHeight = ((DAY_END - DAY_START) / SLOT_MINUTES) * SLOT_PX

  useEffect(() => {
    if (focusStart == null || !scrollerRef.current) return
    const top = ((focusStart - DAY_START) / SLOT_MINUTES) * SLOT_PX
    scrollerRef.current.scrollTo({ top, behavior: "smooth" })
  }, [focusStart])
  const slots = useMemo(() => {
    const list: number[] = []
    for (let minute = DAY_START; minute < DAY_END; minute += SLOT_MINUTES) list.push(minute)
    return list
  }, [])

  function openAt(weekday: number, startMinutes: number) {
    const duration =
      [60, 30, 90].find((option) =>
        freeStarts(blocks, weekday, option).includes(startMinutes),
      ) ?? 30
    setDraft({ weekday, startMinutes, duration })
  }

  function openBlank() {
    const hour = firstOpening(blocks, days, todayYmd, nowMinutes, 60)
    const first = hour ?? firstOpening(blocks, days, todayYmd, nowMinutes, 30)
    if (!first) return
    setDraft({
      weekday: first.weekday,
      startMinutes: first.start,
      duration: hour ? 60 : 30,
    })
  }

  function openEnrollment(block: AgendaBlock) {
    if (!block.enrollmentId) return
    setDraft({
      weekday: block.weekday,
      startMinutes: block.startMinutes,
      duration: block.durationMinutes,
      editing: {
        ruleId: block.id,
        enrollmentId: block.enrollmentId,
        studentId: block.studentId,
        billingType: block.billingType,
        amount: block.amount,
        dueDay: block.dueDay,
        notes: block.notes,
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/agenda?semana=${prevWeek}`}
            aria-label="Semana anterior"
            className="flex size-9 items-center justify-center rounded-lg border border-[#0B1220]/10 bg-white"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <p className="min-w-36 text-center text-sm font-semibold capitalize">{weekLabel}</p>
          <Link
            href={`/agenda?semana=${nextWeek}`}
            aria-label="Próxima semana"
            className="flex size-9 items-center justify-center rounded-lg border border-[#0B1220]/10 bg-white"
          >
            <ChevronRight className="size-4" />
          </Link>
          <Link
            href="/agenda"
            className="rounded-lg border border-[#0B1220]/10 bg-white px-3 py-2 text-sm font-medium"
          >
            Hoje
          </Link>
        </div>
        <button
          type="button"
          onClick={openBlank}
          disabled={students.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3B82F6]/90 disabled:opacity-50"
        >
          <Plus className="size-4" />
          Matricular
        </button>
      </div>

      {students.length === 0 ? (
        <p className="rounded-2xl bg-white px-5 py-4 text-sm text-[#64748B] shadow-sm ring-1 ring-[#0B1220]/5">
          Nenhum aluno cadastrado.{" "}
          <Link href="/alunos" className="font-semibold text-[#3B82F6]">
            Cadastre um aluno
          </Link>{" "}
          para ocupar um horário.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4 text-xs font-medium text-[#64748B]">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded bg-[#3B82F6]" /> Ocupado
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded border border-dashed border-[#3B82F6]/50 bg-[#3B82F6]/10" />
          Disponível
        </span>
      </div>

      <div
        ref={scrollerRef}
        className="overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-[#0B1220]/5"
      >
        <div className="flex min-w-[860px]">
          <div className="sticky left-0 z-20 w-16 shrink-0 border-r border-[#0B1220]/5 bg-white">
            <div className="sticky top-0 z-30 h-12 border-b border-[#0B1220]/5 bg-white" />
            <div className="relative" style={{ height: totalHeight }}>
              {slots.map((minute) => {
                const firstHour = minute === DAY_START
                return (
                  <div
                    key={minute}
                    className={
                      "absolute right-2 text-[11px] font-medium tabular-nums text-[#94A3B8] " +
                      (firstHour ? "" : "-translate-y-1/2")
                    }
                    style={{
                      top: firstHour ? 4 : ((minute - DAY_START) / SLOT_MINUTES) * SLOT_PX,
                    }}
                  >
                    {minute % 60 === 0 ? formatMinutes(minute) : ""}
                  </div>
                )
              })}
              <div
                className="absolute right-2 -translate-y-full text-[11px] font-medium tabular-nums text-[#94A3B8]"
                style={{ top: totalHeight }}
              >
                00:00
              </div>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-7">
            {days.map((day) => (
              <div
                key={day.ymd}
                className={
                  "sticky top-0 z-20 flex h-12 items-center justify-center gap-1.5 border-b border-l border-[#0B1220]/5 bg-white text-sm " +
                  (day.isToday ? "font-semibold text-[#3B82F6]" : "text-[#64748B]")
                }
              >
                <span>{WEEKDAY_SHORT[day.weekday]}</span>
                <span
                  className={
                    "flex size-6 items-center justify-center rounded-full text-xs " +
                    (day.isToday ? "bg-[#0B1220] text-white" : "")
                  }
                >
                  {day.dayNumber}
                </span>
              </div>
            ))}

            {days.map((day) => (
              <div
                key={`${day.ymd}-col`}
                className="relative border-l border-[#0B1220]/5"
                style={{ height: totalHeight }}
              >
                {slots.map((minute) => {
                  const covered = blocks.some(
                    (block) =>
                      block.weekday === day.weekday &&
                      overlaps(minute, SLOT_MINUTES, block.startMinutes, block.durationMinutes),
                  )
                  const canOpen = !covered && students.length > 0
                  return (
                    <button
                      key={minute}
                      type="button"
                      disabled={!canOpen}
                      aria-label={
                        canOpen
                          ? `Disponível, ${WEEKDAY_SHORT[day.weekday]} ${formatMinutes(minute)}`
                          : undefined
                      }
                      onClick={() => openAt(day.weekday, minute)}
                      className={
                        "block w-full border-b text-left " +
                        (minute % 60 === 0
                          ? "border-[#0B1220]/10"
                          : "border-[#0B1220]/5") +
                        (canOpen ? " hover:bg-[#3B82F6]/10" : "")
                      }
                      style={{ height: SLOT_PX }}
                    />
                  )
                })}

                {blocks
                  .filter((block) => block.weekday === day.weekday)
                  .map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => openEnrollment(block)}
                      className="absolute inset-x-1 z-10 flex flex-col overflow-hidden rounded-lg bg-[#3B82F6] px-2 py-1 text-left text-white shadow-sm hover:bg-[#2563EB]"
                      style={{
                        top:
                          ((block.startMinutes - DAY_START) / SLOT_MINUTES) * SLOT_PX + 2,
                        height: (block.durationMinutes / SLOT_MINUTES) * SLOT_PX - 4,
                      }}
                    >
                      <span className="truncate text-xs font-semibold">{block.student}</span>
                      <span className="text-[11px] text-white/80">
                        {formatMinutes(block.startMinutes)} · {block.durationMinutes} min
                      </span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {draft ? (
        <EnrollDialog
          weekday={draft.weekday}
          startMinutes={draft.startMinutes}
          duration={draft.duration}
          students={students}
          blocks={blocks}
          enrollments={enrollments}
          todayYmd={todayYmd}
          nowMinutes={nowMinutes}
          editing={draft.editing}
          onClose={() => setDraft(null)}
        />
      ) : null}
    </div>
  )
}

type Draft = {
  weekday: number
  startMinutes: number
  duration: number
  editing?: EnrollmentEdit
}

function firstOpening(
  blocks: AgendaBlock[],
  days: AgendaDay[],
  todayYmd: string,
  nowMinutes: number,
  duration: number,
) {
  const future = findOpening(blocks, days, todayYmd, nowMinutes, duration, true)
  return future ?? findOpening(blocks, days, todayYmd, nowMinutes, duration, false)
}

function findOpening(
  blocks: AgendaBlock[],
  days: AgendaDay[],
  todayYmd: string,
  nowMinutes: number,
  duration: number,
  onlyFuture: boolean,
) {
  for (const weekday of [1, 2, 3, 4, 5, 6, 0]) {
    const start = freeStarts(blocks, weekday, duration).find(
      (minute) => !onlyFuture || !isPast(days, weekday, minute, todayYmd, nowMinutes),
    )
    if (start !== undefined) return { weekday, start }
  }
  return null
}

function isPast(
  days: AgendaDay[],
  weekday: number,
  startMinutes: number,
  todayYmd: string,
  nowMinutes: number,
) {
  const day = days.find((item) => item.weekday === weekday)
  if (!day) return true
  if (day.ymd < todayYmd) return true
  if (day.ymd === todayYmd && startMinutes <= nowMinutes) return true
  return false
}

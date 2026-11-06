"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { statusMeta } from "@/lib/lesson-status"

export type WeekDay = {
  key: string
  weekdayLong: string
  dayNumber: string
  isToday: boolean
  lessons: {
    id: string
    time: string
    student: string
    status: string
  }[]
}

export function WeekCalendar({ days }: { days: WeekDay[] }) {
  const total = days.reduce((sum, day) => sum + day.lessons.length, 0)
  const todayIndex = Math.max(
    0,
    days.findIndex((day) => day.isToday),
  )
  const [index, setIndex] = useState(todayIndex)
  const selected = days[index] ?? days[0]

  return (
    <section
      aria-label="Sua semana"
      className="flex h-full min-h-[28rem] flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#0B1220]/5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Sua semana</h2>
          <p className="text-sm text-[#64748B]">
            {total === 0
              ? "Nenhuma aula nesta semana"
              : `${total} ${total === 1 ? "aula" : "aulas"} nesta semana`}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Dia anterior"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="flex size-9 items-center justify-center rounded-lg border border-[#0B1220]/10 text-[#0B1220] transition-colors hover:bg-[#F8FAFC] disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold capitalize">
              {selected.weekdayLong}, {selected.dayNumber}
            </span>
            {selected.isToday ? (
              <span className="text-[11px] font-medium text-[#3B82F6]">Hoje</span>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Próximo dia"
            onClick={() => setIndex((value) => Math.min(days.length - 1, value + 1))}
            disabled={index === days.length - 1}
            className="flex size-9 items-center justify-center rounded-lg border border-[#0B1220]/10 text-[#0B1220] transition-colors hover:bg-[#F8FAFC] disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-2 flex gap-1.5">
          {days.map((day, dayIndex) => (
            <button
              key={day.key}
              type="button"
              aria-label={`${day.weekdayLong}, ${day.dayNumber}`}
              aria-current={dayIndex === index ? "true" : undefined}
              onClick={() => setIndex(dayIndex)}
              className={
                "h-1.5 flex-1 rounded-full transition-colors " +
                (dayIndex === index
                  ? "bg-[#3B82F6]"
                  : day.lessons.length > 0
                    ? "bg-[#3B82F6]/30"
                    : "bg-[#0B1220]/10")
              }
            />
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {selected.lessons.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#0B1220]/10 px-4 py-6 text-center text-sm text-[#64748B]">
              Nenhuma aula neste dia.
            </p>
          ) : (
            selected.lessons.map((lesson) => {
              const meta = statusMeta(lesson.status)
              return (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 rounded-xl border border-[#0B1220]/8 bg-[#F8FAFC] p-3"
                >
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {lesson.time}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {lesson.student}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: meta.soft, color: meta.text }}
                  >
                    {meta.label}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

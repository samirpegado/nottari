import { LESSON_STATUS, type LessonStatus } from "@/lib/lesson-status"

const ORDER: LessonStatus[] = [
  "scheduled",
  "done",
  "missed",
  "rescheduled",
  "makeup",
]

const CIRCUMFERENCE = 100

export function StatusDonut({
  counts,
  periodLabel,
}: {
  counts: Record<string, number>
  periodLabel: string
}) {
  const segments = ORDER.map((status) => ({
    status,
    label: LESSON_STATUS[status].label,
    color: LESSON_STATUS[status].color,
    n: counts[status] ?? 0,
  })).filter((segment) => segment.n > 0)

  const total = segments.reduce((sum, segment) => sum + segment.n, 0)

  let offset = 0

  return (
    <section
      aria-label="Aulas por status"
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0B1220]/5"
    >
      <h2 className="text-base font-semibold">Aulas por status</h2>
      <p className="text-sm text-[#64748B]">{periodLabel}</p>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-[#64748B]">
          Sem aulas no período selecionado.
        </p>
      ) : (
        <>
          <div className="flex justify-center py-5">
            <div className="relative size-40">
              <svg viewBox="0 0 42 42" className="size-40" role="img" aria-label="Distribuição de aulas por status">
                <circle
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke="#EEF2F7"
                  strokeWidth="5.5"
                />
                {segments.map((segment) => {
                  const fraction = (segment.n / total) * CIRCUMFERENCE
                  const circle = (
                    <circle
                      key={segment.status}
                      cx="21"
                      cy="21"
                      r="15.9155"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="5.5"
                      strokeDasharray={`${fraction} ${CIRCUMFERENCE - fraction}`}
                      strokeDashoffset={-offset}
                      transform="rotate(-90 21 21)"
                    />
                  )
                  offset += fraction
                  return circle
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold leading-none">{total}</span>
                <span className="text-xs text-[#64748B]">aulas</span>
              </div>
            </div>
          </div>

          <ul className="flex flex-col">
            {segments.map((segment) => (
              <li
                key={segment.status}
                className="flex items-center gap-2.5 border-t border-[#0B1220]/5 py-2 first:border-t-0"
              >
                <span
                  className="size-3 shrink-0 rounded-[3px]"
                  style={{ background: segment.color }}
                />
                <span className="flex-1 text-sm">{segment.label}</span>
                <span className="text-sm font-semibold">{segment.n}</span>
                <span className="w-11 text-right text-xs text-[#64748B]">
                  {Math.round((segment.n / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

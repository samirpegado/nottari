export type LessonStatus =
  | "scheduled"
  | "done"
  | "missed"
  | "rescheduled"
  | "makeup"

export const LESSON_STATUS: Record<
  LessonStatus,
  { label: string; color: string; soft: string; text: string }
> = {
  scheduled: {
    label: "A fazer",
    color: "#3B82F6",
    soft: "rgba(59,130,246,0.12)",
    text: "#2563EB",
  },
  done: {
    label: "Feita",
    color: "#10B981",
    soft: "rgba(16,185,129,0.14)",
    text: "#047857",
  },
  missed: {
    label: "Falta",
    color: "#EF4444",
    soft: "rgba(239,68,68,0.12)",
    text: "#B91C1C",
  },
  rescheduled: {
    label: "Remarcada",
    color: "#F59E0B",
    soft: "rgba(245,158,11,0.16)",
    text: "#B45309",
  },
  makeup: {
    label: "Reposição",
    color: "#8B5CF6",
    soft: "rgba(139,92,246,0.14)",
    text: "#6D28D9",
  },
}

export function statusMeta(status: string) {
  return LESSON_STATUS[status as LessonStatus] ?? LESSON_STATUS.scheduled
}

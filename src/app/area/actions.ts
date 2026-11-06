"use server"

import { redirect } from "next/navigation"
import { isLessonStatus, type LessonStatus } from "@/lib/lessons"
import { isMaterialType, type MaterialType } from "@/lib/materials"
import { saoPauloNow } from "@/lib/schedule"
import { normalizeStudentColor } from "@/lib/student-profile"
import { getStudentToken } from "@/lib/student-session"
import { createClient } from "@/lib/supabase/server"

export type StudentAreaNote = {
  piece: string | null
  measure: string | null
  bpm: number | null
  homework: string | null
  notes: string | null
  at: string
  status: LessonStatus
}

export type StudentUpcomingLesson = {
  id: string
  scheduledAt: string
  durationMinutes: number
  status: LessonStatus
}

export type StudentAreaMaterial = {
  id: string
  title: string
  type: MaterialType
}

export type StudentArea = {
  ok: true
  today: string
  organizationName: string
  student: {
    id: string
    name: string
    instrument: string | null
    skillLevel: string | null
    color: string
  }
  lastNote: StudentAreaNote | null
  upcoming: StudentUpcomingLesson[]
  materials: StudentAreaMaterial[]
}

export async function getStudentArea(): Promise<StudentArea | { ok: false; error: string }> {
  const token = await getStudentToken()
  if (!token) redirect("/?aluno=1")

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("student_home", { p_token: token })
  if (error || !data) {
    if (/invalid or expired session/i.test(error?.message ?? "")) redirect("/area/sair")
    return { ok: false, error: "Não foi possível abrir sua área." }
  }

  const raw = (typeof data === "string" ? JSON.parse(data) : data) as HomePayload
  const student = raw.student
  if (!student?.id) return { ok: false, error: "Não foi possível abrir sua área." }

  const today = saoPauloNow().ymd
  const month = today.slice(0, 7)

  return {
    ok: true,
    today,
    organizationName: raw.organization_name?.trim() || "Nottari",
    student: {
      id: student.id,
      name: student.stage_name?.trim() || student.full_name,
      instrument: student.instrument ?? null,
      skillLevel: student.skill_level ?? null,
      color: normalizeStudentColor(student.color ?? ""),
    },
    lastNote: toNote(raw.last_note),
    upcoming: (raw.upcoming ?? [])
      .flatMap(toUpcoming)
      .filter((lesson) => saoPauloNow(new Date(lesson.scheduledAt)).ymd.startsWith(month)),
    materials: (raw.materials ?? []).flatMap(toMaterial),
  }
}

export async function openStudentMaterial(materialId: string) {
  const token = await getStudentToken()
  if (!token) return { ok: false as const, error: "Entre de novo para abrir o arquivo." }
  if (!/^[0-9a-f-]{36}$/i.test(materialId)) {
    return { ok: false as const, error: "Arquivo não encontrado." }
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return { ok: false as const, error: "Arquivo indisponível no momento." }

  let response: Response
  try {
    response = await fetch(`${url}/functions/v1/student-file`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
      },
      body: JSON.stringify({ token, materialId }),
      cache: "no-store",
    })
  } catch {
    return { ok: false as const, error: "Não foi possível abrir o arquivo." }
  }

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; url?: string; title?: string; error?: string }
    | null
  if (response.ok && payload?.url) {
    return { ok: true as const, url: payload.url, title: payload.title ?? "Arquivo" }
  }
  return { ok: false as const, error: payload?.error || "Não foi possível abrir o arquivo." }
}

type HomePayload = {
  organization_name?: string
  student?: {
    id: string
    full_name: string
    stage_name?: string | null
    instrument?: string | null
    skill_level?: string | null
    color?: string | null
  }
  last_note?: {
    piece?: string | null
    measure?: string | null
    bpm?: number | null
    homework?: string | null
    notes?: string | null
    at?: string
    status?: string
  } | null
  upcoming?: { id?: string; scheduled_at?: string; duration_minutes?: number; status?: string }[]
  materials?: { id?: string; title?: string; type?: string }[]
}

function toNote(raw: HomePayload["last_note"]): StudentAreaNote | null {
  if (!raw?.at) return null
  return {
    piece: raw.piece ?? null,
    measure: raw.measure ?? null,
    bpm: typeof raw.bpm === "number" ? raw.bpm : null,
    homework: raw.homework ?? null,
    notes: raw.notes ?? null,
    at: raw.at,
    status: isLessonStatus(raw.status) ? raw.status : "done",
  }
}

function toUpcoming(
  raw: NonNullable<HomePayload["upcoming"]>[number],
): StudentUpcomingLesson[] {
  if (!raw?.id || !raw.scheduled_at) return []
  return [
    {
      id: raw.id,
      scheduledAt: raw.scheduled_at,
      durationMinutes: Number(raw.duration_minutes ?? 60),
      status: isLessonStatus(raw.status) ? raw.status : "scheduled",
    },
  ]
}

function toMaterial(
  raw: NonNullable<HomePayload["materials"]>[number],
): StudentAreaMaterial[] {
  if (!raw?.id || !raw.title || !isMaterialType(raw.type ?? "")) return []
  return [{ id: raw.id, title: raw.title, type: raw.type as MaterialType }]
}

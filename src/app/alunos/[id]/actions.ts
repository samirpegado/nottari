"use server"

import { revalidatePath } from "next/cache"
import { signedPhotoUrl } from "@/app/alunos/actions"
import { displayStatus } from "@/lib/charges"
import {
  isLessonStatus,
  lessonHasNote,
  parseBpm,
  type LessonStatus,
} from "@/lib/lessons"
import { isMaterialType, type MaterialType } from "@/lib/materials"
import { saoPauloNow, slotIso, timeToMinutes } from "@/lib/schedule"
import { normalizeStudentColor } from "@/lib/student-profile"
import { getTeacherContext } from "@/lib/teacher"

const TIMELINE_PAGE = 5
const LESSON_SELECT =
  "id, scheduled_at, status, duration_minutes, schedule_rule_id, lesson_notes(id, piece, bpm, measure, homework, notes)"
const END_OF_TODAY = (ymd: string) => `${ymd}T23:59:59.999-03:00`

export type TimelineEntry = {
  lessonId: string
  noteId: string | null
  scheduledAt: string
  ymd: string
  status: LessonStatus
  durationMinutes: number
  oneOff: boolean
  piece: string | null
  measure: string | null
  bpm: number | null
  homework: string | null
  notes: string | null
}

export type AssignedMaterial = {
  id: string
  title: string
  type: MaterialType
}

export type ShareableMaterial = AssignedMaterial & { assigned: boolean }

export type StudentBoard = {
  ok: true
  today: string
  student: {
    id: string
    name: string
    phone: string
    email: string | null
    instrument: string | null
    skillLevel: string | null
    color: string
    photoUrl: string | null
  }
  lastNote: TimelineEntry | null
  timeline: TimelineEntry[]
  page: number
  pages: number
  total: number
  enrollment: {
    id: string
    billingType: "monthly" | "per_lesson"
    amount: number
    dueDay: number | null
    notes: string | null
    rules: { id: string; weekday: number; startTime: string; durationMinutes: number }[]
  } | null
  scheduleBlocks: { id: string; weekday: number; startMinutes: number; durationMinutes: number }[]
  materials: AssignedMaterial[]
  charge: {
    id: string
    competence: string
    dueDate: string
    amount: number
    status: "pending" | "due_today" | "overdue" | "paid"
  } | null
}

export async function getStudentBoard(
  studentId: string,
  input?: { page?: number },
): Promise<StudentBoard | { ok: false; error: string }> {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, stage_name, phone, email, instrument, skill_level, color, photo_path")
    .eq("id", studentId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle()
  if (!student) return fail("Aluno não encontrado.")

  const today = saoPauloNow().ymd
  const monthStart = `${today.slice(0, 7)}-01`
  const endIso = END_OF_TODAY(today)
  const requestedPage = Math.max(1, Math.floor(Number(input?.page) || 1))

  const enrollmentsResult = await supabase
    .from("enrollments")
    .select(
      "id, billing_type, amount, due_day, notes, active, created_at, schedule_rules(id, weekday, start_time, duration_minutes, active)",
    )
    .eq("student_id", student.id)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  const enrollmentIds = (enrollmentsResult.data ?? []).map((row) => row.id as string)
  const plan = (enrollmentsResult.data ?? []).find((row) => row.active) ?? null

  const [rulesResult, timelineResult, lastNoteResult, materialsResult, chargeResult, photoUrl] =
    await Promise.all([
      supabase
        .from("schedule_rules")
        .select("id, weekday, start_time, duration_minutes")
        .eq("organization_id", organizationId)
        .eq("active", true),
      loadTimelinePage(supabase, organizationId, enrollmentIds, endIso, requestedPage),
      enrollmentIds.length > 0
        ? supabase
            .from("lessons")
            .select(
              "id, scheduled_at, status, duration_minutes, schedule_rule_id, lesson_notes!inner(id, piece, bpm, measure, homework, notes)",
            )
            .eq("organization_id", organizationId)
            .in("enrollment_id", enrollmentIds)
            .lte("scheduled_at", endIso)
            .order("scheduled_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("material_assignments")
        .select("materials(id, title, type)")
        .eq("organization_id", organizationId)
        .eq("student_id", student.id),
      supabase
        .from("charges")
        .select("id, competence, due_date, amount, status")
        .eq("organization_id", organizationId)
        .eq("student_id", student.id)
        .eq("competence", monthStart)
        .maybeSingle(),
      signedPhotoUrl(supabase, (student.photo_path as string | null) ?? null),
    ])

  if (timelineResult.error) return fail("Não foi possível abrir o prontuário.")

  const rules = list(
    plan?.schedule_rules as
      | { id: string; weekday: number; start_time: string; duration_minutes: number; active: boolean }
      | { id: string; weekday: number; start_time: string; duration_minutes: number; active: boolean }[]
      | null,
  )
    .filter((rule) => rule.active)
    .sort((a, b) => weekdayOrder(a.weekday) - weekdayOrder(b.weekday))

  const timeline = timelineResult.rows.map(toEntry)
  const lastNote = lastNoteResult.data ? toEntry(lastNoteResult.data) : null

  const materials: AssignedMaterial[] = []
  for (const row of materialsResult.data ?? []) {
    const material = one(
      row.materials as
        | { id: string; title: string; type: string }
        | { id: string; title: string; type: string }[]
        | null,
    )
    if (!material || !isMaterialType(material.type)) continue
    materials.push({ id: material.id, title: material.title, type: material.type })
  }
  materials.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))

  const chargeRow = chargeResult.data
  const charge = chargeRow
    ? {
        id: chargeRow.id as string,
        competence: String(chargeRow.competence).slice(0, 7),
        dueDate: String(chargeRow.due_date).slice(0, 10),
        amount: Number(chargeRow.amount),
        status: displayStatus(String(chargeRow.status), String(chargeRow.due_date).slice(0, 10), today),
      }
    : null

  return {
    ok: true,
    today,
    student: {
      id: student.id as string,
      name: (student.stage_name as string | null)?.trim() || (student.full_name as string),
      phone: (student.phone as string) ?? "",
      email: (student.email as string | null) ?? null,
      instrument: (student.instrument as string | null) ?? null,
      skillLevel: (student.skill_level as string | null) ?? null,
      color: normalizeStudentColor((student.color as string | null) ?? ""),
      photoUrl: photoUrl || null,
    },
    lastNote,
    timeline,
    page: timelineResult.page,
    pages: timelineResult.pages,
    total: timelineResult.total,
    enrollment: plan
      ? {
          id: plan.id as string,
          billingType: plan.billing_type === "monthly" ? "monthly" : "per_lesson",
          amount: Number(plan.amount ?? 0),
          dueDay: typeof plan.due_day === "number" ? plan.due_day : null,
          notes: (plan.notes as string | null) ?? null,
          rules: rules.map((rule) => ({
            id: rule.id,
            weekday: rule.weekday,
            startTime: rule.start_time,
            durationMinutes: rule.duration_minutes,
          })),
        }
      : null,
    scheduleBlocks: (rulesResult.data ?? []).map((rule) => ({
      id: rule.id as string,
      weekday: rule.weekday as number,
      startMinutes: timeToMinutes(rule.start_time as string),
      durationMinutes: rule.duration_minutes as number,
    })),
    materials,
    charge,
  }
}

export async function saveLessonNote(input: {
  studentId: string
  lessonId?: string | null
  date: string
  status: string
  piece?: string
  measure?: string
  bpm?: string
  homework?: string
  notes?: string
}) {
  const status = isLessonStatus(input.status) ? input.status : null
  if (!status) return fail("Escolha o status da aula.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return fail("Informe a data da aula.")

  const bpm = parseBpm(input.bpm)
  if (!bpm.ok) return bpm

  const piece = blank(input.piece)
  const measure = blank(input.measure)
  const homework = blank(input.homework)
  const notes = blank(input.notes)
  if (piece && piece.length > 160) return fail("A peça pode ter até 160 caracteres.")
  if (measure && measure.length > 160) return fail("Onde parou pode ter até 160 caracteres.")
  if (homework && homework.length > 400) return fail("A tarefa pode ter até 400 caracteres.")
  if (notes && notes.length > 2000) return fail("As observações podem ter até 2.000 caracteres.")

  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const student = await studentInOrg(supabase, organizationId, input.studentId)
  if (!student) return fail("Aluno não encontrado.")

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, schedule_rules(id, start_time, duration_minutes, active)")
    .eq("organization_id", organizationId)
    .eq("student_id", student.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!enrollment) return fail("Matricule o aluno na Agenda antes de registrar a aula.")

  const rules = list(
    enrollment.schedule_rules as
      | { id: string; start_time: string; duration_minutes: number; active: boolean }
      | { id: string; start_time: string; duration_minutes: number; active: boolean }[]
      | null,
  ).filter((rule) => rule.active)
  const slot = rules[0]
  const duration = slot?.duration_minutes ?? 60
  const startMinutes = slot ? timeToMinutes(slot.start_time) : 14 * 60

  let lessonId = input.lessonId?.trim() || ""
  if (lessonId) {
    const { data: existing } = await supabase
      .from("lessons")
      .select("id, enrollments!inner(student_id)")
      .eq("id", lessonId)
      .eq("organization_id", organizationId)
      .eq("enrollments.student_id", student.id)
      .maybeSingle()
    if (!existing) return fail("Essa aula não existe mais.")
  } else {
    const start = `${input.date}T00:00:00-03:00`
    const end = `${input.date}T23:59:59.999-03:00`
    const { data: sameDay } = await supabase
      .from("lessons")
      .select("id, status, lesson_notes(id)")
      .eq("organization_id", organizationId)
      .eq("enrollment_id", enrollment.id)
      .gte("scheduled_at", start)
      .lte("scheduled_at", end)
      .order("scheduled_at", { ascending: true })

    const picked = pickLessonOfDay(sameDay ?? [])
    if (picked) {
      lessonId = picked.id
    } else {
      const { data: created, error } = await supabase
        .from("lessons")
        .insert({
          organization_id: organizationId,
          enrollment_id: enrollment.id,
          scheduled_at: slotIso(input.date, startMinutes),
          duration_minutes: duration,
          status,
        })
        .select("id")
        .single()
      if (error || !created) return fail("Não foi possível criar a aula desse dia.")
      lessonId = created.id as string
    }
  }

  const { error: statusError } = await supabase
    .from("lessons")
    .update({ status })
    .eq("id", lessonId)
    .eq("organization_id", organizationId)
  if (statusError) return fail("Não foi possível atualizar o status da aula.")

  const { data: currentNote } = await supabase
    .from("lesson_notes")
    .select("id")
    .eq("lesson_id", lessonId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  const payload = {
    piece,
    measure,
    bpm: bpm.bpm,
    homework,
    notes,
  }

  if (currentNote) {
    const { error } = await supabase
      .from("lesson_notes")
      .update(payload)
      .eq("id", currentNote.id)
      .eq("organization_id", organizationId)
    if (error) return fail("Não foi possível salvar a observação.")
  } else if (lessonHasNote(payload)) {
    const { error } = await supabase.from("lesson_notes").insert({
      organization_id: organizationId,
      lesson_id: lessonId,
      ...payload,
    })
    if (error) return fail("Não foi possível salvar a observação.")
  }

  refresh(student.id as string)
  return { ok: true as const }
}

export async function deleteLessonNote(input: { studentId: string; lessonId: string }) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const student = await studentInOrg(supabase, organizationId, input.studentId)
  if (!student) return fail("Aluno não encontrado.")

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, schedule_rule_id, enrollments!inner(student_id)")
    .eq("id", input.lessonId)
    .eq("organization_id", organizationId)
    .eq("enrollments.student_id", student.id)
    .maybeSingle()
  if (!lesson) return fail("Aula não encontrada.")

  await supabase
    .from("lesson_notes")
    .delete()
    .eq("lesson_id", lesson.id)
    .eq("organization_id", organizationId)

  if (!lesson.schedule_rule_id) {
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lesson.id)
      .eq("organization_id", organizationId)
    if (error) return fail("Não foi possível excluir o registro.")
  }

  refresh(student.id as string)
  return { ok: true as const }
}

export async function listShareableMaterials(studentId: string) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")
  const student = await studentInOrg(supabase, organizationId, studentId)
  if (!student) return fail("Aluno não encontrado.")

  const [materialsResult, assignedResult] = await Promise.all([
    supabase
      .from("materials")
      .select("id, title, type")
      .eq("organization_id", organizationId)
      .order("title", { ascending: true }),
    supabase
      .from("material_assignments")
      .select("material_id")
      .eq("organization_id", organizationId)
      .eq("student_id", student.id),
  ])
  if (materialsResult.error) return fail("Não foi possível listar os materiais.")

  const assigned = new Set((assignedResult.data ?? []).map((row) => row.material_id as string))
  const materials: ShareableMaterial[] = []
  for (const row of materialsResult.data ?? []) {
    if (!isMaterialType(row.type as string)) continue
    materials.push({
      id: row.id as string,
      title: row.title as string,
      type: row.type as MaterialType,
      assigned: assigned.has(row.id as string),
    })
  }
  return { ok: true as const, materials }
}

export async function setStudentMaterialAccess(studentId: string, materialId: string, granted: boolean) {
  const { supabase, organizationId, userId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")
  const student = await studentInOrg(supabase, organizationId, studentId)
  if (!student) return fail("Aluno não encontrado.")

  const { data: material } = await supabase
    .from("materials")
    .select("id")
    .eq("id", materialId)
    .eq("organization_id", organizationId)
    .maybeSingle()
  if (!material) return fail("Material não encontrado.")

  if (granted) {
    const { error } = await supabase.from("material_assignments").upsert(
      {
        organization_id: organizationId,
        material_id: materialId,
        student_id: student.id,
        assigned_by: userId,
      },
      { onConflict: "material_id,student_id" },
    )
    if (error) return fail("Não foi possível compartilhar o material.")
  } else {
    const { error } = await supabase
      .from("material_assignments")
      .delete()
      .eq("organization_id", organizationId)
      .eq("material_id", materialId)
      .eq("student_id", student.id)
    if (error) return fail("Não foi possível remover o acesso.")
  }

  refresh(student.id as string)
  return { ok: true as const }
}

function pickLessonOfDay(
  rows: { id: string; status: string; lesson_notes?: { id: string } | { id: string }[] | null }[],
) {
  const scored = rows.map((row) => {
    const hasNote = list(row.lesson_notes).length > 0
    let score = 0
    if (hasNote) score += 4
    if (row.status === "scheduled") score += 3
    if (row.status === "done") score += 2
    return { id: row.id, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0] ?? null
}

async function loadTimelinePage(
  supabase: TeacherClient,
  organizationId: string,
  enrollmentIds: string[],
  endIso: string,
  requestedPage: number,
) {
  if (enrollmentIds.length === 0) {
    return { rows: [] as Parameters<typeof toEntry>[0][], page: 1, pages: 1, total: 0, error: null }
  }

  const counted = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("enrollment_id", enrollmentIds)
    .lte("scheduled_at", endIso)
  if (counted.error) {
    return { rows: [], page: 1, pages: 1, total: 0, error: counted.error }
  }

  const total = counted.count ?? 0
  const pages = Math.max(1, Math.ceil(total / TIMELINE_PAGE))
  const page = Math.min(requestedPage, pages)
  const from = (page - 1) * TIMELINE_PAGE
  const listed = await supabase
    .from("lessons")
    .select(LESSON_SELECT)
    .eq("organization_id", organizationId)
    .in("enrollment_id", enrollmentIds)
    .lte("scheduled_at", endIso)
    .order("scheduled_at", { ascending: false })
    .range(from, from + TIMELINE_PAGE - 1)

  return {
    rows: (listed.data ?? []) as Parameters<typeof toEntry>[0][],
    page,
    pages,
    total,
    error: listed.error,
  }
}

function toEntry(row: {
  id: string
  scheduled_at: string
  status: string
  duration_minutes: number
  schedule_rule_id: string | null
  lesson_notes?:
    | {
        id: string
        piece: string | null
        bpm: number | null
        measure: string | null
        homework: string | null
        notes: string | null
      }
    | {
        id: string
        piece: string | null
        bpm: number | null
        measure: string | null
        homework: string | null
        notes: string | null
      }[]
    | null
}): TimelineEntry {
  const note = one(row.lesson_notes)
  return {
    lessonId: row.id,
    noteId: note?.id ?? null,
    scheduledAt: row.scheduled_at,
    ymd: saoPauloNow(new Date(row.scheduled_at)).ymd,
    status: isLessonStatus(row.status) ? row.status : "scheduled",
    durationMinutes: row.duration_minutes,
    oneOff: !row.schedule_rule_id,
    piece: note?.piece ?? null,
    measure: note?.measure ?? null,
    bpm: note?.bpm ?? null,
    homework: note?.homework ?? null,
    notes: note?.notes ?? null,
  }
}

async function studentInOrg(
  supabase: TeacherClient,
  organizationId: string,
  studentId: string,
) {
  const { data } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle()
  return data
}

function refresh(studentId: string) {
  revalidatePath(`/alunos/${studentId}`)
  revalidatePath("/alunos")
  revalidatePath("/inicio")
  revalidatePath("/agenda")
}

function fail(error: string) {
  return { ok: false as const, error }
}

function blank(value?: string | null) {
  const trimmed = value?.trim() ?? ""
  return trimmed || null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function list<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function weekdayOrder(weekday: number) {
  return weekday === 0 ? 7 : weekday
}

type TeacherClient = Awaited<ReturnType<typeof getTeacherContext>>["supabase"]

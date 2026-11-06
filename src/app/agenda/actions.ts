"use server"

import { revalidatePath } from "next/cache"
import {
  DAY_END,
  DAY_START,
  DURATIONS,
  LESSON_HORIZON,
  SLOT_MINUTES,
  coversDate,
  formatMinutes,
  nextLessonDate,
  overlaps,
  saoPauloNow,
  slotIso,
  timeToMinutes,
  upcomingDates,
} from "@/lib/schedule"
import { getTeacherContext } from "@/lib/teacher"

const durations: readonly number[] = DURATIONS

export type StudentSearchHit = {
  id: string
  name: string
  instrument: string | null
}

export async function searchStudents(query: string) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return { ok: true as const, students: [] as StudentSearchHit[] }

  const term = query.replace(/[%_,()\\]/g, "").trim()
  if (!term) return { ok: true as const, students: [] as StudentSearchHit[] }

  let request = supabase
    .from("students")
    .select("id, full_name, stage_name, instrument, phone, cpf")
    .eq("organization_id", organizationId)
    .eq("active", true)

  const digits = term.replace(/\D/g, "")
  const clauses = [`full_name.ilike.%${term}%`]
  if (digits.length >= 3) {
    clauses.push(`phone.ilike.%${digits}%`, `cpf.ilike.%${digits}%`)
  }
  request = request.or(clauses.join(","))

  const { data } = await request.order("full_name", { ascending: true }).limit(8)
  return {
    ok: true as const,
    students: (data ?? []).map((row) => ({
      id: row.id as string,
      name: (row.stage_name as string | null)?.trim() || (row.full_name as string),
      instrument: (row.instrument as string | null) ?? null,
    })),
  }
}

export async function enrollmentPlanFor(studentId: string) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) {
    return { ok: false as const, error: "Sua conta ainda não tem uma organização." }
  }

  const { data } = await supabase
    .from("enrollments")
    .select("billing_type, amount, due_day, notes")
    .eq("organization_id", organizationId)
    .eq("student_id", studentId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return {
      ok: true as const,
      plan: {
        billingType: "per_lesson" as const,
        amount: 0,
        dueDay: null as number | null,
        notes: "",
      },
    }
  }

  return {
    ok: true as const,
    plan: {
      billingType: data.billing_type === "monthly" ? ("monthly" as const) : ("per_lesson" as const),
      amount: Number(data.amount ?? 0),
      dueDay: typeof data.due_day === "number" ? data.due_day : null,
      notes: (data.notes as string | null) ?? "",
    },
  }
}

export async function assignSlot(input: {
  studentId: string
  weekday: number
  startMinutes: number
  durationMinutes: number
  billingType: "per_lesson" | "monthly"
  amount: number
  dueDay: number
  notes: string
  oneOff?: boolean
}) {
  const weekday = input.weekday
  const startMinutes = input.startMinutes
  const duration = input.durationMinutes
  const oneOff = Boolean(input.oneOff)
  const billingType = oneOff ? "per_lesson" : input.billingType
  const notes = input.notes.trim() || null

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return { ok: false as const, error: "Escolha um dia da semana." }
  }
  if (
    !Number.isInteger(startMinutes) ||
    startMinutes < DAY_START ||
    startMinutes + duration > DAY_END ||
    (startMinutes - DAY_START) % SLOT_MINUTES !== 0
  ) {
    return { ok: false as const, error: "Escolha um horário disponível." }
  }
  if (!durations.includes(duration)) {
    return { ok: false as const, error: "Escolha uma duração de 30, 60 ou 90 minutos." }
  }
  if (billingType !== "per_lesson" && billingType !== "monthly") {
    return { ok: false as const, error: "Escolha hora/aula ou mensalidade." }
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return { ok: false as const, error: "Informe o valor." }
  }
  if (
    !oneOff &&
    (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31)
  ) {
    return { ok: false as const, error: "Escolha o dia do pagamento." }
  }
  const amount = Math.round(input.amount * 100) / 100

  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) {
    return { ok: false as const, error: "Sua conta ainda não tem uma organização." }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", input.studentId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle()

  if (!student) {
    return { ok: false as const, error: "Cadastre o aluno antes de marcar o horário." }
  }

  const slotDate = nextLessonDate(weekday, startMinutes)

  const { data: rules } = await supabase
    .from("schedule_rules")
    .select("start_time, duration_minutes, valid_from, valid_to, active")
    .eq("organization_id", organizationId)
    .eq("weekday", weekday)
    .eq("active", true)

  const taken = (rules ?? []).some((rule) => {
    if (!coversDate(rule.valid_from, rule.valid_to, slotDate)) return false
    return overlaps(
      startMinutes,
      duration,
      timeToMinutes(rule.start_time),
      rule.duration_minutes,
    )
  })
  if (taken) return { ok: false as const, error: "Esse horário já está ocupado." }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("student_id", student.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle()

  const enrollmentPatch = {
    billing_type: billingType,
    amount,
    due_day: oneOff ? null : input.dueDay,
    notes,
  }

  let enrollmentId = enrollment?.id
  if (!enrollmentId) {
    const { data: created, error } = await supabase
      .from("enrollments")
      .insert({
        organization_id: organizationId,
        student_id: student.id,
        start_date: slotDate,
        ...enrollmentPatch,
      })
      .select("id")
      .single()
    if (error || !created) {
      return { ok: false as const, error: "Não foi possível abrir a matrícula do aluno." }
    }
    enrollmentId = created.id
  } else if (!oneOff) {
    const { error } = await supabase
      .from("enrollments")
      .update(enrollmentPatch)
      .eq("id", enrollmentId)
      .eq("organization_id", organizationId)
    if (error) {
      return { ok: false as const, error: "Não foi possível atualizar a matrícula." }
    }
  }

  const { data: rule, error: ruleError } = await supabase
    .from("schedule_rules")
    .insert({
      organization_id: organizationId,
      enrollment_id: enrollmentId,
      weekday,
      start_time: `${formatMinutes(startMinutes)}:00`,
      duration_minutes: duration,
      valid_from: slotDate,
      valid_to: oneOff ? slotDate : null,
    })
    .select("id")
    .single()

  if (ruleError || !rule) {
    return { ok: false as const, error: "Não foi possível reservar o horário." }
  }

  const dates = oneOff ? [slotDate] : upcomingDates(weekday, slotDate, LESSON_HORIZON)
  const { error: lessonsError } = await supabase.from("lessons").insert(
    dates.map((ymd) => ({
      organization_id: organizationId,
      enrollment_id: enrollmentId,
      schedule_rule_id: rule.id,
      scheduled_at: slotIso(ymd, startMinutes),
      duration_minutes: duration,
      status: "scheduled",
    })),
  )

  if (lessonsError) {
    await supabase.from("schedule_rules").delete().eq("id", rule.id)
    return { ok: false as const, error: "Não foi possível gerar as aulas desse horário." }
  }

  revalidatePath("/agenda")
  revalidatePath("/inicio")
  return { ok: true as const }
}

export async function releaseSlot(ruleId: string) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) {
    return { ok: false as const, error: "Sua conta ainda não tem uma organização." }
  }

  const { data: rule } = await supabase
    .from("schedule_rules")
    .select("id")
    .eq("id", ruleId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (!rule) return { ok: false as const, error: "Horário não encontrado." }

  const yesterday = saoPauloNow()
  const validTo = new Date(`${yesterday.ymd}T12:00:00-03:00`)
  validTo.setUTCDate(validTo.getUTCDate() - 1)
  const validToYmd = saoPauloNow(validTo).ymd

  const { error } = await supabase
    .from("schedule_rules")
    .update({ active: false, valid_to: validToYmd })
    .eq("id", rule.id)

  if (error) return { ok: false as const, error: "Não foi possível liberar o horário." }

  await supabase
    .from("lessons")
    .delete()
    .eq("schedule_rule_id", rule.id)
    .eq("organization_id", organizationId)
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString())

  revalidatePath("/agenda")
  revalidatePath("/inicio")
  return { ok: true as const }
}

export async function updateSlot(input: {
  ruleId: string
  enrollmentId: string
  weekday: number
  startMinutes: number
  durationMinutes: number
  billingType: "per_lesson" | "monthly"
  amount: number
  dueDay: number
  notes: string
}) {
  const parsed = parseSlot(input)
  if (!parsed.ok) return parsed

  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) {
    return { ok: false as const, error: "Sua conta ainda não tem uma organização." }
  }

  const { data: rule } = await supabase
    .from("schedule_rules")
    .select("id, weekday, start_time, duration_minutes, valid_to, enrollment_id")
    .eq("id", input.ruleId)
    .eq("organization_id", organizationId)
    .eq("enrollment_id", input.enrollmentId)
    .maybeSingle()

  if (!rule) return { ok: false as const, error: "Matrícula não encontrada." }

  const slotDate = nextLessonDate(parsed.weekday, parsed.startMinutes)
  const { data: rules } = await supabase
    .from("schedule_rules")
    .select("id, start_time, duration_minutes, valid_from, valid_to, active")
    .eq("organization_id", organizationId)
    .eq("weekday", parsed.weekday)
    .eq("active", true)
    .neq("id", rule.id)

  const taken = (rules ?? []).some((item) => {
    if (!coversDate(item.valid_from, item.valid_to, slotDate)) return false
    return overlaps(
      parsed.startMinutes,
      parsed.duration,
      timeToMinutes(item.start_time),
      item.duration_minutes,
    )
  })
  if (taken) return { ok: false as const, error: "Esse horário já está ocupado." }

  const { error: enrollmentError } = await supabase
    .from("enrollments")
    .update({
      billing_type: parsed.billingType,
      amount: parsed.amount,
      due_day: parsed.dueDay,
      notes: parsed.notes,
    })
    .eq("id", input.enrollmentId)
    .eq("organization_id", organizationId)

  if (enrollmentError) {
    return { ok: false as const, error: "Não foi possível atualizar a matrícula." }
  }

  const moved =
    rule.weekday !== parsed.weekday ||
    timeToMinutes(rule.start_time) !== parsed.startMinutes ||
    rule.duration_minutes !== parsed.duration

  if (!moved) {
    revalidatePath("/agenda")
    revalidatePath("/inicio")
    return { ok: true as const }
  }

  const validTo = rule.valid_to?.slice(0, 10) ?? null
  const { error: ruleError } = await supabase
    .from("schedule_rules")
    .update({
      weekday: parsed.weekday,
      start_time: `${formatMinutes(parsed.startMinutes)}:00`,
      duration_minutes: parsed.duration,
      valid_from: slotDate,
    })
    .eq("id", rule.id)

  if (ruleError) return { ok: false as const, error: "Não foi possível atualizar o horário." }

  await supabase
    .from("lessons")
    .delete()
    .eq("schedule_rule_id", rule.id)
    .eq("organization_id", organizationId)
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString())

  const dates = upcomingDates(parsed.weekday, slotDate, LESSON_HORIZON).filter(
    (ymd) => !validTo || ymd <= validTo,
  )
  if (dates.length > 0) {
    const { error: lessonsError } = await supabase.from("lessons").insert(
      dates.map((ymd) => ({
        organization_id: organizationId,
        enrollment_id: input.enrollmentId,
        schedule_rule_id: rule.id,
        scheduled_at: slotIso(ymd, parsed.startMinutes),
        duration_minutes: parsed.duration,
        status: "scheduled",
      })),
    )
    if (lessonsError) {
      return { ok: false as const, error: "Não foi possível atualizar as próximas aulas." }
    }
  }

  revalidatePath("/agenda")
  revalidatePath("/inicio")
  return { ok: true as const }
}

function parseSlot(input: {
  weekday: number
  startMinutes: number
  durationMinutes: number
  billingType: "per_lesson" | "monthly"
  amount: number
  dueDay: number
  notes: string
}) {
  const weekday = input.weekday
  const startMinutes = input.startMinutes
  const duration = input.durationMinutes
  const billingType = input.billingType
  const notes = input.notes.trim() || null

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return { ok: false as const, error: "Escolha um dia da semana." }
  }
  if (
    !Number.isInteger(startMinutes) ||
    startMinutes < DAY_START ||
    startMinutes + duration > DAY_END ||
    (startMinutes - DAY_START) % SLOT_MINUTES !== 0
  ) {
    return { ok: false as const, error: "Escolha um horário disponível." }
  }
  if (!durations.includes(duration)) {
    return { ok: false as const, error: "Escolha uma duração de 30, 60 ou 90 minutos." }
  }
  if (billingType !== "per_lesson" && billingType !== "monthly") {
    return { ok: false as const, error: "Escolha hora/aula ou mensalidade." }
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return { ok: false as const, error: "Informe o valor." }
  }
  if (!Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 31) {
    return { ok: false as const, error: "Escolha o dia do pagamento." }
  }
  return {
    ok: true as const,
    weekday,
    startMinutes,
    duration,
    billingType,
    amount: Math.round(input.amount * 100) / 100,
    dueDay: input.dueDay,
    notes,
  }
}

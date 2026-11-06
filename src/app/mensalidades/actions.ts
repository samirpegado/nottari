"use server"

import { revalidatePath } from "next/cache"
import { signedPhotoUrls } from "@/app/alunos/actions"
import {
  clampChargeMonth,
  competenceDate,
  displayStatus,
  isPaymentMethod,
  isStatusFilter,
  parseAmount,
  statusMatches,
  type ChargeStatusFilter,
  type PaymentMethod,
} from "@/lib/charges"
import { addDays, saoPauloNow } from "@/lib/schedule"
import { getTeacherContext } from "@/lib/teacher"

export type ChargeRow = {
  id: string
  studentId: string
  studentName: string
  studentPhone: string
  studentColor: string
  photoUrl: string | null
  competence: string
  dueDate: string
  amount: number
  status: "pending" | "paid" | "overdue"
  paidAt: string | null
  paidAmount: number | null
  method: string | null
  notes: string | null
}

export type ChargeSummary = {
  openAmount: number
  openCount: number
  dueSoonAmount: number
  dueSoonCount: number
  receivedAmount: number
  receivedCount: number
}

export type ChargeListResult = {
  ok: true
  month: string
  today: string
  rows: ChargeRow[]
  summary: ChargeSummary
  studentFilter: { id: string; name: string } | null
}

export async function listCharges(input: {
  month?: string
  studentId?: string
  status?: string
}): Promise<ChargeListResult | { ok: false; error: string }> {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const today = saoPauloNow().ymd
  const month = clampChargeMonth(input.month, today)
  const competence = competenceDate(month)
  const statusFilter: ChargeStatusFilter = isStatusFilter(input.status) ? input.status : "all"
  const studentId = input.studentId?.trim() || ""

  if (month <= today.slice(0, 7)) {
    const generated = await supabase.rpc("ensure_month_charges", {
      p_organization_id: organizationId,
      p_competence: competence,
    })
    if (generated.error) return fail("Não foi possível gerar as mensalidades deste mês.")
  }

  let studentFilter: ChargeListResult["studentFilter"] = null
  if (studentId) {
    const { data: student } = await supabase
      .from("students")
      .select("id, full_name, stage_name")
      .eq("id", studentId)
      .eq("organization_id", organizationId)
      .maybeSingle()
    if (student) {
      studentFilter = {
        id: student.id as string,
        name: (student.stage_name as string | null)?.trim() || (student.full_name as string),
      }
    }
  }

  let request = supabase
    .from("charges")
    .select(
      "id, competence, due_date, amount, status, paid_at, paid_amount, method, notes, enrollments!inner(student_id, students!inner(id, full_name, stage_name, phone, color, photo_path))",
    )
    .eq("organization_id", organizationId)
    .eq("competence", competence)
    .order("due_date", { ascending: true })

  if (studentFilter) {
    request = request.eq("enrollments.student_id", studentFilter.id)
  }

  const { data, error } = await request
  if (error) return fail("Não foi possível carregar as mensalidades.")

  const photoPaths = (data ?? [])
    .map((row) => studentOf(row)?.photo_path ?? "")
    .filter(Boolean)
  const photos = await signedPhotoUrls(supabase, photoPaths)

  const rows = (data ?? [])
    .map((row) => toRow(row, photos))
    .filter((row): row is ChargeRow => Boolean(row))
    .filter((row) => statusMatches(displayStatus(row.status, row.dueDate, today), statusFilter))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.studentName.localeCompare(b.studentName, "pt-BR"))

  return {
    ok: true,
    month,
    today,
    rows,
    summary: summarize(rows, today),
    studentFilter,
  }
}

export async function markChargePaid(input: {
  chargeId: string
  paidAt: string
  paidAmount: string
  method: string
  notes: string
}) {
  const paidAt = input.paidAt.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) {
    return fail("Informe a data do pagamento.")
  }
  const paidAmount = parseAmount(input.paidAmount)
  if (paidAmount === null) return fail("Informe o valor recebido.")
  if (!isPaymentMethod(input.method)) return fail("Escolha a forma de pagamento.")
  const notes = input.notes.trim()
  if (notes.length > 500) return fail("A observação pode ter no máximo 500 caracteres.")

  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const { data: charge } = await supabase
    .from("charges")
    .select("id, status")
    .eq("id", input.chargeId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (!charge) return fail("Mensalidade não encontrada.")
  if (charge.status === "paid") return fail("Essa mensalidade já está paga.")

  const { error } = await supabase
    .from("charges")
    .update({
      status: "paid",
      paid_at: `${paidAt}T12:00:00-03:00`,
      paid_amount: paidAmount,
      method: input.method as PaymentMethod,
      notes: notes || null,
    })
    .eq("id", charge.id)
    .eq("organization_id", organizationId)

  if (error) return fail("Não foi possível dar baixa nesta mensalidade.")
  refreshCharges()
  return { ok: true as const }
}

export async function undoChargePayment(chargeId: string) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const { data: charge } = await supabase
    .from("charges")
    .select("id, status")
    .eq("id", chargeId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (!charge) return fail("Mensalidade não encontrada.")
  if (charge.status !== "paid") return fail("Só é possível estornar uma mensalidade paga.")

  const { error } = await supabase
    .from("charges")
    .update({
      status: "pending",
      paid_at: null,
      paid_amount: null,
      method: null,
    })
    .eq("id", charge.id)
    .eq("organization_id", organizationId)

  if (error) return fail("Não foi possível estornar esta mensalidade.")
  refreshCharges()
  return { ok: true as const }
}

export async function ensureCurrentMonthCharges() {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return
  const competence = competenceDate(saoPauloNow().ymd.slice(0, 7))
  await supabase.rpc("ensure_month_charges", {
    p_organization_id: organizationId,
    p_competence: competence,
  })
}

function summarize(rows: ChargeRow[], today: string): ChargeSummary {
  const horizon = addDays(today, 7)
  return rows.reduce<ChargeSummary>(
    (acc, row) => {
      const shown = displayStatus(row.status, row.dueDate, today)
      if (shown === "paid") {
        acc.receivedAmount += row.paidAmount ?? row.amount
        acc.receivedCount += 1
        return acc
      }
      acc.openAmount += row.amount
      acc.openCount += 1
      if (shown !== "overdue" && row.dueDate >= today && row.dueDate <= horizon) {
        acc.dueSoonAmount += row.amount
        acc.dueSoonCount += 1
      }
      return acc
    },
    {
      openAmount: 0,
      openCount: 0,
      dueSoonAmount: 0,
      dueSoonCount: 0,
      receivedAmount: 0,
      receivedCount: 0,
    },
  )
}

function toRow(
  raw: ChargeQueryRow,
  photos: Map<string, string>,
): ChargeRow | null {
  const student = studentOf(raw)
  if (!student) return null
  const status = raw.status === "paid" || raw.status === "overdue" ? raw.status : "pending"
  return {
    id: raw.id,
    studentId: student.id,
    studentName: student.stage_name?.trim() || student.full_name,
    studentPhone: student.phone ?? "",
    studentColor: student.color ?? "#3B82F6",
    photoUrl: photos.get(student.photo_path ?? "") ?? null,
    competence: String(raw.competence).slice(0, 10),
    dueDate: String(raw.due_date).slice(0, 10),
    amount: Number(raw.amount ?? 0),
    status,
    paidAt: raw.paid_at ? String(raw.paid_at).slice(0, 10) : null,
    paidAmount: raw.paid_amount === null || raw.paid_amount === undefined ? null : Number(raw.paid_amount),
    method: raw.method,
    notes: raw.notes,
  }
}

function studentOf(row: ChargeQueryRow) {
  const enrollment = one(row.enrollments)
  return one(enrollment?.students)
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function refreshCharges() {
  revalidatePath("/mensalidades")
  revalidatePath("/inicio")
  revalidatePath("/alunos")
}

function fail(error: string) {
  return { ok: false as const, error }
}

type ChargeQueryRow = {
  id: string
  competence: string
  due_date: string
  amount: number | string
  status: string
  paid_at: string | null
  paid_amount: number | string | null
  method: string | null
  notes: string | null
  enrollments:
    | {
        student_id: string
        students:
          | {
              id: string
              full_name: string
              stage_name: string | null
              phone: string | null
              color: string | null
              photo_path: string | null
            }
          | {
              id: string
              full_name: string
              stage_name: string | null
              phone: string | null
              color: string | null
              photo_path: string | null
            }[]
          | null
      }
    | {
        student_id: string
        students:
          | {
              id: string
              full_name: string
              stage_name: string | null
              phone: string | null
              color: string | null
              photo_path: string | null
            }
          | {
              id: string
              full_name: string
              stage_name: string | null
              phone: string | null
              color: string | null
              photo_path: string | null
            }[]
          | null
      }[]
    | null
}

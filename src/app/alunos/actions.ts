"use server"

import { revalidatePath } from "next/cache"
import { isEmail } from "@/lib/auth-fields"
import { isValidCpf, onlyDigits } from "@/lib/br-docs"
import { addDays, saoPauloNow } from "@/lib/schedule"
import { getTeacherContext } from "@/lib/teacher"

export type StudentInput = {
  fullName: string
  phone: string
  pin: string
  email?: string
  cpf?: string
  zipCode?: string
  street?: string
  streetNumber?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
}

export type StudentRecord = StudentInput & { id: string }

type ParsedStudent = {
  ok: true
  name: string
  phone: string
  pin: string
  email: string | null
  cpf: string | null
  zipCode: string | null
  street: string | null
  streetNumber: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  address: string | null
}

export async function getStudent(studentId: string) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const { data } = await supabase
    .from("students")
    .select(
      "id, full_name, phone, email, cpf, zip_code, street, street_number, address_complement, neighborhood, city, state",
    )
    .eq("id", studentId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle()

  if (!data) return fail("Aluno não encontrado.")

  const { data: pin, error } = await supabase.rpc("get_student_pin", {
    p_student_id: studentId,
  })
  if (error) return fail("Não foi possível abrir o cadastro do aluno.")

  return {
    ok: true as const,
    student: {
      id: data.id as string,
      fullName: data.full_name as string,
      phone: (data.phone as string) ?? "",
      pin: typeof pin === "string" ? pin : "",
      email: (data.email as string | null) ?? "",
      cpf: (data.cpf as string | null) ?? "",
      zipCode: (data.zip_code as string | null) ?? "",
      street: (data.street as string | null) ?? "",
      streetNumber: (data.street_number as string | null) ?? "",
      complement: (data.address_complement as string | null) ?? "",
      neighborhood: (data.neighborhood as string | null) ?? "",
      city: (data.city as string | null) ?? "",
      state: (data.state as string | null) ?? "",
    } satisfies StudentRecord,
  }
}

export async function createStudent(input: StudentInput) {
  const parsed = parseStudent(input)
  if (!parsed.ok) return parsed

  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const { data, error } = await supabase.rpc("create_student", {
    p_organization_id: organizationId,
    p_full_name: parsed.name,
    p_phone: parsed.phone,
    p_pin: parsed.pin,
    p_email: parsed.email,
    p_address: parsed.address,
  })

  if (error || !data) return fail("Não foi possível cadastrar o aluno. Tente de novo.")

  const studentId = one(data as { id: string } | { id: string }[])?.id
  if (!studentId) return fail("Aluno criado, mas não consegui ler o cadastro.")

  const { error: detailsError } = await supabase
    .from("students")
    .update(studentPatch(parsed))
    .eq("id", studentId)
    .eq("organization_id", organizationId)

  if (detailsError) {
    await supabase.from("students").delete().eq("id", studentId)
    return fail(writeError(detailsError))
  }

  revalidatePath("/alunos")
  revalidatePath("/agenda")
  return { ok: true as const }
}

export async function updateStudent(studentId: string, input: StudentInput) {
  const parsed = parseStudent(input)
  if (!parsed.ok) return parsed

  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const { data: existing } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .maybeSingle()
  if (!existing) return fail("Aluno não encontrado.")

  const { error: pinError } = await supabase.rpc("set_student_pin", {
    p_student_id: studentId,
    p_pin: parsed.pin,
  })
  if (pinError) {
    return fail(
      pinError.message.includes("phone+PIN")
        ? "Esse telefone já usa este PIN. Escolha outro."
        : "Não foi possível atualizar o PIN.",
    )
  }

  const { error } = await supabase
    .from("students")
    .update({
      full_name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      address: parsed.address,
      ...studentPatch(parsed),
    })
    .eq("id", studentId)
    .eq("organization_id", organizationId)

  if (error) return fail(writeError(error))

  revalidatePath("/alunos")
  revalidatePath("/agenda")
  return { ok: true as const }
}

export async function deleteStudent(studentId: string) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const { data, error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId)
    .eq("organization_id", organizationId)
    .select("id")

  if (error || !data?.length) return fail("Não foi possível excluir o aluno.")

  revalidatePath("/alunos")
  revalidatePath("/agenda")
  revalidatePath("/inicio")
  return { ok: true as const }
}

function parseStudent(input: StudentInput): ParsedStudent | { ok: false; error: string } {
  const name = input.fullName.trim()
  const phone = onlyDigits(input.phone)
  const pin = onlyDigits(input.pin)
  const email = input.email?.trim().toLowerCase() || null
  const cpf = onlyDigits(input.cpf ?? "") || null
  const zipCode = onlyDigits(input.zipCode ?? "") || null
  const street = blankToNull(input.street)
  const streetNumber = blankToNull(input.streetNumber)
  const complement = blankToNull(input.complement)
  const neighborhood = blankToNull(input.neighborhood)
  const city = blankToNull(input.city)
  const state = input.state?.trim().toUpperCase() || null

  if (name.length < 2) return fail("Informe o nome do aluno.")
  if (phone.length < 10 || phone.length > 11) return fail("Informe um telefone com DDD.")
  if (!/^\d{4}$/.test(pin)) return fail("O PIN precisa ter 4 dígitos.")
  if (email && !isEmail(email)) return fail("Informe um e-mail válido.")
  if (cpf && !isValidCpf(cpf)) return fail("Informe um CPF válido.")
  if (zipCode && zipCode.length !== 8) return fail("Informe um CEP com 8 dígitos.")
  if (state && !/^[A-Z]{2}$/.test(state)) return fail("Informe a UF com 2 letras.")

  return {
    ok: true,
    name,
    phone,
    pin,
    email,
    cpf,
    zipCode,
    street,
    streetNumber,
    complement,
    neighborhood,
    city,
    state,
    address: formatAddress({
      street,
      streetNumber,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
    }),
  }
}

function studentPatch(student: ParsedStudent) {
  return {
    cpf: student.cpf,
    zip_code: student.zipCode,
    street: student.street,
    street_number: student.streetNumber,
    address_complement: student.complement,
    neighborhood: student.neighborhood,
    city: student.city,
    state: student.state,
  }
}

function writeError(error: { code?: string; message?: string }) {
  if (error.code === "23505" && error.message?.includes("cpf")) {
    return "Já existe um aluno com este CPF."
  }
  if (error.code === "23505") {
    return "Esse telefone já usa este PIN. Escolha outro."
  }
  return "Não foi possível salvar o aluno."
}

function fail(error: string) {
  return { ok: false as const, error }
}

function blankToNull(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function formatAddress(parts: {
  street: string | null
  streetNumber: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zipCode: string | null
}) {
  const line = [parts.street, parts.streetNumber].filter(Boolean).join(", ")
  const city = [parts.city, parts.state].filter(Boolean).join(" - ")
  const text = [line, parts.complement, parts.neighborhood, city, parts.zipCode]
    .filter(Boolean)
    .join(", ")
  return text || null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function endEnrollment(input: {
  enrollmentId: string
  endDate: string
  reason: string
}) {
  const endDate = input.endDate.slice(0, 10)
  const reason = input.reason.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { ok: false as const, error: "Escolha o dia de encerramento." }
  }
  if (!reason) return { ok: false as const, error: "Escreva o motivo." }
  if (reason.length > 500) {
    return { ok: false as const, error: "O motivo pode ter até 500 caracteres." }
  }

  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) {
    return { ok: false as const, error: "Sua conta ainda não tem uma organização." }
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, student_id, start_date")
    .eq("id", input.enrollmentId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (!enrollment) return { ok: false as const, error: "Matrícula não encontrada." }
  if (endDate < String(enrollment.start_date).slice(0, 10)) {
    return { ok: false as const, error: "O encerramento fica depois do início da matrícula." }
  }

  const today = saoPauloNow().ymd
  const stillActive = endDate >= today
  const { error } = await supabase
    .from("enrollments")
    .update({
      end_date: endDate,
      end_reason: reason,
      active: stillActive,
    })
    .eq("id", enrollment.id)
    .eq("organization_id", organizationId)

  if (error) return { ok: false as const, error: "Não foi possível encerrar a matrícula." }

  await supabase
    .from("schedule_rules")
    .update({ valid_to: endDate, active: stillActive })
    .eq("enrollment_id", enrollment.id)
    .eq("organization_id", organizationId)
    .eq("active", true)

  await supabase
    .from("lessons")
    .delete()
    .eq("enrollment_id", enrollment.id)
    .eq("organization_id", organizationId)
    .eq("status", "scheduled")
    .gte("scheduled_at", `${addDays(endDate, 1)}T00:00:00-03:00`)

  revalidatePath(`/alunos/${enrollment.student_id}`)
  revalidatePath("/agenda")
  revalidatePath("/inicio")
  return { ok: true as const }
}

"use server"

import { revalidatePath } from "next/cache"
import { isEmail } from "@/lib/auth-fields"
import { onlyDigits } from "@/lib/br-docs"
import { ORG_BRANDING_BUCKET, orgLogoPath, readOrgLogo } from "@/lib/org-branding"
import {
  isOrgType,
  normalizeWebsite,
  type OrganizationProfile,
  type OrgType,
} from "@/lib/organization"
import { CURRENT_PLAN_ID, type PlanId } from "@/lib/plans"
import { getTeacherContext } from "@/lib/teacher"

export type BillingInvoice = {
  id: string
  dueDate: string
  amount: number
  status: "pending" | "paid" | "overdue" | "canceled"
  description: string
}

export type SettingsData = {
  teacherName: string
  organization: OrganizationProfile
  usage: {
    studentCount: number
    storageBytes: number
  }
  planId: PlanId
  invoices: BillingInvoice[]
}

export type OrganizationInput = {
  displayName: string
  schoolName?: string
  email?: string
  phone?: string
  website?: string
  zipCode?: string
  street?: string
  streetNumber?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
}

type TeacherClient = Awaited<ReturnType<typeof getTeacherContext>>["supabase"]

export async function getSettings(): Promise<
  { ok: true; data: SettingsData } | { ok: false; error: string }
> {
  const { supabase, organizationId, fullName } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const [{ data: org, error: orgError }, studentsResult, materialsResult] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, type, name, email, phone, website, zip_code, street, street_number, address_complement, neighborhood, city, state, logo_path",
      )
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("active", true),
    supabase.from("materials").select("size_bytes").eq("organization_id", organizationId),
  ])

  if (orgError || !org) return fail("Não foi possível carregar as configurações.")

  const logoPath = (org.logo_path as string | null) ?? ""
  const logoUrl = await signedBrandingUrl(supabase, logoPath)

  const storageBytes = (materialsResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.size_bytes ?? 0),
    0,
  )

  return {
    ok: true,
    data: {
      teacherName: fullName,
      organization: {
        id: org.id as string,
        type: isOrgType(String(org.type)) ? (org.type as OrgType) : "solo",
        name: (org.name as string) ?? "",
        schoolName: isOrgType(String(org.type)) && org.type === "school" ? ((org.name as string) ?? "") : "",
        email: (org.email as string | null) ?? "",
        phone: (org.phone as string | null) ?? "",
        website: (org.website as string | null) ?? "",
        zipCode: (org.zip_code as string | null) ?? "",
        street: (org.street as string | null) ?? "",
        streetNumber: (org.street_number as string | null) ?? "",
        complement: (org.address_complement as string | null) ?? "",
        neighborhood: (org.neighborhood as string | null) ?? "",
        city: (org.city as string | null) ?? "",
        state: (org.state as string | null) ?? "",
        logoPath,
        logoUrl,
      },
      usage: {
        studentCount: studentsResult.count ?? 0,
        storageBytes,
      },
      planId: CURRENT_PLAN_ID,
      invoices: [],
    },
  }
}

export async function getOrganizationBranding() {
  const result = await getSettings()
  if (!result.ok) return null
  return result.data.organization
}

export async function updateOrganization(input: OrganizationInput) {
  const { supabase, organizationId, userId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const parsed = parseOrganization(input)
  if (!parsed.ok) return parsed

  const { error } = await supabase
    .from("organizations")
    .update({
      type: parsed.type,
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      website: parsed.website,
      zip_code: parsed.zipCode,
      street: parsed.street,
      street_number: parsed.streetNumber,
      address_complement: parsed.complement,
      neighborhood: parsed.neighborhood,
      city: parsed.city,
      state: parsed.state,
    })
    .eq("id", organizationId)

  if (error) return fail("Não foi possível salvar os dados. Tente de novo.")

  const { error: memberError } = await supabase
    .from("members")
    .update({ display_name: parsed.displayName })
    .eq("user_id", userId)
    .eq("organization_id", organizationId)

  if (memberError) return fail("Os dados da conta salvaram, mas o seu nome não. Tente de novo.")
  refreshSettings()
  return { ok: true as const }
}

export async function uploadOrganizationLogo(form: FormData) {
  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) return fail("Escolha a logo.")

  const parsed = await readOrgLogo(file)
  if (!parsed.ok) return parsed

  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const path = orgLogoPath(organizationId)
  const { error: uploadError } = await supabase.storage.from(ORG_BRANDING_BUCKET).upload(
    path,
    new Blob([parsed.bytes], { type: "image/jpeg" }),
    {
      upsert: true,
      contentType: "image/jpeg",
      cacheControl: "3600",
    },
  )
  if (uploadError) return fail("Não foi possível enviar o arquivo. Tente de novo.")

  const { error } = await supabase
    .from("organizations")
    .update({ logo_path: path })
    .eq("id", organizationId)
  if (error) return fail("O arquivo subiu, mas não ficou ligado à conta.")

  refreshSettings()
  return { ok: true as const }
}

export async function removeOrganizationLogo() {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  await supabase.storage.from(ORG_BRANDING_BUCKET).remove([orgLogoPath(organizationId)])
  const { error } = await supabase
    .from("organizations")
    .update({ logo_path: null })
    .eq("id", organizationId)
  if (error) return fail("Não foi possível remover o arquivo.")
  refreshSettings()
  return { ok: true as const }
}

async function signedBrandingUrl(supabase: TeacherClient, path: string) {
  if (!path) return ""
  const { data } = await supabase.storage.from(ORG_BRANDING_BUCKET).createSignedUrl(path, 60 * 60)
  return data?.signedUrl ?? ""
}

function parseOrganization(input: OrganizationInput) {
  const displayName = input.displayName.trim()
  const schoolName = input.schoolName?.trim() ?? ""
  const type: OrgType = schoolName ? "school" : "solo"
  const name = schoolName || displayName
  const email = input.email?.trim().toLowerCase() || null
  const phone = onlyDigits(input.phone ?? "") || null
  const websiteRaw = input.website?.trim() || ""
  const zipCode = onlyDigits(input.zipCode ?? "") || null
  const street = blankToNull(input.street)
  const streetNumber = blankToNull(input.streetNumber)
  const complement = blankToNull(input.complement)
  const neighborhood = blankToNull(input.neighborhood)
  const city = blankToNull(input.city)
  const state = input.state?.trim().toUpperCase() || null

  if (displayName.length < 2) return fail("Informe o seu nome.")
  if (displayName.length > 80) return fail("O seu nome pode ter até 80 caracteres.")
  if (schoolName && schoolName.length < 2) return fail("Informe o nome da escola.")
  if (schoolName.length > 120) return fail("O nome da escola pode ter até 120 caracteres.")
  if (email && !isEmail(email)) return fail("Informe um e-mail válido.")
  if (phone && (phone.length < 10 || phone.length > 11)) {
    return fail("Informe um telefone com DDD.")
  }
  const website = normalizeWebsite(websiteRaw)
  if (!website.ok) return website
  if (zipCode && zipCode.length !== 8) return fail("Informe um CEP com 8 dígitos.")
  if (state && !/^[A-Z]{2}$/.test(state)) return fail("Informe a UF com 2 letras.")

  return {
    ok: true as const,
    type,
    name,
    displayName,
    email,
    phone,
    website: website.website,
    zipCode,
    street,
    streetNumber,
    complement,
    neighborhood,
    city,
    state,
  }
}

function blankToNull(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function refreshSettings() {
  revalidatePath("/configuracoes")
  revalidatePath("/inicio")
  revalidatePath("/faturamento", "layout")
}

function fail(error: string) {
  return { ok: false as const, error }
}

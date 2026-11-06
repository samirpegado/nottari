import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function getTeacherContext() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect("/")

  const { data: membership } = await supabase
    .from("members")
    .select("display_name, organization_id, organizations(name, type)")
    .eq("user_id", auth.user.id)
    .limit(1)
    .maybeSingle()

  const organization = one(
    membership?.organizations as
      | { name: string; type: string }
      | { name: string; type: string }[]
      | null,
  )

  const fullName =
    membership?.display_name?.trim() || nameFromEmail(auth.user.email)

  return {
    supabase,
    userId: auth.user.id,
    organizationId: membership?.organization_id ?? null,
    organizationName: displaySchoolName(organization),
    fullName,
  }
}

export function displaySchoolName(
  org: { name?: string | null; type?: string | null } | null | undefined,
) {
  if (!org || org.type !== "school") return ""
  return org.name?.trim() || ""
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function nameFromEmail(email: string | undefined) {
  const local = email?.split("@")[0]?.trim()
  return local || "Professor"
}

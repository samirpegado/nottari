export type OrgType = "solo" | "school"

export type OrganizationProfile = {
  id: string
  type: OrgType
  name: string
  schoolName: string
  email: string
  phone: string
  website: string
  zipCode: string
  street: string
  streetNumber: string
  complement: string
  neighborhood: string
  city: string
  state: string
  logoPath: string
  logoUrl: string
}

export function isOrgType(value: string): value is OrgType {
  return value === "solo" || value === "school"
}

export function orgTypeLabel(type: OrgType) {
  return type === "school" ? "Escola (um professor)" : "Professor solo"
}

export function formatOrgAddress(parts: {
  street: string
  streetNumber: string
  complement: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}) {
  const line = [parts.street, parts.streetNumber].filter(Boolean).join(", ")
  const city = [parts.city, parts.state].filter(Boolean).join(" - ")
  const zip = parts.zipCode ? `CEP ${parts.zipCode}` : ""
  return [line, parts.complement, parts.neighborhood, city, zip].filter(Boolean).join(", ")
}

export function normalizeWebsite(raw: string) {
  const value = raw.trim()
  if (!value) return { ok: true as const, website: null }
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(withProtocol)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false as const, error: "Informe um site válido." }
    }
    if (!url.hostname.includes(".")) {
      return { ok: false as const, error: "Informe um site válido." }
    }
    return { ok: true as const, website: url.toString().replace(/\/$/, "") }
  } catch {
    return { ok: false as const, error: "Informe um site válido." }
  }
}

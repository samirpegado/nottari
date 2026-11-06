export const SKILL_LEVELS = ["Iniciante", "Intermediário", "Avançado"] as const

export type SkillLevel = (typeof SKILL_LEVELS)[number]

export const INSTRUMENTS = [
  "Violão",
  "Piano",
  "Teclado",
  "Guitarra",
  "Baixo",
  "Bateria",
  "Canto",
  "Ukulele",
  "Saxofone",
  "Flauta",
  "Violino",
  "Cavaquinho",
  "Clarinete",
  "Trompete",
  "Harpa",
]

export const DEFAULT_STUDENT_COLOR = "#3B82F6"

export const STUDENT_COLORS = [
  { label: "Azul", value: "#3B82F6" },
  { label: "Violeta", value: "#8B5CF6" },
  { label: "Rosa", value: "#DB2777" },
  { label: "Verde", value: "#0D9488" },
  { label: "Laranja", value: "#EA580C" },
  { label: "Vermelho", value: "#DC2626" },
  { label: "Índigo", value: "#4F46E5" },
  { label: "Ciano", value: "#0891B2" },
] as const

export function studentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length === 1
    ? parts[0].slice(0, 2)
    : `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`
  return letters.toUpperCase()
}

export function isStudentColor(value: string | null | undefined): value is string {
  return Boolean(value && /^#[0-9A-Fa-f]{6}$/.test(value))
}

export function normalizeStudentColor(value: string | null | undefined) {
  const hex = value?.trim().toUpperCase()
  return isStudentColor(hex) ? hex : DEFAULT_STUDENT_COLOR
}

export function studentTheme(color?: string | null) {
  const banner = normalizeStudentColor(color)
  return {
    banner,
    avatar: darkenHex(banner, 0.18),
  }
}

function darkenHex(hex: string, amount: number) {
  const value = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) =>
    Math.round(((value >> shift) & 255) * (1 - amount))
      .toString(16)
      .padStart(2, "0")
  return `#${channel(16)}${channel(8)}${channel(0)}`
}

export function isSkillLevel(value: string | null | undefined): value is SkillLevel {
  return SKILL_LEVELS.includes(value as SkillLevel)
}

import { CURRENT_PLAN_ID, fileMaxBytes, planById } from "@/lib/plans"
import { addDays, saoPauloNow } from "@/lib/schedule"
import { DEFAULT_STUDENT_COLOR, STUDENT_COLORS, isStudentColor } from "@/lib/student-profile"

export const MATERIALS_BUCKET = "materials"
export const MATERIAL_MAX_BYTES = fileMaxBytes(planById("professor"))
export const DEFAULT_FOLDER_COLOR = "#8B5CF6"
export const FOLDER_COLORS = STUDENT_COLORS

export const MATERIAL_TYPES = ["pdf", "document", "audio", "video_link"] as const
export type MaterialType = (typeof MATERIAL_TYPES)[number]

export const MATERIAL_TYPE_META: Record<
  MaterialType,
  { label: string; chip: string; icon: string }
> = {
  pdf: { label: "PDF", chip: "bg-[#FEE2E2] text-[#B91C1C]", icon: "bg-[#FEE2E2] text-[#B91C1C]" },
  document: { label: "Word", chip: "bg-[#DBEAFE] text-[#1D4ED8]", icon: "bg-[#DBEAFE] text-[#1D4ED8]" },
  audio: { label: "Áudio", chip: "bg-[#F3E8FF] text-[#7E22CE]", icon: "bg-[#F3E8FF] text-[#7E22CE]" },
  video_link: { label: "Vídeo", chip: "bg-[#FFEDD5] text-[#C2410C]", icon: "bg-[#FFEDD5] text-[#C2410C]" },
}

const FILE_KINDS: { type: MaterialType; mime: string[]; extensions: string[] }[] = [
  { type: "pdf", mime: ["application/pdf"], extensions: [".pdf"] },
  {
    type: "document",
    mime: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    extensions: [".doc", ".docx"],
  },
  { type: "audio", mime: ["audio/mpeg", "audio/mp3"], extensions: [".mp3"] },
]

export function isMaterialType(value: string | null | undefined): value is MaterialType {
  return MATERIAL_TYPES.includes(value as MaterialType)
}

export function normalizeFolderColor(value?: string | null) {
  const hex = value?.trim().toUpperCase()
  return isStudentColor(hex) ? hex : DEFAULT_FOLDER_COLOR
}

export function detectMaterialFile(file: File) {
  const name = file.name.toLowerCase()
  const mime = file.type.toLowerCase()
  const match = FILE_KINDS.find(
    (kind) => kind.mime.includes(mime) || kind.extensions.some((ext) => name.endsWith(ext)),
  )
  if (!match) {
    return { ok: false as const, error: "Envie PDF, Word (.doc/.docx) ou MP3. Vídeo entra como link." }
  }
  if (file.size <= 0) return { ok: false as const, error: "Esse arquivo está vazio." }
  const maxBytes = fileMaxBytes(planById(CURRENT_PLAN_ID))
  if (file.size > maxBytes) {
    const maxMb = planById(CURRENT_PLAN_ID).fileMaxMb
    return { ok: false as const, error: `Cada arquivo pode ter até ${maxMb} MB neste plano.` }
  }
  const chosen = match.mime.includes(mime) ? mime : match.mime[0]
  return {
    ok: true as const,
    type: match.type,
    mime: chosen === "audio/mp3" ? "audio/mpeg" : chosen,
  }
}

export function materialAccept() {
  return ".pdf,.doc,.docx,.mp3,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,audio/mpeg"
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`.replace(".", ",")
  }
  const mb = bytes / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`.replace(".", ",")
}

export function videoHost(url: string | null | undefined) {
  if (!url) return "Link"
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "Link"
  }
}

export function parseVideoUrl(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false as const, error: "Cole o link do vídeo." }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false as const, error: "Informe um link válido, começando com https://." }
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false as const, error: "O link precisa ser http ou https." }
  }
  return { ok: true as const, url: parsed.toString(), host: parsed.hostname.replace(/^www\./, "") }
}

export function safeFileName(name: string) {
  const cleaned = name.replace(/[^\w.\-()\sÀ-ÿ]/g, "").trim().slice(0, 80)
  return cleaned || "arquivo"
}

export function materialPath(organizationId: string, materialId: string, fileName: string) {
  return `${organizationId}/${materialId}/${safeFileName(fileName)}`
}

export function formatMaterialDate(iso: string, todayYmd: string) {
  const ymd = saoPauloNow(new Date(iso)).ymd
  if (ymd === todayYmd) return "Hoje"
  if (ymd === addDays(todayYmd, -1)) return "Ontem"
  const [year, month, day] = ymd.split("-")
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  const label = `${day} ${months[Number(month) - 1]}`
  return year === todayYmd.slice(0, 4) ? label : `${label} ${year}`
}

export function folderSubtitle(fileCount: number, childCount: number) {
  const parts: string[] = []
  if (fileCount > 0) {
    parts.push(`${fileCount} ${fileCount === 1 ? "arquivo" : "arquivos"}`)
  }
  if (childCount > 0) {
    parts.push(`${childCount} ${childCount === 1 ? "subpasta" : "subpastas"}`)
  }
  return parts.join(" · ") || "Vazia"
}

export { DEFAULT_STUDENT_COLOR }

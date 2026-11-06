export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  { value: "card", label: "Cartão" },
  { value: "other", label: "Outro" },
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"]
export type ChargeStatusFilter = "all" | "pending" | "overdue" | "paid"
export type ChargeDisplayStatus = "pending" | "due_today" | "overdue" | "paid"

export const CHARGE_MONTHS_AHEAD = 2
export const CHARGE_MONTHS_BACK = 24

export const MONTH_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
]

const MONTH_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

export function competenceMonth(value: string | null | undefined, todayYmd: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value
  return todayYmd.slice(0, 7)
}

export function minChargeMonth(todayYmd: string) {
  return addMonths(todayYmd.slice(0, 7), -CHARGE_MONTHS_BACK)
}

export function maxChargeMonth(todayYmd: string) {
  return addMonths(todayYmd.slice(0, 7), CHARGE_MONTHS_AHEAD)
}

export function clampChargeMonth(value: string | null | undefined, todayYmd: string) {
  const current = competenceMonth(value, todayYmd)
  const min = minChargeMonth(todayYmd)
  const max = maxChargeMonth(todayYmd)
  if (current < min) return min
  if (current > max) return max
  return current
}

export function competenceDate(yyyyMm: string) {
  return `${yyyyMm}-01`
}

export function addMonths(yyyyMm: string, delta: number) {
  const year = Number(yyyyMm.slice(0, 4))
  const month = Number(yyyyMm.slice(5, 7))
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export function formatCompetence(value: string) {
  const month = monthIndex(value)
  const year = value.slice(0, 4)
  if (month < 0) return value
  return `${MONTH_SHORT[month]}/${year}`
}

export function formatCompetenceLong(value: string) {
  const month = monthIndex(value)
  const year = value.slice(0, 4)
  if (month < 0) return value
  return `${MONTH_LONG[month]} de ${year}`
}

export function formatDateBr(ymd: string) {
  const [year, month, day] = ymd.split("-")
  if (!year || !month || !day) return ymd
  return `${day}/${month}/${year}`
}

export function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

export function formatAmountInput(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export function parseAmount(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/[^\d,.-]/g, "")
  const lastComma = normalized.lastIndexOf(",")
  const lastDot = normalized.lastIndexOf(".")
  const numeric =
    lastComma > lastDot
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "")
  const value = Number(numeric)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100) / 100
}

export function displayStatus(
  status: string,
  dueDate: string,
  todayYmd: string,
): ChargeDisplayStatus {
  if (status === "paid") return "paid"
  if (status === "overdue" || dueDate < todayYmd) return "overdue"
  if (dueDate === todayYmd) return "due_today"
  return "pending"
}

export function statusLabel(status: ChargeDisplayStatus) {
  if (status === "paid") return "Pago"
  if (status === "overdue") return "Atrasado"
  if (status === "due_today") return "Vence hoje"
  return "A vencer"
}

export function statusMatches(status: ChargeDisplayStatus, filter: ChargeStatusFilter) {
  if (filter === "all") return true
  if (filter === "paid") return status === "paid"
  if (filter === "overdue") return status === "overdue"
  return status === "pending" || status === "due_today"
}

export function isStatusFilter(value: string | null | undefined): value is ChargeStatusFilter {
  return value === "all" || value === "pending" || value === "overdue" || value === "paid"
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method.value === value)
}

export function paymentMethodLabel(value: string | null | undefined) {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value ?? ""
}

export function whatsappHref(phone: string, text: string) {
  const digits = whatsappDigits(phone)
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function receiptNumber(chargeId: string, competence: string) {
  const compact = chargeId.replace(/-/g, "").slice(0, 8).toUpperCase()
  return `NT-${competence.slice(0, 7).replace("-", "")}-${compact}`
}

function whatsappDigits(phone: string) {
  let digits = phone.replace(/\D/g, "")
  if (digits.startsWith("55") && digits.length >= 12) return digits
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`
  return ""
}

function monthIndex(value: string) {
  const month = Number(value.slice(5, 7))
  return month >= 1 && month <= 12 ? month - 1 : -1
}

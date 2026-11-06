export const PLAN_IDS = ["free", "professor"] as const
export type PlanId = (typeof PLAN_IDS)[number]

export type Plan = {
  id: PlanId
  name: string
  students: number
  storageMb: number
  fileMaxMb: number
  monthlyPrice: number
  yearlyPrice: number | null
  blurb: string
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratuito",
    students: 5,
    storageMb: 50,
    fileMaxMb: 10,
    monthlyPrice: 0,
    yearlyPrice: null,
    blurb: "Para começar com poucos alunos e testar o fluxo da aula.",
  },
  {
    id: "professor",
    name: "Professor",
    students: 50,
    storageMb: 1024,
    fileMaxMb: 20,
    monthlyPrice: 29.9,
    yearlyPrice: 299,
    blurb: "Para o professor com a agenda cheia.",
  },
]

export const CURRENT_PLAN_ID: PlanId = "free"

export function planById(id: PlanId) {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0]
}

export function formatStorageBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024
    return `${kb >= 10 ? kb.toFixed(0) : kb.toFixed(1)} KB`
  }
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) {
    const gb = mb / 1024
    return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1).replace(".", ",")} GB`
  }
  return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1).replace(".", ",")} MB`
}

export function formatPlanStorage(plan: Plan) {
  if (plan.storageMb >= 1024 && plan.storageMb % 1024 === 0) {
    const gb = plan.storageMb / 1024
    return `${gb} GB`
  }
  return `${plan.storageMb} MB`
}

export function storageLimitBytes(plan: Plan) {
  return plan.storageMb * 1024 * 1024
}

export function fileMaxBytes(plan: Plan) {
  return plan.fileMaxMb * 1024 * 1024
}

export function studentLimitLabel(plan: Plan) {
  return String(plan.students)
}

export function formatPlanPrice(plan: Plan) {
  if (plan.monthlyPrice === 0) return { label: "R$ 0", detail: null as string | null }
  return {
    label: `${formatBrlAmount(plan.monthlyPrice)}/mês`,
    detail:
      plan.yearlyPrice == null ? null : `ou ${formatBrlAmount(plan.yearlyPrice)} por ano`,
  }
}

function formatBrlAmount(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

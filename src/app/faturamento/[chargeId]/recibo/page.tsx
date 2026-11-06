import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PrintButton } from "@/components/teacher/print-button"
import { formatCep, formatCpf } from "@/lib/br-docs"
import { formatBrPhone } from "@/lib/auth-fields"
import {
  formatBrl,
  formatCompetenceLong,
  formatDateBr,
  paymentMethodLabel,
  receiptNumber,
} from "@/lib/charges"
import { formatOrgAddress } from "@/lib/organization"
import { saoPauloNow } from "@/lib/schedule"
import { getTeacherContext } from "@/lib/teacher"
import { getOrganizationBranding } from "@/app/configuracoes/actions"

export const metadata: Metadata = {
  title: "Recibo",
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ chargeId: string }>
}) {
  const { chargeId } = await params
  const { supabase, organizationId, organizationName, fullName } = await getTeacherContext()
  if (!organizationId) notFound()
  const org = await getOrganizationBranding()

  const { data } = await supabase
    .from("charges")
    .select(
      "id, competence, due_date, amount, status, paid_at, paid_amount, method, notes, lesson_id, enrollments!inner(billing_type, students!inner(full_name, stage_name, cpf))",
    )
    .eq("id", chargeId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (!data || data.status !== "paid") notFound()

  const enrollment = one(data.enrollments as EnrollmentJoin | EnrollmentJoin[] | null)
  const student = one(enrollment?.students)
  const studentName = student?.stage_name?.trim() || student?.full_name || "Aluno"
  const perLesson = enrollment?.billing_type === "per_lesson"
  const oneOff = Boolean(data.lesson_id)
  const paidAmount = Number(data.paid_amount ?? data.amount ?? 0)
  const paidAt = data.paid_at ? String(data.paid_at).slice(0, 10) : ""
  const competence = String(data.competence).slice(0, 10)
  const number = receiptNumber(data.id as string, competence)

  return (
    <div className="min-h-svh bg-[#F8FAFC] text-[#0B1220]">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 print:hidden">
        <Link href="/faturamento" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft data-icon="inline-start" />
          Voltar
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto w-[210mm] max-w-full bg-white px-10 py-12 shadow-sm ring-1 ring-[#0B1220]/5 print:w-auto print:max-w-none print:shadow-none print:ring-0">
        <header className="flex items-start justify-between gap-6 border-b border-[#0B1220]/10 pb-6">
          <div className="flex min-w-0 items-start gap-4">
            <img
              src={org?.logoUrl || "/brand/logo-symbol.png"}
              alt=""
              className="size-14 shrink-0 rounded-xl object-contain"
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">Recibo</h1>
              {org?.schoolName || organizationName ? (
                <p className="mt-1 text-sm font-medium">{org?.schoolName || organizationName}</p>
              ) : null}
              {org ? <OrgContacts org={org} /> : null}
            </div>
          </div>
          <p className="shrink-0 text-right text-sm text-[#64748B]">
            Nº {number}
            <span className="mt-1 block">{fullName}</span>
          </p>
        </header>

        <p className="mt-8 text-base leading-relaxed">
          Recebemos de <strong>{studentName}</strong>
          {student?.cpf ? `, CPF ${formatCpf(student.cpf)}` : ""}, a importância de{" "}
          <strong>{formatBrl(paidAmount)}</strong>, referente{" "}
          {oneOff
            ? <>à aula avulsa de <strong>{formatDateBr(String(data.due_date).slice(0, 10))}</strong></>
            : perLesson
              ? <>às aulas de <strong>{formatCompetenceLong(competence)}</strong></>
              : <>à mensalidade de <strong>{formatCompetenceLong(competence)}</strong></>}
          .
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <Item label="Competência" value={formatCompetenceLong(competence)} />
          <Item label="Vencimento" value={formatDateBr(String(data.due_date).slice(0, 10))} />
          <Item label="Pago em" value={paidAt ? formatDateBr(paidAt) : "—"} />
          <Item label="Forma" value={paymentMethodLabel(data.method as string | null) || "—"} />
          <Item label="Valor" value={formatBrl(paidAmount)} />
          {data.notes ? <Item label="Observação" value={data.notes as string} /> : null}
        </dl>

        <p className="mt-16 text-sm text-[#64748B]">
          Recibo emitido pelo Nottari em {formatDateBr(saoPauloNow().ymd)}.
        </p>
      </article>

      <p className="mx-auto mt-4 max-w-3xl px-4 pb-8 text-center text-xs text-[#94A3B8] print:hidden">
        Use Imprimir e escolha “Salvar como PDF” no navegador.
      </p>
    </div>
  )
}

function OrgContacts({
  org,
}: {
  org: NonNullable<Awaited<ReturnType<typeof getOrganizationBranding>>>
}) {
  const address = formatOrgAddress({
    street: org.street,
    streetNumber: org.streetNumber,
    complement: org.complement,
    neighborhood: org.neighborhood,
    city: org.city,
    state: org.state,
    zipCode: org.zipCode ? formatCep(org.zipCode) : "",
  })
  const lines = [
    address,
    org.phone ? formatBrPhone(org.phone) : "",
    org.email,
    org.website.replace(/^https?:\/\//, ""),
  ].filter(Boolean)
  if (lines.length === 0) return null
  return <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{lines.join(" · ")}</p>
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-[#94A3B8] uppercase">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  )
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

type EnrollmentJoin = {
  billing_type?: string
  students:
    | { full_name: string; stage_name: string | null; cpf: string | null }
    | { full_name: string; stage_name: string | null; cpf: string | null }[]
    | null
}

import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { listCharges } from "@/app/mensalidades/actions"
import { PrintButton } from "@/components/teacher/print-button"
import { buttonVariants } from "@/components/ui/button"
import { formatBrPhone } from "@/lib/auth-fields"
import {
  displayStatus,
  formatBrl,
  formatCompetenceLong,
  formatDateBr,
  paymentMethodLabel,
  statusLabel,
  type ChargeDisplayStatus,
} from "@/lib/charges"
import { saoPauloNow } from "@/lib/schedule"
import { getTeacherContext } from "@/lib/teacher"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Relatório de mensalidades",
}

export default async function ChargesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ competencia?: string; aluno?: string; status?: string }>
}) {
  const params = await searchParams
  const { organizationName, fullName } = await getTeacherContext()
  const result = await listCharges({
    month: params.competencia,
    studentId: params.aluno,
    status: params.status,
  })

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-[#64748B]">
        {result.error}
      </div>
    )
  }

  const open = result.rows.filter((row) => displayStatus(row.status, row.dueDate, result.today) !== "paid")
  const paid = result.rows.filter((row) => displayStatus(row.status, row.dueDate, result.today) === "paid")
  const back = backHref(params)
  const issued = formatDateBr(saoPauloNow().ymd)

  return (
    <div className="min-h-svh bg-[#F8FAFC] text-[#0B1220]">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 print:hidden">
        <Link href={back} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft data-icon="inline-start" />
          Voltar
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto w-[210mm] max-w-full bg-white px-8 py-10 shadow-sm ring-1 ring-[#0B1220]/5 print:w-auto print:max-w-none print:px-0 print:py-0 print:shadow-none print:ring-0">
        <header className="flex items-start justify-between gap-6 border-b border-[#0B1220]/10 pb-5">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#3B82F6] uppercase">Nottari</p>
            <h1 className="mt-1 text-2xl font-semibold">Controle de mensalidades</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              {formatCompetenceLong(result.month)} · {organizationName}
            </p>
          </div>
          <p className="text-right text-sm text-[#64748B]">
            {fullName}
            <span className="mt-1 block">Emitido em {issued}</span>
          </p>
        </header>

        <section className="mt-6 grid grid-cols-3 gap-3" aria-label="Resumo do mês">
          <SummaryCard
            label="Em aberto"
            value={formatBrl(result.summary.openAmount)}
            hint={`${result.summary.openCount} ${result.summary.openCount === 1 ? "aluno" : "alunos"}`}
          />
          <SummaryCard
            label="Vencendo"
            value={formatBrl(result.summary.dueSoonAmount)}
            hint={`${result.summary.dueSoonCount} nos próximos 7 dias`}
          />
          <SummaryCard
            label="Recebido"
            value={formatBrl(result.summary.receivedAmount)}
            hint={`${result.summary.receivedCount} ${result.summary.receivedCount === 1 ? "pago" : "pagos"}`}
          />
        </section>

        <ReportTable
          title="Em aberto"
          empty="Nenhum aluno em aberto neste mês."
          rows={open.map((row) => {
            const shown = displayStatus(row.status, row.dueDate, result.today)
            return {
              id: row.id,
              student: row.studentName,
              phone: formatBrPhone(row.studentPhone) || "—",
              due: formatDateBr(row.dueDate),
              amount: formatBrl(row.amount),
              extra: "—",
              status: shown,
            }
          })}
          extraLabel="Pagamento"
        />

        <ReportTable
          title="Pagos"
          empty="Nenhuma mensalidade paga neste mês."
          rows={paid.map((row) => ({
            id: row.id,
            student: row.studentName,
            phone: formatBrPhone(row.studentPhone) || "—",
            due: formatDateBr(row.dueDate),
            amount: formatBrl(row.paidAmount ?? row.amount),
            extra: [row.paidAt ? formatDateBr(row.paidAt) : null, paymentMethodLabel(row.method)]
              .filter(Boolean)
              .join(" · ") || "—",
            status: "paid" as const,
          }))}
          extraLabel="Pago em"
        />

        <p className="mt-10 text-xs text-[#94A3B8]">
          Relatório de controle do professor. Não substitui recibo individual.
        </p>
      </article>

      <p className="mx-auto mt-4 max-w-4xl px-4 pb-8 text-center text-xs text-[#94A3B8] print:hidden">
        Use Imprimir e escolha “Salvar como PDF” no navegador.
      </p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-[#0B1220]/10 px-3 py-3">
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-[#94A3B8]">{hint}</p>
    </div>
  )
}

function ReportTable({
  title,
  empty,
  rows,
  extraLabel,
}: {
  title: string
  empty: string
  extraLabel: string
  rows: {
    id: string
    student: string
    phone: string
    due: string
    amount: string
    extra: string
    status: ChargeDisplayStatus
  }[]
}) {
  return (
    <section className="mt-8 break-inside-avoid">
      <h2 className="text-sm font-semibold tracking-wide text-[#64748B] uppercase">
        {title}
        <span className="ml-2 font-medium text-[#94A3B8]">{rows.length}</span>
      </h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[#64748B]">{empty}</p>
      ) : (
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="border-b border-[#0B1220]/10 text-left text-xs font-semibold tracking-wide text-[#94A3B8] uppercase">
              <th className="py-2 pr-3 font-semibold">Aluno</th>
              <th className="py-2 pr-3 font-semibold">Telefone</th>
              <th className="py-2 pr-3 font-semibold">Vencimento</th>
              <th className="py-2 pr-3 font-semibold">Valor</th>
              <th className="py-2 pr-3 font-semibold">{extraLabel}</th>
              <th className="py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#0B1220]/5">
                <td className="py-2 pr-3 font-medium">{row.student}</td>
                <td className="py-2 pr-3 text-[#334155]">{row.phone}</td>
                <td className="py-2 pr-3 text-[#334155]">{row.due}</td>
                <td className="py-2 pr-3 font-medium tabular-nums">{row.amount}</td>
                <td className="py-2 pr-3 text-[#334155]">{row.extra}</td>
                <td className="py-2">
                  <StatusMark status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function StatusMark({ status }: { status: ChargeDisplayStatus }) {
  const styles = {
    pending: "text-[#1D4ED8]",
    due_today: "text-[#B45309]",
    overdue: "text-[#B91C1C]",
    paid: "text-[#047857]",
  }
  return <span className={cn("text-xs font-semibold", styles[status])}>{statusLabel(status)}</span>
}

function backHref(params: { competencia?: string; aluno?: string; status?: string }) {
  const query = new URLSearchParams()
  if (params.competencia) query.set("competencia", params.competencia)
  if (params.aluno) query.set("aluno", params.aluno)
  if (params.status) query.set("status", params.status)
  const search = query.toString()
  return search ? `/mensalidades?${search}` : "/mensalidades"
}

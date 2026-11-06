import type { Metadata } from "next"
import { CircleAlert, CircleCheck, Wallet } from "lucide-react"
import { TeacherShell } from "@/components/teacher/teacher-shell"
import { ChargesBoard } from "@/components/teacher/charges-table"
import { formatBrl } from "@/lib/charges"
import { getTeacherContext } from "@/lib/teacher"
import { listCharges } from "@/app/mensalidades/actions"

export const metadata: Metadata = {
  title: "Mensalidades",
}

export default async function ChargesPage({
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

  return (
    <TeacherShell name={fullName} organization={organizationName}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
          Mensalidades
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">
          Quem deve este mês
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Controle de vencimento e baixa manual. Sem processar pagamento.
        </p>
      </header>

      {result.ok ? (
        <>
          <section
            className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
            aria-label="Resumo do período"
          >
            <Stat
              label="Em aberto"
              value={formatBrl(result.summary.openAmount)}
              hint={
                result.summary.openCount > 0
                  ? `${result.summary.openCount} ${result.summary.openCount === 1 ? "cobrança" : "cobranças"}`
                  : "Nada em aberto"
              }
              tone={result.summary.openCount > 0 ? "amber" : "muted"}
              icon={<Wallet className="size-5" />}
            />
            <Stat
              label="Vencendo"
              value={formatBrl(result.summary.dueSoonAmount)}
              hint={
                result.summary.dueSoonCount > 0
                  ? `${result.summary.dueSoonCount} nos próximos 7 dias`
                  : "Nada nos próximos 7 dias"
              }
              tone={result.summary.dueSoonCount > 0 ? "blue" : "muted"}
              icon={<CircleAlert className="size-5" />}
            />
            <Stat
              label="Recebido no mês"
              value={formatBrl(result.summary.receivedAmount)}
              hint={
                result.summary.receivedCount > 0
                  ? `${result.summary.receivedCount} ${result.summary.receivedCount === 1 ? "baixa" : "baixas"}`
                  : "Nenhuma baixa ainda"
              }
              tone={result.summary.receivedCount > 0 ? "green" : "muted"}
              icon={<CircleCheck className="size-5" />}
            />
          </section>

          <section className="mt-6">
            <ChargesBoard
              rows={result.rows}
              month={result.month}
              today={result.today}
              studentFilter={result.studentFilter}
              statusFilter={params.status ?? "all"}
            />
          </section>
        </>
      ) : (
        <p className="mt-6 rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-10 text-center text-sm text-[#64748B]">
          {result.error}
        </p>
      )}
    </TeacherShell>
  )
}

const TONES = {
  blue: { bg: "bg-[#3B82F6]/10", fg: "text-[#3B82F6]" },
  green: { bg: "bg-[#10B981]/12", fg: "text-[#047857]" },
  amber: { bg: "bg-[#F59E0B]/15", fg: "text-[#B45309]" },
  muted: { bg: "bg-[#0B1220]/5", fg: "text-[#64748B]" },
}

function Stat({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string
  value: string
  hint: string
  tone: keyof typeof TONES
  icon: React.ReactNode
}) {
  const colors = TONES[tone]
  return (
    <article className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#0B1220]/5 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-[#64748B]">{label}</span>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${colors.bg} ${colors.fg}`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-[#64748B]">{hint}</p>
    </article>
  )
}

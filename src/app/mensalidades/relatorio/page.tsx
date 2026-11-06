import { redirect } from "next/navigation"

export default async function MensalidadesReportRedirect({
  searchParams,
}: {
  searchParams: Promise<{ competencia?: string; aluno?: string; status?: string }>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  if (params.competencia) query.set("competencia", params.competencia)
  if (params.aluno) query.set("aluno", params.aluno)
  if (params.status) query.set("status", params.status)
  const search = query.toString()
  redirect(search ? `/faturamento/relatorio?${search}` : "/faturamento/relatorio")
}

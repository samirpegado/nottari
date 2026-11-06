import type { Metadata } from "next"
import Link from "next/link"
import { TeacherShell } from "@/components/teacher/teacher-shell"
import { StudentsToolbar } from "@/components/teacher/students-toolbar"
import { StudentsTable, type StudentRow } from "@/components/teacher/students-table"
import { getTeacherContext } from "@/lib/teacher"

export const metadata: Metadata = {
  title: "Alunos",
}

const PAGE_SIZE = 20

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  const query = params.q?.trim() ?? ""
  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { supabase, organizationId, organizationName, fullName } =
    await getTeacherContext()

  let rows: StudentRow[] = []
  let total = 0

  if (organizationId) {
    let request = supabase
      .from("students")
      .select("id, full_name, phone, email, cpf", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("active", true)

    const term = filterTerm(query)
    const digits = query.replace(/\D/g, "")
    if (term || digits) {
      const clauses = []
      if (term) {
        clauses.push(`full_name.ilike.%${term}%`, `email.ilike.%${term}%`)
      }
      if (digits) {
        clauses.push(`phone.ilike.%${digits}%`, `cpf.ilike.%${digits}%`)
      }
      request = request.or(clauses.join(","))
    }

    const { data, count } = await request
      .order("full_name", { ascending: true })
      .range(from, to)

    rows = (data ?? []) as StudentRow[]
    total = count ?? 0
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showingFrom = total === 0 ? 0 : from + 1
  const showingTo = Math.min(to + 1, total)

  return (
    <TeacherShell name={fullName} organization={organizationName}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">
            Alunos
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">
            Quem você ensina
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Cadastre o aluno aqui. O horário fixo da aula fica na Agenda.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <StudentsToolbar query={query} />
        </div>
      </header>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#0B1220]/5">
        <StudentsTable
          rows={rows}
          emptyLabel={
            query
              ? "Nenhum aluno encontrado para essa busca."
              : "Nenhum aluno ainda. Use Adicionar aluno para fazer o primeiro cadastro."
          }
        />

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#0B1220]/5 px-5 py-3 text-sm text-[#64748B]">
          <p>
            {showingFrom}–{showingTo} de {total}
          </p>
          <div className="flex items-center gap-2">
            <PageLink query={query} page={page - 1} disabled={page <= 1}>
              Anterior
            </PageLink>
            <span className="tabular-nums">
              {page} / {pages}
            </span>
            <PageLink query={query} page={page + 1} disabled={page >= pages}>
              Próxima
            </PageLink>
          </div>
        </footer>
      </section>
    </TeacherShell>
  )
}

function PageLink({
  query,
  page,
  disabled,
  children,
}: {
  query: string
  page: number
  disabled: boolean
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className="rounded-lg px-3 py-1.5 font-medium text-[#94A3B8]">{children}</span>
    )
  }
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  if (page > 1) params.set("page", String(page))
  const href = params.toString() ? `/alunos?${params.toString()}` : "/alunos"
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 font-medium text-[#0B1220] hover:bg-[#F8FAFC]"
    >
      {children}
    </Link>
  )
}

function filterTerm(value: string) {
  return value.replace(/[%_,()\\]/g, "").trim()
}

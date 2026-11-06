import type { Metadata } from "next"
import { TeacherShell } from "@/components/teacher/teacher-shell"
import { StudentsToolbar } from "@/components/teacher/students-toolbar"
import { signedPhotoUrls } from "@/app/alunos/actions"
import { StudentsList, type StudentRow } from "@/components/teacher/students-list"
import { WEEKDAY_SHORT, timeToMinutes } from "@/lib/schedule"
import { normalizeStudentColor } from "@/lib/student-profile"
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
      .select("id, full_name, phone, email, cpf, instrument, skill_level, color, photo_path", { count: "exact" })
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

    const ids = (data ?? []).map((row) => row.id as string)
    const photoPaths = (data ?? [])
      .map((row) => (row.photo_path as string | null) ?? "")
      .filter(Boolean)
    const [extras, photos] = await Promise.all([
      organizationId && ids.length > 0
        ? studentExtras(supabase, organizationId, ids)
        : Promise.resolve({
            nextLesson: new Map<string, string>(),
            charge: new Map<string, "pending" | "ok">(),
          }),
      signedPhotoUrls(supabase, photoPaths),
    ])
    rows = (data ?? []).map((row) => ({
      id: row.id as string,
      full_name: row.full_name as string,
      phone: (row.phone as string) ?? "",
      email: (row.email as string | null) ?? null,
      cpf: (row.cpf as string | null) ?? null,
      instrument: (row.instrument as string | null) ?? null,
      skillLevel: (row.skill_level as string | null) ?? null,
      color: normalizeStudentColor((row.color as string | null) ?? ""),
      photoUrl: photos.get((row.photo_path as string | null) ?? "") ?? null,
      nextLesson: extras.nextLesson.get(row.id as string) ?? null,
      chargeStatus: extras.charge.get(row.id as string) ?? null,
    }))
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
      </header>

      <section className="mt-6">
        <div className="pb-4">
          <StudentsToolbar query={query} />
        </div>
        <StudentsList
          rows={rows}
          query={query}
          page={page}
          pages={pages}
          total={total}
          showingFrom={showingFrom}
          showingTo={showingTo}
          emptyLabel={
            query
              ? "Nenhum aluno encontrado para essa busca."
              : "Nenhum aluno ainda. Use Adicionar aluno para fazer o primeiro cadastro."
          }
        />
      </section>
    </TeacherShell>
  )
}

function filterTerm(value: string) {
  return value.replace(/[%_,()\\]/g, "").trim()
}

async function studentExtras(
  supabase: Awaited<ReturnType<typeof getTeacherContext>>["supabase"],
  organizationId: string,
  studentIds: string[],
) {
  const [rulesResult, chargesResult] = await Promise.all([
    supabase
      .from("schedule_rules")
      .select("weekday, start_time, enrollments!inner(student_id)")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .in("enrollments.student_id", studentIds),
    supabase
      .from("charges")
      .select("status, enrollments!inner(student_id)")
      .eq("organization_id", organizationId)
      .in("enrollments.student_id", studentIds)
      .in("status", ["pending", "overdue", "paid"]),
  ])

  const nextLesson = new Map<string, string>()
  for (const rule of rulesResult.data ?? []) {
    const studentId = one((rule as { enrollments?: { student_id: string } | { student_id: string }[] }).enrollments)
      ?.student_id
    if (!studentId || nextLesson.has(studentId)) continue
    const weekday = Number(rule.weekday)
    const minutes = timeToMinutes(String(rule.start_time))
    const hours = String(Math.floor(minutes / 60)).padStart(2, "0")
    const rest = String(minutes % 60).padStart(2, "0")
    nextLesson.set(studentId, `${WEEKDAY_SHORT[weekday]}, ${hours}:${rest}`)
  }

  const charge = new Map<string, "pending" | "ok">()
  for (const row of chargesResult.data ?? []) {
    const studentId = one((row as { enrollments?: { student_id: string } | { student_id: string }[] }).enrollments)
      ?.student_id
    if (!studentId) continue
    const pending = row.status === "pending" || row.status === "overdue"
    if (pending) charge.set(studentId, "pending")
    else if (!charge.has(studentId)) charge.set(studentId, "ok")
  }
  for (const id of studentIds) {
    if (nextLesson.has(id) && !charge.has(id)) charge.set(id, "ok")
  }

  return { nextLesson, charge }
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

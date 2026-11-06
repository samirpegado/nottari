import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { TeacherShell } from "@/components/teacher/teacher-shell"
import { StudentBoard } from "@/components/teacher/student-board"
import { getTeacherContext } from "@/lib/teacher"
import { getStudentBoard } from "@/app/alunos/[id]/actions"

export const metadata: Metadata = {
  title: "Aluno",
}

export default async function StudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pagina?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const { organizationName, fullName } = await getTeacherContext()
  const page = Math.max(1, Math.floor(Number(query.pagina) || 1))
  const result = await getStudentBoard(id, { page })
  if (!result.ok && result.error === "Aluno não encontrado.") notFound()

  return (
    <TeacherShell name={fullName} organization={organizationName}>
      {result.ok ? (
        <StudentBoard board={result} />
      ) : (
        <p className="rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-10 text-center text-sm text-[#64748B]">
          {result.error}
        </p>
      )}
    </TeacherShell>
  )
}

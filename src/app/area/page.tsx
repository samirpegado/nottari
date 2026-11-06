import type { Metadata } from "next"
import { StudentHome } from "@/components/student/student-home"
import { StudentShell } from "@/components/student/student-shell"
import { getStudentArea } from "@/app/area/actions"

export const metadata: Metadata = {
  title: "Área do aluno",
}

export default async function StudentAreaPage() {
  const result = await getStudentArea()

  if (!result.ok) {
    return (
      <StudentShell>
        <p className="rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-10 text-center text-sm text-[#64748B]">
          {result.error}
        </p>
      </StudentShell>
    )
  }

  return (
    <StudentShell>
      <StudentHome area={result} />
    </StudentShell>
  )
}

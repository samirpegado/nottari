import type { Metadata } from "next"
import { TeacherShell } from "@/components/teacher/teacher-shell"
import { MaterialsBoard } from "@/components/teacher/materials-board"
import { isMaterialType } from "@/lib/materials"
import { getTeacherContext } from "@/lib/teacher"
import { listLibrary } from "@/app/materiais/actions"

export const metadata: Metadata = {
  title: "Materiais",
}

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ pasta?: string; tipo?: string; q?: string }>
}) {
  const params = await searchParams
  const { organizationName, fullName } = await getTeacherContext()
  const folderId = params.pasta?.trim() || ""
  const type = isMaterialType(params.tipo) ? params.tipo : ""
  const query = params.q?.trim() ?? ""
  const result = await listLibrary({
    folderId: folderId || undefined,
    type: type || undefined,
    query: query || undefined,
  })

  return (
    <TeacherShell name={fullName} organization={organizationName}>
      {result.ok ? (
        <MaterialsBoard
          library={result}
          folderId={folderId}
          typeFilter={type}
          query={query}
        />
      ) : (
        <>
          <header>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Materiais</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">Sua biblioteca</h1>
          </header>
          <p className="mt-6 rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-10 text-center text-sm text-[#64748B]">
            {result.error}
          </p>
        </>
      )}
    </TeacherShell>
  )
}

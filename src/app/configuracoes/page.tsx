import type { Metadata } from "next"
import { TeacherShell } from "@/components/teacher/teacher-shell"
import { SettingsBoard } from "@/components/teacher/settings-board"
import { getTeacherContext } from "@/lib/teacher"
import { getSettings } from "@/app/configuracoes/actions"

export const metadata: Metadata = {
  title: "Configurações",
}

export default async function SettingsPage() {
  const { organizationName, fullName } = await getTeacherContext()
  const result = await getSettings()

  return (
    <TeacherShell name={fullName} organization={organizationName}>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Conta</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">Configurações</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Dados da conta, identidade visual e situação do plano. Um professor por conta.
        </p>
      </header>

      {result.ok ? (
        <SettingsBoard data={result.data} />
      ) : (
        <p className="mt-6 rounded-[22px] border border-[#e2e8f0] bg-white px-4 py-10 text-center text-sm text-[#64748B]">
          {result.error}
        </p>
      )}
    </TeacherShell>
  )
}

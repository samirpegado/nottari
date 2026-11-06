import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Entrar",
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ aluno?: string }>
}) {
  const params = await searchParams
  return (
    <AuthShell srTitle="Entrar no Nottari">
      <LoginForm studentFirst={params.aluno === "1"} />
    </AuthShell>
  )
}

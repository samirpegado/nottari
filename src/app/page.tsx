import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = {
  title: "Entrar",
}

export default function HomePage() {
  return (
    <AuthShell srTitle="Entrar no Nottari">
      <LoginForm />
    </AuthShell>
  )
}

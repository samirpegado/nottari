import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignupForm } from "@/components/auth/signup-form"

export const metadata: Metadata = {
  title: "Cadastro",
}

export default function SignupPage() {
  return (
    <AuthShell srTitle="Criar conta no Nottari">
      <SignupForm />
    </AuthShell>
  )
}

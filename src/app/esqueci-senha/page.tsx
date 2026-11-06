import type { Metadata } from "next"
import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = {
  title: "Esqueci minha senha",
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell srTitle="Esqueci minha senha">
      <ForgotPasswordForm />
    </AuthShell>
  )
}

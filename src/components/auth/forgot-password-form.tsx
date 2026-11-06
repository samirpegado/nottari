"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isEmail } from "@/lib/auth-fields"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const emailError =
    email.trim().length === 0
      ? "Informe o e-mail."
      : isEmail(email)
        ? undefined
        : "E-mail inválido."

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (emailError) return
  }

  return (
    <Card className="bg-card/90 shadow-[0_24px_80px_-36px_rgba(59,130,246,0.55)] ring-foreground/10 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-lg">Esqueci minha senha</CardTitle>
        <CardDescription>
          Informe o e-mail da conta para receber o link de redefinição.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="recovery-email">E-mail</Label>
            <Input
              id="recovery-email"
              className="h-11"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              aria-invalid={submitted && Boolean(emailError)}
              onChange={(event) => setEmail(event.target.value)}
            />
            {submitted && emailError ? (
              <p className="text-xs text-destructive" role="alert">
                {emailError}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="h-11 w-full font-semibold">
            Enviar link
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Lembrou a senha?{" "}
            <Link
              href="/"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}

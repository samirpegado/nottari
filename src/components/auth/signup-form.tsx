"use client"

import { useState, type FormEvent } from "react"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatBrPhone, isEmail } from "@/lib/auth-fields"
import { cn } from "@/lib/utils"
import { registerAccount } from "@/app/cadastro/actions"

const fieldClassName = "h-11"

export function SignupForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [schoolName, setSchoolName] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string>()
  const [done, setDone] = useState(false)
  const phoneDigits = phone.replace(/\D/g, "")

  const nameError = name.trim().length < 2 ? "Informe seu nome." : undefined
  const emailError =
    email.trim().length === 0
      ? "Informe o e-mail."
      : isEmail(email)
        ? undefined
        : "E-mail inválido."
  const phoneError =
    phoneDigits.length === 0
      ? "Informe o telefone."
      : phoneDigits.length < 10
        ? "Informe o telefone com DDD."
        : undefined
  const passwordError =
    password.length === 0
      ? "Informe a senha."
      : password.length < 8
        ? "A senha precisa ter no mínimo 8 caracteres."
        : undefined

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setFormError(undefined)
    if (nameError || emailError || phoneError || passwordError) return

    setPending(true)
    const result = await registerAccount({
      name,
      email,
      phone: phoneDigits,
      password,
      schoolName,
    })
    setPending(false)

    if (!result.ok) {
      setFormError(result.error)
      return
    }
    setDone(true)
  }

  return (
    <Card className="bg-card/90 shadow-[0_24px_80px_-36px_rgba(59,130,246,0.55)] ring-foreground/10 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-lg">Criar conta</CardTitle>
        <CardDescription>Para professores e escolas.</CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-foreground">
              Conta criada. Entre com o e-mail e a senha que você acabou de definir.
            </p>
            <Link href="/" className={buttonVariants({ className: "w-full" })}>
              Entrar
            </Link>
          </div>
        ) : (
        <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
          <Field
            id="signup-name"
            label="Seu nome"
            autoComplete="name"
            value={name}
            error={submitted ? nameError : undefined}
            onChange={setName}
          />
          <Field
            id="signup-email"
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={email}
            error={submitted ? emailError : undefined}
            onChange={setEmail}
          />
          <Field
            id="signup-phone"
            label="Telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 99999-9999"
            value={formatBrPhone(phone)}
            error={submitted ? phoneError : undefined}
            onChange={setPhone}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-password">Senha</Label>
            <div className="relative">
              <Input
                id="signup-password"
                className={cn(fieldClassName, "pr-11")}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                minLength={8}
                aria-invalid={submitted && Boolean(passwordError)}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {submitted && passwordError ? (
              <p className="text-xs text-destructive" role="alert">
                {passwordError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
            )}
          </div>
          <Field
            id="signup-school"
            label="Nome da escola"
            optional
            autoComplete="organization"
            value={schoolName}
            onChange={setSchoolName}
          />
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <Button type="submit" className="mt-1 w-full" disabled={pending}>
            {pending ? "Criando conta..." : "Cadastre-se"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link
              href="/"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </form>
        )}
      </CardContent>
    </Card>
  )
}

function Field({
  id,
  label,
  optional = false,
  error,
  onChange,
  value,
  ...inputProps
}: {
  id: string
  label: string
  optional?: boolean
  error?: string
  value: string
  onChange: (value: string) => void
} & Omit<React.ComponentProps<"input">, "id" | "value" | "onChange" | "className" | "aria-invalid">) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground"> (opcional)</span>
        ) : null}
      </Label>
      <Input
        id={id}
        className={fieldClassName}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

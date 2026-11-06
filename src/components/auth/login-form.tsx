"use client"

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { Eye, EyeOff } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatBrPhone, isEmail } from "@/lib/auth-fields"
import { cn } from "@/lib/utils"
import { signInProfessor } from "@/app/auth/actions"

type Role = "professor" | "aluno"

const fieldClassName = "h-11"

export function LoginForm() {
  const [role, setRole] = useState<Role>("professor")

  return (
    <Card className="bg-card/90 shadow-[0_24px_80px_-36px_rgba(59,130,246,0.55)] ring-foreground/10 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-lg">Entrar</CardTitle>
        <CardDescription>
          {role === "professor"
            ? "Acesso da conta de gestão."
            : "Use o telefone e o PIN de 4 dígitos."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={role}
          onValueChange={(value) => {
            if (value === "professor" || value === "aluno") setRole(value)
          }}
        >
          <TabsList className="grid !h-11 w-full grid-cols-2">
            <TabsTrigger
              value="professor"
              className="dark:data-active:bg-primary! dark:data-active:text-primary-foreground!"
            >
              Professor
            </TabsTrigger>
            <TabsTrigger
              value="aluno"
              className="dark:data-active:bg-primary! dark:data-active:text-primary-foreground!"
            >
              Aluno
            </TabsTrigger>
          </TabsList>
          <TabsContent value="professor" className="mt-5">
            <ProfessorForm />
          </TabsContent>
          <TabsContent value="aluno" className="mt-5">
            <StudentForm />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  )
}

function ProfessorForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string>()

  const emailError =
    email.trim().length === 0
      ? "Informe o e-mail."
      : isEmail(email)
        ? undefined
        : "E-mail inválido."
  const passwordError =
    password.length === 0 ? "Informe a senha." : undefined

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    setFormError(undefined)
    if (emailError || passwordError) return

    setPending(true)
    const result = await signInProfessor(email, password)
    setPending(false)
    if (result && !result.ok) setFormError(result.error)
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          className={fieldClassName}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
          value={email}
          aria-invalid={submitted && Boolean(emailError)}
          onChange={(event) => setEmail(event.target.value)}
        />
        <FieldError message={submitted ? emailError : undefined} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/esqueci-senha"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            className={cn(fieldClassName, "pr-11")}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
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
        <FieldError message={submitted ? passwordError : undefined} />
      </div>
      {formError ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
      <Button type="submit" className="mt-1 h-11 w-full font-semibold" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
    </form>
  )
}

function StudentForm() {
  const [phone, setPhone] = useState("")
  const [pin, setPin] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const digits = phone.replace(/\D/g, "")

  const phoneError =
    digits.length === 0
      ? "Informe o telefone."
      : digits.length < 10
        ? "Informe o telefone com DDD."
        : undefined
  const pinError = pin.length === 4 ? undefined : "O PIN tem 4 dígitos."

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (phoneError || pinError) return
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          className={fieldClassName}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          value={formatBrPhone(phone)}
          aria-invalid={submitted && Boolean(phoneError)}
          onChange={(event) => setPhone(event.target.value)}
        />
        <FieldError message={submitted ? phoneError : undefined} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="pin-0">PIN</Label>
        <PinInput
          value={pin}
          invalid={submitted && Boolean(pinError)}
          onChange={setPin}
        />
        <FieldError message={submitted ? pinError : undefined} />
      </div>
      <Button type="submit" className="mt-1 h-11 w-full font-semibold">
        Entrar
      </Button>
    </form>
  )
}

function PinInput({
  value,
  onChange,
  invalid,
}: {
  value: string
  onChange: (next: string) => void
  invalid: boolean
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(index, 3))]?.focus()
  }

  function onDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1)
    if (!digit || index > value.length) return
    const chars = value.split("")
    chars[index] = digit
    onChange(chars.join("").slice(0, 4))
    focusAt(index + 1)
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault()
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1))
        return
      }
      if (index > 0) {
        onChange(value.slice(0, index - 1))
        focusAt(index - 1)
      }
      return
    }
    if (event.key === "ArrowLeft") focusAt(index - 1)
    if (event.key === "ArrowRight") focusAt(index + 1)
  }

  return (
    <div
      className="grid grid-cols-4 gap-2"
      role="group"
      aria-label="PIN de 4 dígitos"
      onPaste={(event) => {
        const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4)
        if (!text) return
        event.preventDefault()
        onChange(text)
        focusAt(text.length >= 4 ? 3 : text.length)
      }}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <Input
          key={index}
          id={index === 0 ? "pin-0" : undefined}
          ref={(node) => {
            refs.current[index] = node
          }}
          className="h-12 w-full px-0 text-center text-lg font-semibold"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Dígito ${index + 1} do PIN`}
          aria-invalid={invalid}
          maxLength={1}
          value={value[index] ?? ""}
          onChange={(event) => onDigit(index, event.target.value)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onFocus={(event) => event.currentTarget.select()}
        />
      ))}
    </div>
  )
}

"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { onlyDigits } from "@/lib/br-docs"
import { createClient } from "@/lib/supabase/server"
import { clearStudentToken, getStudentToken, setStudentToken } from "@/lib/student-session"

export async function signInProfessor(email: string, password: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) {
    return { ok: false as const, error: "E-mail ou senha incorretos." }
  }

  redirect("/inicio")
}

export async function signInStudent(phone: string, pin: string) {
  const digits = onlyDigits(phone)
  const code = onlyDigits(pin)
  if (digits.length < 10 || digits.length > 11) {
    return { ok: false as const, error: "Informe o telefone com DDD." }
  }
  if (!/^\d{4}$/.test(code)) {
    return { ok: false as const, error: "O PIN precisa ter 4 dígitos." }
  }

  const supabase = await createClient()
  const agent = (await headers()).get("user-agent")?.slice(0, 180) ?? null
  const { data, error } = await supabase.rpc("student_login", {
    p_phone: digits,
    p_pin: code,
    p_user_agent: agent,
  })

  if (error || !data) {
    const message = error?.message ?? ""
    if (/too many attempts/i.test(message)) {
      return { ok: false as const, error: "Muitas tentativas. Espere 15 minutos e tente de novo." }
    }
    return { ok: false as const, error: "Telefone ou PIN incorretos." }
  }

  const payload = (typeof data === "string" ? JSON.parse(data) : data) as {
    token?: string
    expires_at?: string
  }
  if (!payload.token) {
    return { ok: false as const, error: "Não foi possível entrar. Tente de novo." }
  }

  await setStudentToken(payload.token, payload.expires_at)
  redirect("/area")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function signOutStudent() {
  const token = await getStudentToken()
  if (token) {
    const supabase = await createClient()
    await supabase.rpc("student_logout", { p_token: token })
  }
  await clearStudentToken()
  redirect("/?aluno=1")
}

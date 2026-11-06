"use server"

export type RegisterResult = { ok: true } | { ok: false; error: string }

export async function registerAccount(input: {
  name: string
  email: string
  phone: string
  password: string
  schoolName: string
}): Promise<RegisterResult> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    return { ok: false, error: "Cadastro indisponível no momento." }
  }

  let response: Response
  try {
    response = await fetch(`${url}/functions/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
      },
      body: JSON.stringify(input),
      cache: "no-store",
    })
  } catch {
    return { ok: false, error: "Não foi possível criar a conta." }
  }

  const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
  if (response.ok && payload?.ok) return { ok: true }
  return { ok: false, error: payload?.error || "Não foi possível criar a conta." }
}

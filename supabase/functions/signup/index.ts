import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type SignupBody = {
  name?: unknown
  email?: unknown
  phone?: unknown
  password?: unknown
  schoolName?: unknown
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (request.method !== "POST") {
    return json({ error: "Método não permitido." }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Cadastro indisponível no momento." }, 500)
  }

  if (!(await isPublishableKey(request, supabaseUrl))) {
    return json({ error: "Não autorizado." }, 401)
  }

  let body: SignupBody
  try {
    body = await request.json()
  } catch {
    return json({ error: "Dados inválidos." }, 400)
  }

  const parsed = parseSignup(body)
  if (!parsed.ok) return json({ error: parsed.error }, 400)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.value.email,
    password: parsed.value.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.value.name,
      phone: parsed.value.phone,
    },
  })

  if (createError || !created.user) {
    const duplicate = createError?.code === "email_exists" ||
      /already (been )?registered/i.test(createError?.message ?? "")
    if (!duplicate) console.error("signup createUser", createError?.code)
    return json(
      { error: duplicate ? "Já existe uma conta com este e-mail." : "Não foi possível criar a conta." },
      duplicate ? 409 : 400,
    )
  }

  const userId = created.user.id
  const school = parsed.value.schoolName
  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .insert({
      name: school || parsed.value.name,
      type: school ? "school" : "solo",
    })
    .select("id")
    .single()

  if (organizationError || !organization) {
    console.error("signup organization", organizationError?.code)
    await admin.auth.admin.deleteUser(userId)
    return json({ error: "Não foi possível criar a conta." }, 500)
  }

  const { error: memberError } = await admin.from("members").insert({
    organization_id: organization.id,
    user_id: userId,
    role: "owner",
    display_name: parsed.value.name,
    phone: parsed.value.phone,
  })

  if (memberError) {
    console.error("signup member", memberError.code)
    await admin.from("organizations").delete().eq("id", organization.id)
    await admin.auth.admin.deleteUser(userId)
    return json({ error: "Não foi possível criar a conta." }, 500)
  }

  return json({ ok: true }, 201)
})

function parseSignup(body: SignupBody):
  | { ok: true; value: { name: string; email: string; phone: string; password: string; schoolName: string } }
  | { ok: false; error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : ""
  const password = typeof body.password === "string" ? body.password : ""
  const schoolName = typeof body.schoolName === "string" ? body.schoolName.trim() : ""

  if (name.length < 2 || name.length > 80) return { ok: false, error: "Informe seu nome." }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, error: "E-mail inválido." }
  }
  if (phone.length < 10 || phone.length > 11) return { ok: false, error: "Informe o telefone com DDD." }
  if (password.length < 8 || password.length > 72) {
    return { ok: false, error: "A senha precisa ter no mínimo 8 caracteres." }
  }
  if (schoolName.length > 120) return { ok: false, error: "Nome da escola muito longo." }

  return { ok: true, value: { name, email, phone, password, schoolName } }
}

async function isPublishableKey(request: Request, supabaseUrl: string) {
  const apikey = request.headers.get("apikey") ?? ""
  if (!apikey.startsWith("sb_publishable_")) return false
  const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey },
  })
  return response.ok
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type Body = {
  token?: unknown
  materialId?: unknown
}

type MaterialRow = {
  type?: string
  title?: string
  external_url?: string | null
  storage_path?: string | null
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
    return json({ error: "Arquivo indisponível no momento." }, 500)
  }
  if (!(await isPublishableKey(request, supabaseUrl))) {
    return json({ error: "Não autorizado." }, 401)
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return json({ error: "Dados inválidos." }, 400)
  }

  const token = typeof body.token === "string" ? body.token.trim() : ""
  const materialId = typeof body.materialId === "string" ? body.materialId.trim() : ""
  if (!token || !/^[0-9a-f-]{36}$/i.test(materialId)) {
    return json({ error: "Sessão inválida." }, 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin.rpc("student_open_material", {
    p_token: token,
    p_material_id: materialId,
  })
  if (error || !data) {
    const expired = /invalid or expired session/i.test(error?.message ?? "")
    return json(
      { error: expired ? "Sessão expirada. Entre de novo." : "Arquivo não encontrado." },
      expired ? 401 : 404,
    )
  }

  const material = data as MaterialRow
  if (material.type === "video_link") {
    const url = material.external_url?.trim()
    if (!url) return json({ error: "Esse link não está disponível." }, 404)
    return json({ ok: true, url, title: material.title ?? "Vídeo" }, 200)
  }

  const path = material.storage_path?.trim()
  if (!path) return json({ error: "Esse arquivo não está disponível." }, 404)

  const { data: signed, error: signError } = await admin.storage
    .from("materials")
    .createSignedUrl(path, 60 * 10)
  if (signError || !signed?.signedUrl) {
    return json({ error: "Não foi possível abrir o arquivo." }, 500)
  }

  return json({ ok: true, url: signed.signedUrl, title: material.title ?? "Arquivo" }, 200)
})

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

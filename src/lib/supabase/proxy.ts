import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return NextResponse.next({ request })

  let response = NextResponse.next({ request })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const signedIn = Boolean(data.user)

  const teacherArea = ["/inicio", "/alunos", "/agenda", "/faturamento", "/mensalidades", "/materiais", "/configuracoes"].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  )
  const studentArea = path === "/area" || (path.startsWith("/area/") && path !== "/area/sair")
  const studentToken = request.cookies.get("nottari_student")?.value

  if (teacherArea && !signedIn) {
    return withSessionCookies(response, NextResponse.redirect(new URL("/", request.url)))
  }

  if (studentArea && !studentToken) {
    return withSessionCookies(response, NextResponse.redirect(new URL("/?aluno=1", request.url)))
  }

  if (path === "/" && signedIn && request.nextUrl.searchParams.get("aluno") !== "1") {
    return withSessionCookies(response, NextResponse.redirect(new URL("/inicio", request.url)))
  }

  return response
}

function withSessionCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
  return target
}

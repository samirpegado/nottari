import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { STUDENT_COOKIE, getStudentToken } from "@/lib/student-session"

export async function GET(request: Request) {
  const token = await getStudentToken()
  if (token) {
    const supabase = await createClient()
    await supabase.rpc("student_logout", { p_token: token })
  }

  const url = new URL("/?aluno=1", request.url)
  const response = NextResponse.redirect(url)
  response.cookies.delete(STUDENT_COOKIE)
  return response
}

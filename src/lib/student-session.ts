import { cookies } from "next/headers"

export const STUDENT_COOKIE = "nottari_student"
const MAX_AGE = 60 * 60 * 24 * 30

export async function getStudentToken() {
  const store = await cookies()
  return store.get(STUDENT_COOKIE)?.value?.trim() || ""
}

export async function setStudentToken(token: string, expiresAt?: string) {
  const store = await cookies()
  const expires = expiresAt ? new Date(expiresAt) : undefined
  store.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
    expires,
  })
}

export async function clearStudentToken() {
  const store = await cookies()
  store.delete(STUDENT_COOKIE)
}

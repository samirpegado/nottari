"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EnrollDialog, type EnrollmentEdit } from "@/components/teacher/enroll-dialog"

export function EditEnrollmentButton({
  student,
  editing,
  weekday,
  startMinutes,
  duration,
  blocks,
  todayYmd,
  nowMinutes,
}: {
  student: { id: string; name: string }
  editing: EnrollmentEdit
  weekday: number
  startMinutes: number
  duration: number
  blocks: { id?: string; weekday: number; startMinutes: number; durationMinutes: number }[]
  todayYmd: string
  nowMinutes: number
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Editar matrícula
      </Button>
      {open ? (
        <EnrollDialog
          weekday={weekday}
          startMinutes={startMinutes}
          duration={duration}
          blocks={blocks}
          todayYmd={todayYmd}
          nowMinutes={nowMinutes}
          lockedStudent={student}
          editing={editing}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

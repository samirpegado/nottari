import { studentInitials, studentTheme } from "@/lib/student-profile"
import { cn } from "@/lib/utils"

const sizes = {
  sm: "size-9 text-xs border-2",
  md: "size-14 text-lg border-[3px]",
  lg: "size-20 text-xl border-[3px]",
}

export function StudentAvatar({
  name,
  photoUrl,
  color,
  size = "md",
  className,
}: {
  name: string
  photoUrl?: string | null
  color?: string | null
  size?: keyof typeof sizes
  className?: string
}) {
  const theme = studentTheme(color)
  const frame = cn(
    "shrink-0 overflow-hidden rounded-full border-white object-cover shadow-[0_8px_18px_-8px_rgba(15,23,42,.35)]",
    sizes[size],
    className,
  )

  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={frame} />
  }

  return (
    <div
      className={cn("grid place-items-center font-semibold text-white", frame)}
      style={{ background: `linear-gradient(135deg, ${theme.banner}, ${theme.avatar})` }}
    >
      {studentInitials(name)}
    </div>
  )
}

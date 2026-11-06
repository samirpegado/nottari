import { LogOut } from "lucide-react"
import { signOut } from "@/app/auth/actions"
import { cn } from "@/lib/utils"

export function AccountFooter({
  name,
  organization,
}: {
  name: string
  organization: string
}) {
  return (
    <div className="border-t border-white/10 p-4">
      <p className="truncate text-sm font-medium">{name}</p>
      <p className="truncate text-xs text-[#94A3B8]">{organization}</p>
      <SignOutButton className="mt-3" />
    </div>
  )
}

function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={cn(
          "inline-flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white",
          className,
        )}
      >
        <LogOut className="size-4" />
        Sair
      </button>
    </form>
  )
}

import Image from "next/image"

export function AuthShell({
  srTitle,
  children,
}: {
  srTitle: string
  children: React.ReactNode
}) {
  return (
    <main className="dark relative flex min-h-svh justify-center overflow-x-hidden overflow-y-auto bg-background px-4 py-12 text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 size-[28rem] rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -right-16 -bottom-40 size-[32rem] rounded-full bg-brand-violet/25 blur-3xl" />
      </div>

      <div className="relative my-auto w-full max-w-[420px]">
        <header className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/brand/logo.png"
            alt="Nottari"
            width={960}
            height={243}
            priority
            className="h-auto w-[220px] sm:w-[260px]"
          />
          <p className="mt-5 text-[11px] font-semibold tracking-[0.22em] text-muted-foreground">
            PLATAFORMA DE GESTÃO MUSICAL
          </p>
          <p className="mt-3 text-lg text-foreground/90">
            Organize. Ensine.{" "}
            <span className="bg-gradient-to-r from-primary to-brand-violet bg-clip-text font-semibold text-transparent">
              Evolua.
            </span>
          </p>
        </header>
        <h1 className="sr-only">{srTitle}</h1>
        {children}
      </div>
    </main>
  )
}

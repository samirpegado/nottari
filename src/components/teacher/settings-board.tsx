"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ImagePlus, Trash2 } from "lucide-react"
import {
  removeOrganizationLogo,
  updateOrganization,
  uploadOrganizationLogo,
  type SettingsData,
} from "@/app/configuracoes/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatBrPhone, isEmail } from "@/lib/auth-fields"
import { formatCep, onlyDigits } from "@/lib/br-docs"
import { formatBrl, formatDateBr } from "@/lib/charges"
import { compressOrgLogo } from "@/lib/org-branding"
import {
  formatPlanPrice,
  formatPlanStorage,
  formatStorageBytes,
  PLANS,
  storageLimitBytes,
  studentLimitLabel,
} from "@/lib/plans"
import { cn } from "@/lib/utils"

const fieldClass =
  "h-11 rounded-xl border border-[#0B1220]/10 bg-white px-3 font-normal outline-none focus:border-[#3B82F6]"

const INVOICE_STATUS: Record<SettingsData["invoices"][number]["status"], { label: string; className: string }> = {
  paid: { label: "Paga", className: "bg-[#10B981]/12 text-[#047857]" },
  pending: { label: "Em aberto", className: "bg-[#F59E0B]/15 text-[#B45309]" },
  overdue: { label: "Atrasada", className: "bg-[#EF4444]/12 text-[#B91C1C]" },
  canceled: { label: "Cancelada", className: "bg-[#0B1220]/5 text-[#64748B]" },
}

export function SettingsBoard({ data }: { data: SettingsData }) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      <ProfileSection teacherName={data.teacherName} organization={data.organization} />
      <BillingSection data={data} />
    </div>
  )
}

function ProfileSection({
  teacherName,
  organization,
}: {
  teacherName: string
  organization: SettingsData["organization"]
}) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(teacherName)
  const [schoolName, setSchoolName] = useState(organization.schoolName)
  const [email, setEmail] = useState(organization.email)
  const [phone, setPhone] = useState(organization.phone ? formatBrPhone(organization.phone) : "")
  const [website, setWebsite] = useState(organization.website)
  const [zipCode, setZipCode] = useState(organization.zipCode ? formatCep(organization.zipCode) : "")
  const [street, setStreet] = useState(organization.street)
  const [streetNumber, setStreetNumber] = useState(organization.streetNumber)
  const [complement, setComplement] = useState(organization.complement)
  const [neighborhood, setNeighborhood] = useState(organization.neighborhood)
  const [city, setCity] = useState(organization.city)
  const [state, setState] = useState(organization.state)
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ok" | "missing" | "error">("idle")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()
  const skipCepLookup = useRef(true)

  useEffect(() => {
    const cep = onlyDigits(zipCode)
    if (skipCepLookup.current) {
      skipCepLookup.current = false
      return
    }
    if (cep.length !== 8) {
      setCepStatus("idle")
      return
    }
    const controller = new AbortController()
    setCepStatus("loading")
    fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: ViaCep) => {
        if (data.erro) {
          setCepStatus("missing")
          return
        }
        setStreet(data.logradouro ?? "")
        setNeighborhood(data.bairro ?? "")
        setCity(data.localidade ?? "")
        setState(data.uf ?? "")
        if (data.complemento) {
          setComplement((current) => current || data.complemento || "")
        }
        setCepStatus("ok")
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return
        setCepStatus("error")
      })
    return () => controller.abort()
  }, [zipCode])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(undefined)
    setMessage(undefined)
    if (displayName.trim().length < 2) {
      setError("Informe o seu nome.")
      return
    }
    if (schoolName.trim() && schoolName.trim().length < 2) {
      setError("Informe o nome da escola.")
      return
    }
    if (email.trim() && !isEmail(email)) {
      setError("Informe um e-mail válido.")
      return
    }
    setPending(true)
    const result = await updateOrganization({
      displayName,
      schoolName,
      email,
      phone,
      website,
      zipCode,
      street,
      streetNumber,
      complement,
      neighborhood,
      city,
      state,
    })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage("Dados salvos.")
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Section title="Logo" description="Aparece nos recibos. PNG, JPG ou WebP.">
        <LogoPicker
          previewUrl={organization.logoUrl}
          emptyLabel="Sem logo"
          onUploaded={() => router.refresh()}
        />
      </Section>

      <Section
        title="Seus dados"
        description="Contato e endereço usados nos recibos. Se o nome da escola estiver preenchido, ele entra nos documentos no lugar do seu nome."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Seu nome" required>
            <Input
              value={displayName}
              autoComplete="name"
              onChange={(event) => setDisplayName(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field
            label="Nome da escola"
            hint="Se preencher, o nome da escola será usado nos recibos e documentos."
          >
            <Input
              value={schoolName}
              placeholder="Opcional"
              autoComplete="organization"
              onChange={(event) => setSchoolName(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Telefone">
            <Input
              type="tel"
              inputMode="tel"
              value={formatBrPhone(phone)}
              onChange={(event) => setPhone(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Site" className="sm:col-span-2">
            <Input
              inputMode="url"
              placeholder="www.suaescola.com.br"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="CEP" hint={cepHint(cepStatus)}>
            <Input
              inputMode="numeric"
              value={formatCep(zipCode)}
              onChange={(event) => setZipCode(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Número">
            <Input
              value={streetNumber}
              onChange={(event) => setStreetNumber(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Logradouro" className="sm:col-span-2">
            <Input value={street} onChange={(event) => setStreet(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="Complemento">
            <Input
              value={complement}
              onChange={(event) => setComplement(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Bairro">
            <Input
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Cidade">
            <Input value={city} onChange={(event) => setCity(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="UF">
            <Input
              value={state}
              maxLength={2}
              onChange={(event) => setState(event.target.value.toUpperCase())}
              className={fieldClass}
            />
          </Field>
        </div>
        {error ? <p className="text-sm text-[#B91C1C]">{error}</p> : null}
        {message ? <p className="text-sm text-[#047857]">{message}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar dados"}
          </Button>
        </div>
      </Section>
    </form>
  )
}

function BillingSection({ data }: { data: SettingsData }) {
  const plan = PLANS.find((item) => item.id === data.planId) ?? PLANS[0]
  const studentLimit = plan.students
  const storageLimit = storageLimitBytes(plan)
  const studentsOver = studentLimit != null && data.usage.studentCount > studentLimit
  const storageOver = data.usage.storageBytes > storageLimit

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Plano e faturamento"
        description="O Nottari será cobrado pelo Asaas. Cota e número de alunos ainda não bloqueiam; o tamanho por arquivo já segue o plano."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <UsageMeter
            label="Alunos"
            valueLabel={`${data.usage.studentCount} / ${studentLimitLabel(plan)}`}
            ratio={studentLimit == null ? 0 : data.usage.studentCount / studentLimit}
            over={studentsOver}
          />
          <UsageMeter
            label="Armazenamento"
            valueLabel={`${formatStorageBytes(data.usage.storageBytes)} / ${formatPlanStorage(plan)}`}
            ratio={data.usage.storageBytes / storageLimit}
            over={storageOver}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PLANS.map((item) => {
            const current = item.id === data.planId
            const price = formatPlanPrice(item)
            return (
              <article
                key={item.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl p-4 ring-1",
                  current
                    ? "bg-[#3B82F6]/6 ring-[#3B82F6]/40"
                    : "bg-[#F8FAFC] ring-[#0B1220]/8",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="mt-0.5 text-xs text-[#64748B]">{item.blurb}</p>
                  </div>
                  {current ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#3B82F6] px-2 py-0.5 text-[11px] font-semibold text-white">
                      <Check className="size-3" />
                      Atual
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="text-xl font-semibold tracking-tight">{price.label}</p>
                  {price.detail ? <p className="mt-0.5 text-xs text-[#64748B]">{price.detail}</p> : null}
                </div>
                <ul className="space-y-1 text-sm text-[#475569]">
                  <li>Até {item.students} alunos ativos</li>
                  <li>{formatPlanStorage(item)} de arquivos</li>
                  <li>Até {item.fileMaxMb} MB por arquivo</li>
                </ul>
                {!current ? (
                  <Button type="button" variant="outline" disabled className="mt-auto">
                    Assinar pelo Asaas
                  </Button>
                ) : null}
              </article>
            )
          })}
        </div>
      </Section>

      <Section
        title="Últimas faturas"
        description="Quando o plano pago estiver ativo, as cobranças do Asaas aparecem aqui com o status."
      >
        {data.invoices.length === 0 ? (
          <p className="rounded-xl bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#64748B]">
            Nenhuma fatura ainda. A conta está no plano gratuito.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#0B1220]/8 text-xs tracking-wide text-[#94A3B8] uppercase">
                  <th className="pb-2 font-medium">Descrição</th>
                  <th className="pb-2 font-medium">Vencimento</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice) => {
                  const status = INVOICE_STATUS[invoice.status]
                  return (
                    <tr key={invoice.id} className="border-b border-[#0B1220]/6 last:border-0">
                      <td className="py-3 font-medium">{invoice.description}</td>
                      <td className="py-3 text-[#475569]">{formatDateBr(invoice.dueDate)}</td>
                      <td className="py-3 tabular-nums">{formatBrl(invoice.amount)}</td>
                      <td className="py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", status.className)}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

function LogoPicker({
  previewUrl,
  emptyLabel,
  onUploaded,
}: {
  previewUrl: string
  emptyLabel: string
  onUploaded: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const localPreview = useRef<string | null>(null)
  const [preview, setPreview] = useState(previewUrl)
  const [pending, setPending] = useState<"upload" | "remove" | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    setPreview(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    return () => {
      if (localPreview.current) URL.revokeObjectURL(localPreview.current)
    }
  }, [])

  async function onPick(file: File | null) {
    if (!file) return
    setError(undefined)
    try {
      const compressed = await compressOrgLogo(file)
      if (localPreview.current) URL.revokeObjectURL(localPreview.current)
      const url = URL.createObjectURL(compressed)
      localPreview.current = url
      setPreview(url)
      setPending("upload")
      const form = new FormData()
      form.set("file", compressed)
      const result = await uploadOrganizationLogo(form)
      setPending(null)
      if (!result.ok) {
        setError(result.error)
        return
      }
      onUploaded()
    } catch (reason) {
      setPending(null)
      setError(reason instanceof Error ? reason.message : "Não foi possível ler a imagem.")
    }
    if (inputRef.current) inputRef.current.value = ""
  }

  async function onRemove() {
    setError(undefined)
    setPending("remove")
    const result = await removeOrganizationLogo()
    setPending(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (localPreview.current) {
      URL.revokeObjectURL(localPreview.current)
      localPreview.current = null
    }
    setPreview("")
    onUploaded()
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex size-28 items-center justify-center overflow-hidden rounded-2xl bg-[#F8FAFC] ring-1 ring-[#0B1220]/8">
        {preview ? (
          <img src={preview} alt="Logo" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 px-3 text-center text-xs text-[#94A3B8]">
            <ImagePlus className="size-5" />
            {emptyLabel}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void onPick(event.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending !== null}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus data-icon="inline-start" />
          {pending === "upload" ? "Enviando..." : preview ? "Trocar" : "Enviar"}
        </Button>
        {preview ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending !== null}
            onClick={() => void onRemove()}
          >
            <Trash2 data-icon="inline-start" />
            {pending === "remove" ? "Removendo..." : "Remover"}
          </Button>
        ) : null}
      </div>
      {error ? <p className="w-full text-sm text-[#B91C1C]">{error}</p> : null}
    </div>
  )
}

function UsageMeter({
  label,
  valueLabel,
  ratio,
  over,
}: {
  label: string
  valueLabel: string
  ratio: number
  over: boolean
}) {
  const width = Math.min(100, Math.max(0, ratio * 100))
  return (
    <div className="rounded-2xl bg-[#F8FAFC] p-4 ring-1 ring-[#0B1220]/8">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-[#64748B]">{label}</span>
        <span className={cn("tabular-nums", over ? "font-semibold text-[#B91C1C]" : "text-[#0B1220]")}>
          {valueLabel}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-[#0B1220]/6">
        <div
          className={cn("h-full rounded-full", over ? "bg-[#EF4444]" : "bg-[#3B82F6]")}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#0B1220]/5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-[#64748B]">{description}</p>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  required = false,
  hint,
  className,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm font-medium", className)}>
      <span>
        {label}
        {required ? <span className="text-[#B91C1C]"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs font-normal text-[#64748B]">{hint}</span> : null}
    </label>
  )
}

function cepHint(status: "idle" | "loading" | "ok" | "missing" | "error") {
  if (status === "loading") return "Buscando CEP..."
  if (status === "ok") return "Endereço preenchido pelo CEP."
  if (status === "missing") return "CEP não encontrado. Preencha o endereço."
  if (status === "error") return "Não deu para consultar o CEP agora."
  return undefined
}

type ViaCep = {
  erro?: boolean
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
}

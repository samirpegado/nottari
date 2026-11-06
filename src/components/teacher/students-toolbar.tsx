"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { createStudent, deleteStudent, getStudent, updateStudent, type StudentRecord } from "@/app/alunos/actions"
import { formatBrPhone, isEmail } from "@/lib/auth-fields"
import { formatCep, formatCpf, isValidCpf, onlyDigits, randomPin } from "@/lib/br-docs"

const fieldClass =
  "h-11 rounded-xl border border-[#0B1220]/10 px-3 font-normal outline-none focus:border-[#3B82F6]"

export function StudentsToolbar({ query }: { query: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [text, setText] = useState(query)
  const [open, setOpen] = useState(false)
  const pushed = useRef(query)

  useEffect(() => {
    if (query !== pushed.current) {
      pushed.current = query
      setText(query)
    }
  }, [query])

  useEffect(() => {
    const next = text.trim()
    if (next === query) return
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams()
      if (next) params.set("q", next)
      pushed.current = next
      const search = params.toString()
      router.replace(search ? `${pathname}?${search}` : pathname)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [text, query, pathname, router])

  return (
    <>
      <label className="relative flex h-11 min-w-0 flex-1 items-center sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 size-4 text-[#94A3B8]" />
        <span className="sr-only">Buscar alunos</span>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nome, CPF, telefone ou e-mail"
          className="h-11 w-full rounded-xl border border-[#0B1220]/10 bg-white pr-3 pl-9 text-sm shadow-sm outline-none focus:border-[#3B82F6]"
        />
      </label>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#3B82F6] px-4 text-sm font-semibold text-white hover:bg-[#3B82F6]/90"
      >
        <Plus className="size-4" />
        Adicionar aluno
      </button>
      {open ? <StudentModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function StudentModal({
  onClose,
  student,
}: {
  onClose: () => void
  student?: StudentRecord
}) {
  const router = useRouter()
  const editing = Boolean(student)
  const [fullName, setFullName] = useState(student?.fullName ?? "")
  const [phone, setPhone] = useState(student ? formatBrPhone(student.phone) : "")
  const [email, setEmail] = useState(student?.email ?? "")
  const [cpf, setCpf] = useState(student?.cpf ? formatCpf(student.cpf) : "")
  const [pin, setPin] = useState(student?.pin || randomPin)
  const [zipCode, setZipCode] = useState(student?.zipCode ? formatCep(student.zipCode) : "")
  const [street, setStreet] = useState(student?.street ?? "")
  const [streetNumber, setStreetNumber] = useState(student?.streetNumber ?? "")
  const [complement, setComplement] = useState(student?.complement ?? "")
  const [neighborhood, setNeighborhood] = useState(student?.neighborhood ?? "")
  const [city, setCity] = useState(student?.city ?? "")
  const [state, setState] = useState(student?.state ?? "")
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ok" | "missing" | "error">("idle")
  const [pending, setPending] = useState(false)
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
    if (email.trim() && !isEmail(email)) {
      setError("Informe um e-mail válido.")
      return
    }
    if (onlyDigits(cpf) && !isValidCpf(cpf)) {
      setError("Informe um CPF válido.")
      return
    }
    setPending(true)
    const payload = {
      fullName,
      phone,
      pin,
      email,
      cpf,
      zipCode,
      street,
      streetNumber,
      complement,
      neighborhood,
      city,
      state,
    }
    const result = student
      ? await updateStudent(student.id, payload)
      : await createStudent(payload)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1220]/40 p-4 sm:items-center">
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-labelledby="student-modal-title"
        className="max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 id="student-modal-title" className="text-lg font-semibold">
          {editing ? "Editar aluno" : "Adicionar aluno"}
        </h2>
        <p className="mt-1 text-sm text-[#64748B]">
          Nome e telefone são obrigatórios. O PIN pode ser alterado.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Nome" required>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Telefone" required>
            <input
              required
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(formatBrPhone(event.target.value))}
              placeholder="(11) 99999-9999"
              className={fieldClass}
            />
          </Field>
          <Field label="E-mail">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="CPF">
            <input
              inputMode="numeric"
              value={cpf}
              onChange={(event) => setCpf(formatCpf(event.target.value))}
              placeholder="000.000.000-00"
              className={fieldClass}
            />
          </Field>
          <Field label="PIN de acesso" hint={editing ? "4 dígitos" : "4 dígitos, gerado automaticamente"}>
            <input
              required
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(onlyDigits(event.target.value).slice(0, 4))}
              className={`${fieldClass} tabular-nums tracking-[0.3em]`}
            />
          </Field>
          <Field label="CEP" hint={cepHint(cepStatus)}>
            <input
              inputMode="numeric"
              value={zipCode}
              onChange={(event) => setZipCode(formatCep(event.target.value))}
              placeholder="00000-000"
              className={fieldClass}
            />
          </Field>
          <Field label="Logradouro" className="sm:col-span-2">
            <input value={street} onChange={(event) => setStreet(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="Número">
            <input
              value={streetNumber}
              onChange={(event) => setStreetNumber(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Complemento">
            <input
              value={complement}
              onChange={(event) => setComplement(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Bairro">
            <input
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Cidade">
            <input value={city} onChange={(event) => setCity(event.target.value)} className={fieldClass} />
          </Field>
          <Field label="UF">
            <input
              value={state}
              maxLength={2}
              onChange={(event) => setState(event.target.value.toUpperCase())}
              className={fieldClass}
            />
          </Field>
        </div>

        {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#64748B]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Salvando..." : editing ? "Salvar" : "Cadastrar aluno"}
          </button>
        </div>
      </form>
    </div>
  )
}

export function StudentActions({
  studentId,
  studentName,
}: {
  studentId: string
  studentName: string
}) {
  const router = useRouter()
  const [student, setStudent] = useState<StudentRecord | null>(null)
  const [pending, setPending] = useState<"edit" | "delete" | null>(null)
  const [error, setError] = useState<string>()

  async function onEdit() {
    setError(undefined)
    setPending("edit")
    const result = await getStudent(studentId)
    setPending(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setStudent(result.student)
  }

  async function onDelete() {
    const confirmed = window.confirm(
      `Excluir ${studentName}? Os horários e as aulas desse aluno também saem da agenda.`,
    )
    if (!confirmed) return
    setError(undefined)
    setPending("delete")
    const result = await deleteStudent(studentId)
    setPending(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        disabled={pending !== null}
        aria-label={pending === "edit" ? "Abrindo edição" : "Editar"}
        title="Editar"
        className="inline-flex size-8 items-center justify-center rounded-lg text-[#0B1220] hover:bg-[#F8FAFC] disabled:opacity-50"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending !== null}
        aria-label={pending === "delete" ? "Excluindo aluno" : "Excluir"}
        title="Excluir"
        className="inline-flex size-8 items-center justify-center rounded-lg text-[#B91C1C] hover:bg-[#EF4444]/10 disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
      {error ? <span className="max-w-40 text-xs text-[#B91C1C]">{error}</span> : null}
      {student ? <StudentModal student={student} onClose={() => setStudent(null)} /> : null}
    </div>
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
    <label className={`flex flex-col gap-1.5 text-sm font-medium ${className ?? ""}`}>
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
  if (status === "error") return "Não foi possível consultar o CEP."
  return "Ao completar o CEP, o endereço é preenchido."
}

type ViaCep = {
  erro?: boolean | string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
}

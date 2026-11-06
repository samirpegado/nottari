"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StudentAvatar } from "@/components/teacher/student-avatar"
import { createStudent, deleteStudent, getStudent, updateStudent, type StudentRecord } from "@/app/alunos/actions"
import { formatBrPhone, isEmail } from "@/lib/auth-fields"
import { formatCep, formatCpf, isValidCpf, onlyDigits, randomPin } from "@/lib/br-docs"
import { compressStudentPhoto } from "@/lib/student-photo"
import {
  DEFAULT_STUDENT_COLOR,
  INSTRUMENTS,
  SKILL_LEVELS,
  STUDENT_COLORS,
  normalizeStudentColor,
} from "@/lib/student-profile"
import { cn } from "@/lib/utils"

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
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="button" onClick={() => setOpen(true)} className="w-full sm:order-2 sm:ml-auto sm:w-auto">
          <Plus data-icon="inline-start" />
          Adicionar aluno
        </Button>
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nome, CPF, telefone ou e-mail"
          aria-label="Buscar alunos"
          className="w-full sm:order-1 sm:max-w-sm"
        />
      </div>
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
  const [instrument, setInstrument] = useState(student?.instrument ?? "")
  const [skillLevel, setSkillLevel] = useState(student?.skillLevel ?? "")
  const [color, setColor] = useState(normalizeStudentColor(student?.color))
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState(student?.photoUrl || "")
  const [removePhoto, setRemovePhoto] = useState(false)
  const skipCepLookup = useRef(true)
  const photoInput = useRef<HTMLInputElement>(null)
  const localPreview = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (localPreview.current) URL.revokeObjectURL(localPreview.current)
    }
  }, [])

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

  async function onPickPhoto(file: File | null) {
    if (!file) return
    setError(undefined)
    try {
      const compressed = await compressStudentPhoto(file)
      if (localPreview.current) URL.revokeObjectURL(localPreview.current)
      const url = URL.createObjectURL(compressed)
      localPreview.current = url
      setPhotoFile(compressed)
      setPhotoPreview(url)
      setRemovePhoto(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível ler a foto.")
    }
    if (photoInput.current) photoInput.current.value = ""
  }

  function onRemovePhoto() {
    if (localPreview.current) {
      URL.revokeObjectURL(localPreview.current)
      localPreview.current = null
    }
    setPhotoFile(null)
    setPhotoPreview("")
    setRemovePhoto(true)
  }

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
      instrument,
      skillLevel,
      color,
      zipCode,
      street,
      streetNumber,
      complement,
      neighborhood,
      city,
      state,
    }
    const result = student
      ? await updateStudent(student.id, payload, photoFile, removePhoto)
      : await createStudent(payload, photoFile)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <ModalLayer onClose={onClose}>
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-modal-title"
        className="max-h-[90svh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="student-modal-title" className="text-lg font-semibold">
          {editing ? "Editar aluno" : "Adicionar aluno"}
        </h2>
        <p className="mt-1 text-sm text-[#64748B]">
          Nome e telefone são obrigatórios. O PIN pode ser alterado.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-4 sm:col-span-2">
            <StudentAvatar
              name={fullName || "Aluno"}
              photoUrl={photoPreview || null}
              color={color}
              size="lg"
            />
            <div className="flex min-w-0 flex-col gap-2">
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => void onPickPhoto(event.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => photoInput.current?.click()}>
                  {photoPreview ? "Trocar foto" : "Enviar foto"}
                </Button>
                {photoPreview ? (
                  <Button type="button" variant="ghost" onClick={onRemovePhoto}>
                    Remover
                  </Button>
                ) : null}
              </div>
              <p className="text-xs font-normal text-[#64748B]">JPG, PNG ou WebP.</p>
            </div>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium">Cor do card</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {STUDENT_COLORS.map((option) => {
                const selected = color === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={selected}
                    onClick={() => setColor(option.value)}
                    className={cn(
                      "size-8 rounded-full border border-black/10",
                      selected ? "ring-2 ring-[#0B1220] ring-offset-2" : "hover:ring-2 hover:ring-[#94A3B8] hover:ring-offset-2",
                    )}
                    style={{ background: option.value }}
                  />
                )
              })}
              <label className="relative size-8 overflow-hidden rounded-full border border-dashed border-[#94A3B8]" title="Outra cor">
                <span className="sr-only">Escolher outra cor</span>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value.toUpperCase())}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <span
                  className="block size-full"
                  style={{ background: color === DEFAULT_STUDENT_COLOR ? "conic-gradient(#3B82F6, #8B5CF6, #DB2777, #EA580C, #0D9488, #3B82F6)" : color }}
                />
              </label>
            </div>
          </div>
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
          <Field
            label="CPF"
            hint="Pode repetir se o aluno estudar mais de um instrumento."
          >
            <input
              inputMode="numeric"
              value={cpf}
              onChange={(event) => setCpf(formatCpf(event.target.value))}
              placeholder="000.000.000-00"
              className={fieldClass}
            />
          </Field>
          <Field label="Instrumento">
            <InstrumentField value={instrument} onChange={setInstrument} />
          </Field>
          <Field label="Nível">
            <SelectMenu
              value={skillLevel}
              onChange={setSkillLevel}
              placeholder="Selecione o nível"
              options={[
                { value: "", label: "Sem nível" },
                ...SKILL_LEVELS.map((level) => ({ value: level, label: level })),
              ]}
            />
          </Field>
          <Field
            label="PIN de acesso"
            hint={
              editing
                ? "4 dígitos. Se o telefone já existir em outro cadastro, use um PIN diferente."
                : "4 dígitos, gerado automaticamente. Se o telefone já existir, o PIN precisa ser outro."
            }
          >
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
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : editing ? "Salvar" : "Cadastrar aluno"}
          </Button>
        </div>
      </form>
    </ModalLayer>
  )
}

export function StudentActions({
  studentId,
  studentName,
  variant = "plain",
}: {
  studentId: string
  studentName: string
  variant?: "plain" | "overlay" | "header"
}) {
  const router = useRouter()
  const [student, setStudent] = useState<StudentRecord | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, setPending] = useState<"edit" | "delete" | null>(null)
  const [error, setError] = useState<string>()

  async function onEdit(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
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
    setError(undefined)
    setPending("delete")
    const result = await deleteStudent(studentId)
    setPending(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setConfirmDelete(false)
    router.refresh()
  }

  const overlay = variant === "overlay"
  if (variant === "header") {
    return (
      <>
        <Button type="button" variant="outline" onClick={onEdit} disabled={pending !== null}>
          <Pencil data-icon="inline-start" />
          {pending === "edit" ? "Abrindo..." : "Editar"}
        </Button>
        {student ? <StudentModal student={student} onClose={() => setStudent(null)} /> : null}
      </>
    )
  }
  return (
    <>
      <div className="relative z-20 flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={pending !== null}
          aria-label={pending === "edit" ? "Abrindo edição" : `Editar ${studentName}`}
          title="Editar"
          className={
            overlay
              ? "grid size-8 place-items-center rounded-full bg-white/20 text-white hover:bg-white/35 disabled:opacity-50"
              : "inline-flex size-8 items-center justify-center rounded-lg text-[#0B1220] hover:bg-[#F8FAFC] disabled:opacity-50"
          }
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setError(undefined)
            setConfirmDelete(true)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          disabled={pending !== null}
          aria-label={`Excluir ${studentName}`}
          title="Excluir"
          className={
            overlay
              ? "grid size-8 place-items-center rounded-full bg-white/20 text-white hover:bg-[#DC2626]/85 disabled:opacity-50"
              : "inline-flex size-8 items-center justify-center rounded-lg text-[#B91C1C] hover:bg-[#EF4444]/10 disabled:opacity-50"
          }
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {error ? <p className="sr-only">{error}</p> : null}
      {student ? <StudentModal student={student} onClose={() => setStudent(null)} /> : null}
      {confirmDelete ? (
        <DeleteStudentModal
          studentName={studentName}
          error={error}
          pending={pending === "delete"}
          onClose={() => {
            if (pending === "delete") return
            setConfirmDelete(false)
            setError(undefined)
          }}
          onConfirm={() => void onDelete()}
        />
      ) : null}
    </>
  )
}

function DeleteStudentModal({
  studentName,
  error,
  pending,
  onClose,
  onConfirm,
}: {
  studentName: string
  error?: string
  pending: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <ModalLayer onClose={pending ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-student-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="delete-student-title" className="text-lg font-semibold">
          Excluir aluno
        </h2>
        <p className="mt-2 text-sm text-[#475569]">
          Excluir <span className="font-semibold text-[#0B1220]">{studentName}</span>? Os horários e
          as aulas desse aluno também saem da agenda. Essa ação não pode ser desfeita.
        </p>
        {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? "Excluindo..." : "Excluir aluno"}
          </Button>
        </div>
      </div>
    </ModalLayer>
  )
}

function ModalLayer({
  onClose,
  children,
}: {
  onClose?: () => void
  children: React.ReactNode
}) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current?.()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0B1220]/40 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current?.()
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

function SelectMenu({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = options.find((option) => option.value === value)

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className={`${fieldClass} flex w-full items-center justify-between gap-3 pr-4 text-left`}
      >
        <span className={current ? "truncate" : "truncate text-[#94A3B8]"}>
          {current?.label ?? placeholder}
        </span>
        <ChevronDown className="mr-1 size-4 shrink-0 text-[#64748B]" />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-[#0B1220]/10 bg-white p-1.5 shadow-lg"
        >
          {options.map((option) => {
            const selected = option.value === value
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left text-sm font-normal",
                    selected ? "bg-[#3B82F6] text-white" : "text-[#0B1220] hover:bg-[#F1F5F9]",
                  )}
                >
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function InstrumentField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const known = INSTRUMENTS.includes(value)
  const filtered = INSTRUMENTS.filter((item) =>
    item.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR")),
  )
  const custom = query.trim()
  const showCustom =
    custom.length > 0 &&
    !INSTRUMENTS.some((item) => item.toLocaleLowerCase("pt-BR") === custom.toLocaleLowerCase("pt-BR"))

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  function pick(next: string) {
    onChange(next)
    setQuery("")
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen(true)
          window.setTimeout(() => inputRef.current?.focus(), 0)
        }}
        className={`${fieldClass} flex w-full items-center justify-between gap-3 pr-4 text-left`}
      >
        <span className={value ? "truncate" : "truncate text-[#94A3B8]"}>
          {value || "Selecione ou digite"}
        </span>
        <ChevronDown className="mr-1 size-4 shrink-0 text-[#64748B]" />
      </button>
      {open ? (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-[#0B1220]/10 bg-white shadow-lg">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar ou escrever outro"
            className="h-11 w-full border-b border-[#0B1220]/10 px-3.5 text-sm outline-none"
          />
          <ul role="listbox" className="max-h-56 overflow-auto p-1.5">
            {value ? (
              <li>
                <button
                  type="button"
                  onClick={() => pick("")}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-normal text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  Sem instrumento
                </button>
              </li>
            ) : null}
            {filtered.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item === value}
                  onClick={() => pick(item)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left text-sm font-normal",
                    item === value ? "bg-[#3B82F6] text-white" : "text-[#0B1220] hover:bg-[#F1F5F9]",
                  )}
                >
                  {item}
                </button>
              </li>
            ))}
            {showCustom ? (
              <li>
                <button
                  type="button"
                  onClick={() => pick(custom)}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-normal text-[#1D4ED8] hover:bg-[#EFF6FF]"
                >
                  Usar “{custom}”
                </button>
              </li>
            ) : null}
            {filtered.length === 0 && !showCustom ? (
              <li className="px-3 py-2.5 text-sm text-[#64748B]">Nenhum instrumento nessa busca.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
      {value && !known ? (
        <p className="mt-1 text-xs font-normal text-[#64748B]">Instrumento digitado.</p>
      ) : null}
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

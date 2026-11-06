"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  CirclePlay,
  File,
  FileText,
  Folder,
  FolderPlus,
  LayoutGrid,
  Link2,
  List,
  MoreVertical,
  Music,
  Search,
  Upload,
  X,
} from "lucide-react"
import { searchStudents, type StudentSearchHit } from "@/app/agenda/actions"
import {
  assignMaterial,
  createFolder,
  createVideoLink,
  deleteFolder,
  deleteMaterial,
  moveMaterial,
  openMaterial,
  renameMaterial,
  updateFolder,
  uploadMaterial,
  type FolderRecord,
  type LibraryResult,
  type MaterialRecord,
} from "@/app/materiais/actions"
import { StudentAvatar } from "@/components/teacher/student-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FOLDER_COLORS,
  MATERIAL_TYPE_META,
  MATERIAL_TYPES,
  detectMaterialFile,
  folderSubtitle,
  formatBytes,
  formatMaterialDate,
  materialAccept,
  normalizeFolderColor,
  videoHost,
  type MaterialType,
} from "@/lib/materials"
import { cn } from "@/lib/utils"

const fieldClass =
  "h-11 rounded-xl border border-[#0B1220]/10 px-3 font-normal outline-none focus:border-[#3B82F6]"
const VIEW_KEY = "nottari.materials.view"

export function MaterialsBoard({
  library,
  folderId,
  typeFilter,
  query,
}: {
  library: LibraryResult
  folderId: string
  typeFilter: string
  query: string
}) {
  const router = useRouter()
  const [view, setView] = useState<"list" | "grid">("list")
  const [search, setSearch] = useState(query)
  const [folderOpen, setFolderOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const [fileMenu, setFileMenu] = useState<MaterialRecord | null>(null)
  const [folderMenu, setFolderMenu] = useState<FolderRecord | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const pushed = useRef(query)

  const current = library.folders.find((folder) => folder.id === folderId) ?? null
  const crumb = useMemo(() => breadcrumb(library.folders, folderId), [library.folders, folderId])

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_KEY)
    if (saved === "grid" || saved === "list") setView(saved)
  }, [])

  useEffect(() => {
    if (query !== pushed.current) {
      pushed.current = query
      setSearch(query)
    }
  }, [query])

  useEffect(() => {
    const next = search.trim()
    if (next === query) return
    const timeout = window.setTimeout(() => {
      pushed.current = next
      router.replace(libraryHref({ folderId, type: typeFilter, query: next }))
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [search, query, folderId, typeFilter, router])

  function setViewMode(next: "list" | "grid") {
    setView(next)
    window.localStorage.setItem(VIEW_KEY, next)
  }

  async function sendFiles(files: FileList | File[]) {
    const list = [...files]
    if (list.length === 0) return
    setUploading(true)
    setError(undefined)
    for (const file of list) {
      const detected = detectMaterialFile(file)
      if (!detected.ok) {
        setError(detected.error)
        setUploading(false)
        return
      }
      const form = new FormData()
      form.set("file", file)
      if (folderId) form.set("folderId", folderId)
      const result = await uploadMaterial(form)
      if (!result.ok) {
        setError(result.error)
        setUploading(false)
        return
      }
    }
    setUploading(false)
    router.refresh()
  }

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Materiais</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight md:text-3xl">Sua biblioteca</h1>
          <p className="mt-1 text-sm text-[#64748B]">Organize o que você disponibiliza para os alunos.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" className="w-full sm:order-3 sm:w-auto" onClick={() => fileInput.current?.click()}>
            <Upload data-icon="inline-start" />
            Enviar arquivo
          </Button>
          <Button type="button" variant="outline" className="w-full sm:order-1 sm:w-auto" onClick={() => setFolderOpen(true)}>
            <FolderPlus data-icon="inline-start" />
            Nova pasta
          </Button>
          <Button type="button" variant="outline" className="w-full sm:order-2 sm:w-auto" onClick={() => setLinkOpen(true)}>
            <Link2 data-icon="inline-start" />
            Adicionar link
          </Button>
        </div>
      </header>

      <input
        ref={fileInput}
        type="file"
        accept={materialAccept()}
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) void sendFiles(event.target.files)
          event.target.value = ""
        }}
      />

      {error ? <p className="mt-4 text-sm text-[#B91C1C]">{error}</p> : null}

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
        <LibraryTree
          folders={library.folders}
          folderId={folderId}
          typeFilter={typeFilter}
          query={query}
          typeCounts={library.typeCounts}
          totalFiles={library.totalFiles}
        />

        <section className="min-w-0 flex-1 rounded-[22px] border border-[#e2e8f0] bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#475569]">
              {crumb.map((item, index) => (
                <span key={item.id || "root"}>
                  {index > 0 ? <span className="px-1.5 text-[#94A3B8]">/</span> : null}
                  {index === crumb.length - 1 ? (
                    <span className="font-semibold text-[#0B1220]">{item.name}</span>
                  ) : (
                    <Link href={libraryHref({ folderId: item.id, type: typeFilter, query })} className="hover:text-[#1D4ED8]">
                      {item.name}
                    </Link>
                  )}
                </span>
              ))}
            </p>
            <div className="flex items-center gap-2">
              <label className="relative block">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar material"
                  aria-label="Buscar material"
                  className="h-11 w-full bg-[#F8FAFC] pl-10 sm:w-60"
                />
              </label>
              <div className="flex rounded-xl bg-[#F1F5F9] p-0.5">
                <button
                  type="button"
                  aria-label="Ver em grade"
                  aria-pressed={view === "grid"}
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "grid size-10 place-items-center rounded-lg",
                    view === "grid" ? "bg-white text-[#0B1220] shadow-sm" : "text-[#64748B]",
                  )}
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Ver em lista"
                  aria-pressed={view === "list"}
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "grid size-10 place-items-center rounded-lg",
                    view === "list" ? "bg-white text-[#0B1220] shadow-sm" : "text-[#64748B]",
                  )}
                >
                  <List className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {library.currentChildren.length > 0 ? (
            <div className="mt-5">
              <h2 className="text-sm font-semibold text-[#475569]">Pastas · {library.currentChildren.length}</h2>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {library.currentChildren.map((folder) => (
                  <li key={folder.id}>
                    <FolderCard
                      folder={folder}
                      href={libraryHref({ folderId: folder.id, type: typeFilter, query })}
                      onMenu={() => setFolderMenu(folder)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-[#475569]">Arquivos · {library.files.length}</h2>
            {library.files.length === 0 ? (
              <p className="mt-3 rounded-2xl bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#64748B]">
                {query
                  ? "Nenhum material nessa busca."
                  : current
                    ? "Esta pasta ainda está vazia."
                    : "Nenhum arquivo na raiz. Envie um PDF, Word ou MP3, ou crie uma pasta."}
              </p>
            ) : view === "grid" ? (
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {library.files.map((file) => (
                  <li key={file.id}>
                    <FileCard file={file} today={library.today} onMenu={() => setFileMenu(file)} />
                  </li>
                ))}
              </ul>
            ) : (
              <FileTable files={library.files} today={library.today} onMenu={setFileMenu} />
            )}
          </div>

          <div
            className={cn(
              "mt-6 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-4",
              dragging ? "border-[#3B82F6] bg-[#EFF6FF]" : "border-[#CBD5E1]",
            )}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              void sendFiles(event.dataTransfer.files)
            }}
          >
            <span className="grid size-11 place-items-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <Upload className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {uploading ? "Enviando..." : "Arraste arquivos para cá"}
              </span>
              <span className="block text-xs text-[#475569]">PDF, Word e MP3. Para vídeo, use Adicionar link.</span>
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              Escolher arquivos
            </Button>
          </div>
        </section>
      </div>

      {folderOpen ? (
        <FolderModal parentId={folderId || null} onClose={() => setFolderOpen(false)} />
      ) : null}
      {linkOpen ? <LinkModal folderId={folderId || null} onClose={() => setLinkOpen(false)} /> : null}
      {fileMenu ? (
        <FileActions
          file={fileMenu}
          folders={library.folders}
          onClose={() => setFileMenu(null)}
        />
      ) : null}
      {folderMenu ? (
        <FolderActions
          folder={folderMenu}
          folders={library.folders}
          onClose={() => setFolderMenu(null)}
        />
      ) : null}
    </div>
  )
}

function LibraryTree({
  folders,
  folderId,
  typeFilter,
  query,
  typeCounts,
  totalFiles,
}: {
  folders: FolderRecord[]
  folderId: string
  typeFilter: string
  query: string
  typeCounts: Record<MaterialType, number>
  totalFiles: number
}) {
  const roots = folders.filter((folder) => !folder.parentId)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const next: Record<string, boolean> = {}
    let cursor = folders.find((folder) => folder.id === folderId)
    while (cursor?.parentId) {
      next[cursor.parentId] = true
      cursor = folders.find((folder) => folder.id === cursor?.parentId)
    }
    setOpen((current) => ({ ...current, ...next }))
  }, [folderId, folders])

  return (
    <nav
      aria-label="Pastas e tipos"
      className="w-full shrink-0 rounded-[22px] border border-[#e2e8f0] bg-white p-3 lg:w-64"
    >
      <p className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">Pastas</p>
      <TreeLink
        href={libraryHref({ folderId: "", type: typeFilter, query })}
        current={!folderId}
        label="Todos os materiais"
        count={totalFiles}
      />
      {roots.map((folder) => (
        <FolderBranch
          key={folder.id}
          folder={folder}
          folders={folders}
          folderId={folderId}
          typeFilter={typeFilter}
          query={query}
          open={open}
          setOpen={setOpen}
          depth={0}
        />
      ))}
      <p className="mt-4 px-3 pb-2 text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">Tipos</p>
      {MATERIAL_TYPES.map((type) => {
        const meta = MATERIAL_TYPE_META[type]
        const active = typeFilter === type
        return (
          <Link
            key={type}
            href={libraryHref({ folderId, type: active ? "" : type, query })}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm",
              active ? "bg-[#EFF6FF] font-semibold text-[#1D4ED8]" : "text-[#1E293B] hover:bg-[#F1F5F9]",
            )}
          >
            <span className={cn("grid size-7 place-items-center rounded-lg", meta.icon)}>
              <TypeIcon type={type} className="size-3.5" />
            </span>
            <span className="flex-1">{type === "audio" ? "Áudio (MP3)" : type === "video_link" ? "Vídeos (links)" : meta.label}</span>
            <span className="text-xs text-[#64748B]">{typeCounts[type]}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function FolderBranch({
  folder,
  folders,
  folderId,
  typeFilter,
  query,
  open,
  setOpen,
  depth,
}: {
  folder: FolderRecord
  folders: FolderRecord[]
  folderId: string
  typeFilter: string
  query: string
  open: Record<string, boolean>
  setOpen: (value: Record<string, boolean>) => void
  depth: number
}) {
  const children = folders.filter((item) => item.parentId === folder.id)
  const expanded = open[folder.id] ?? false
  const current = folderId === folder.id
  return (
    <div>
      <div className="flex items-center">
        {children.length > 0 ? (
          <button
            type="button"
            aria-label={expanded ? "Recolher pasta" : "Expandir pasta"}
            onClick={() => setOpen({ ...open, [folder.id]: !expanded })}
            className="grid size-8 place-items-center text-[#64748B]"
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="w-8" />
        )}
        <Link
          href={libraryHref({ folderId: folder.id, type: typeFilter, query })}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-xl py-2 pr-3 text-sm",
            current ? "bg-[#EFF6FF] font-semibold text-[#1D4ED8]" : "text-[#1E293B] hover:bg-[#F1F5F9]",
          )}
          style={{ paddingLeft: depth * 12 }}
        >
          <Folder className="size-4 shrink-0" style={{ color: folder.color }} />
          <span className="min-w-0 flex-1 truncate">{folder.name}</span>
          <span className="text-xs text-[#64748B]">{folder.fileCount}</span>
        </Link>
      </div>
      {expanded
        ? children.map((child) => (
            <FolderBranch
              key={child.id}
              folder={child}
              folders={folders}
              folderId={folderId}
              typeFilter={typeFilter}
              query={query}
              open={open}
              setOpen={setOpen}
              depth={depth + 1}
            />
          ))
        : null}
    </div>
  )
}

function TreeLink({
  href,
  current,
  label,
  count,
}: {
  href: string
  current: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm",
        current ? "bg-[#EFF6FF] font-semibold text-[#1D4ED8]" : "text-[#1E293B] hover:bg-[#F1F5F9]",
      )}
    >
      <LayoutGrid className="size-4" />
      <span className="flex-1">{label}</span>
      <span className="text-xs text-[#64748B]">{count}</span>
    </Link>
  )
}

function FolderCard({
  folder,
  href,
  onMenu,
}: {
  folder: FolderRecord
  href: string
  onMenu: () => void
}) {
  return (
    <div className="group relative flex items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-[#C7D2FE] hover:shadow-[0_14px_30px_-18px_rgba(15,23,42,.35)]">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl"
          style={{ background: `${folder.color}22`, color: folder.color }}
        >
          <Folder className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{folder.name}</span>
          <span className="block text-xs text-[#64748B]">{folderSubtitle(folder.fileCount, folder.childCount)}</span>
        </span>
      </Link>
      <button
        type="button"
        aria-label={`Mais ações para ${folder.name}`}
        onClick={onMenu}
        className="grid size-9 place-items-center rounded-xl text-[#64748B] hover:bg-[#F1F5F9]"
      >
        <MoreVertical className="size-4" />
      </button>
    </div>
  )
}

function FileTable({
  files,
  today,
  onMenu,
}: {
  files: MaterialRecord[]
  today: string
  onMenu: (file: MaterialRecord) => void
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[740px] text-sm">
        <thead>
          <tr className="border-b border-[#e8edf4] text-left text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">
            <th className="px-3 py-2 font-semibold">Nome</th>
            <th className="px-3 py-2 font-semibold">Tipo</th>
            <th className="px-3 py-2 font-semibold">Tamanho</th>
            <th className="px-3 py-2 font-semibold">Compartilhado</th>
            <th className="px-3 py-2 font-semibold">Atualizado</th>
            <th className="w-11" />
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const meta = MATERIAL_TYPE_META[file.type]
            return (
              <tr key={file.id} className="border-b border-[#eef2f7] last:border-0 hover:bg-[#F8FAFC]">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", meta.icon)}>
                      <TypeIcon type={file.type} className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{file.title}</span>
                      {file.type === "video_link" ? (
                        <span className="block text-xs text-[#64748B]">{videoHost(file.externalUrl)}</span>
                      ) : null}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", meta.chip)}>
                    {meta.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-[#334155]">
                  {file.type === "video_link" ? "Link" : formatBytes(file.sizeBytes)}
                </td>
                <td className="px-3 py-2.5">
                  <AssigneeStack assignees={file.assignees} />
                </td>
                <td className="px-3 py-2.5 text-[#334155]">{formatMaterialDate(file.updatedAt, today)}</td>
                <td className="px-1 py-2.5">
                  <button
                    type="button"
                    aria-label={`Mais ações para ${file.title}`}
                    onClick={() => onMenu(file)}
                    className="grid size-9 place-items-center rounded-xl text-[#64748B] hover:bg-[#F1F5F9]"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function FileCard({
  file,
  today,
  onMenu,
}: {
  file: MaterialRecord
  today: string
  onMenu: () => void
}) {
  const meta = MATERIAL_TYPE_META[file.type]
  return (
    <article className="rounded-2xl border border-[#e2e8f0] p-3.5">
      <div className="flex items-start gap-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", meta.icon)}>
          <TypeIcon type={file.type} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{file.title}</span>
          <span className={cn("mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.chip)}>
            {meta.label}
          </span>
        </span>
        <button
          type="button"
          aria-label={`Mais ações para ${file.title}`}
          onClick={onMenu}
          className="grid size-8 place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
        >
          <MoreVertical className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#64748B]">
        <span>{file.type === "video_link" ? videoHost(file.externalUrl) : formatBytes(file.sizeBytes)}</span>
        <span>{formatMaterialDate(file.updatedAt, today)}</span>
      </div>
      <div className="mt-2">
        <AssigneeStack assignees={file.assignees} />
      </div>
    </article>
  )
}

function AssigneeStack({
  assignees,
}: {
  assignees: MaterialRecord["assignees"]
}) {
  if (assignees.length === 0) return <span className="text-sm text-[#94A3B8]">—</span>
  const shown = assignees.slice(0, 3)
  const extra = assignees.length - shown.length
  return (
    <span className="flex items-center" title={assignees.map((item) => item.name).join(", ")}>
      {shown.map((student, index) => (
        <span key={student.id} className={cn(index > 0 && "-ml-2")}>
          <StudentAvatar
            name={student.name}
            photoUrl={student.photoUrl}
            color={student.color}
            size="sm"
            className="border-2 border-white"
          />
        </span>
      ))}
      {extra > 0 ? (
        <span className="-ml-2 grid size-9 place-items-center rounded-full border-2 border-white bg-[#E2E8F0] text-[10px] font-semibold text-[#334155]">
          +{extra}
        </span>
      ) : null}
    </span>
  )
}

function TypeIcon({ type, className }: { type: MaterialType; className?: string }) {
  if (type === "pdf") return <FileText className={className} />
  if (type === "document") return <File className={className} />
  if (type === "audio") return <Music className={className} />
  return <CirclePlay className={className} />
}

function FolderModal({
  parentId,
  folder,
  onClose,
}: {
  parentId?: string | null
  folder?: FolderRecord
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(folder?.name ?? "")
  const [color, setColor] = useState(normalizeFolderColor(folder?.color))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    const result = folder
      ? await updateFolder({ folderId: folder.id, name, color })
      : await createFolder({ parentId, name, color })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <ModalLayer onClose={pending ? undefined : onClose}>
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{folder ? "Editar pasta" : "Nova pasta"}</h2>
        <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium">
          Nome
          <Input value={name} onChange={(event) => setName(event.target.value)} required className={fieldClass} />
        </label>
        <p className="mt-3 text-sm font-medium">Cor</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {FOLDER_COLORS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-label={item.label}
              onClick={() => setColor(item.value)}
              className={cn(
                "size-8 rounded-full ring-offset-2",
                color === item.value ? "ring-2 ring-[#0B1220]" : "",
              )}
              style={{ background: item.value }}
            />
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </ModalLayer>
  )
}

function LinkModal({ folderId, onClose }: { folderId: string | null; onClose: () => void }) {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [title, setTitle] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    const result = await createVideoLink({ folderId, url, title })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <ModalLayer onClose={pending ? undefined : onClose}>
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Adicionar link</h2>
        <p className="mt-1 text-sm text-[#64748B]">YouTube, Vimeo ou qualquer URL de vídeo.</p>
        <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium">
          Link
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
            required
            className={fieldClass}
          />
        </label>
        <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
          Título
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Opcional" className={fieldClass} />
        </label>
        {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Adicionar"}
          </Button>
        </div>
      </form>
    </ModalLayer>
  )
}

function FileActions({
  file,
  folders,
  onClose,
}: {
  file: MaterialRecord
  folders: FolderRecord[]
  onClose: () => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"menu" | "share" | "rename" | "move" | "delete">("menu")
  const [title, setTitle] = useState(file.title)
  const [folderDest, setFolderDest] = useState(file.folderId ?? "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const [selected, setSelected] = useState(
    file.assignees.map((item) => ({ id: item.id, name: item.name })),
  )

  async function open() {
    const result = await openMaterial(file.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    window.open(result.url, "_blank", "noopener,noreferrer")
    onClose()
  }

  async function saveRename(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    const result = await renameMaterial(file.id, title)
    setPending(false)
    if (!result.ok) return setError(result.error)
    router.refresh()
    onClose()
  }

  async function saveMove(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    const result = await moveMaterial(file.id, folderDest || null)
    setPending(false)
    if (!result.ok) return setError(result.error)
    router.refresh()
    onClose()
  }

  async function saveShare() {
    setPending(true)
    const result = await assignMaterial(
      file.id,
      selected.map((item) => item.id),
    )
    setPending(false)
    if (!result.ok) return setError(result.error)
    router.refresh()
    onClose()
  }

  async function confirmDelete() {
    setPending(true)
    const result = await deleteMaterial(file.id)
    setPending(false)
    if (!result.ok) return setError(result.error)
    router.refresh()
    onClose()
  }

  if (mode === "share") {
    return (
      <ModalLayer onClose={pending ? undefined : onClose}>
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <h2 className="text-lg font-semibold">Compartilhar</h2>
          <p className="mt-1 text-sm text-[#64748B]">{file.title}</p>
          <SharePicker selected={selected} onChange={setSelected} />
          {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveShare()} disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </ModalLayer>
    )
  }

  if (mode === "rename") {
    return (
      <ModalLayer onClose={pending ? undefined : onClose}>
        <form
          onSubmit={saveRename}
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <h2 className="text-lg font-semibold">Renomear</h2>
          <Input className={`${fieldClass} mt-4`} value={title} onChange={(event) => setTitle(event.target.value)} />
          {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Salvar
            </Button>
          </div>
        </form>
      </ModalLayer>
    )
  }

  if (mode === "move") {
    return (
      <ModalLayer onClose={pending ? undefined : onClose}>
        <form
          onSubmit={saveMove}
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <h2 className="text-lg font-semibold">Mover para</h2>
          <select
            className={`${fieldClass} mt-4 w-full`}
            value={folderDest}
            onChange={(event) => setFolderDest(event.target.value)}
          >
            <option value="">Todos os materiais (raiz)</option>
            {flattenFolders(folders).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Mover
            </Button>
          </div>
        </form>
      </ModalLayer>
    )
  }

  if (mode === "delete") {
    return (
      <ModalLayer onClose={pending ? undefined : onClose}>
        <div
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <h2 className="text-lg font-semibold">Excluir arquivo</h2>
          <p className="mt-2 text-sm text-[#475569]">
            Excluir <span className="font-semibold">{file.title}</span>? Os alunos perdem o acesso.
          </p>
          {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={pending}>
              Excluir
            </Button>
          </div>
        </div>
      </ModalLayer>
    )
  }

  return (
    <ModalLayer onClose={onClose}>
      <div
        role="dialog"
        className="w-full max-w-sm rounded-2xl bg-white p-2 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <ActionItem onClick={() => void open()}>Abrir</ActionItem>
        <ActionItem onClick={() => setMode("share")}>Compartilhar</ActionItem>
        <ActionItem onClick={() => setMode("rename")}>Renomear</ActionItem>
        <ActionItem onClick={() => setMode("move")}>Mover</ActionItem>
        <ActionItem onClick={() => setMode("delete")} danger>
          Excluir
        </ActionItem>
        {error ? <p className="px-3 py-2 text-sm text-[#B91C1C]">{error}</p> : null}
      </div>
    </ModalLayer>
  )
}

function FolderActions({
  folder,
  folders,
  onClose,
}: {
  folder: FolderRecord
  folders: FolderRecord[]
  onClose: () => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<"menu" | "edit" | "move" | "delete">("menu")
  const [folderDest, setFolderDest] = useState(folder.parentId ?? "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()
  const blocked = new Set(folderTree(folders, folder.id).map((item) => item.id))

  async function saveMove(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    const result = await updateFolder({ folderId: folder.id, parentId: folderDest || null })
    setPending(false)
    if (!result.ok) return setError(result.error)
    router.refresh()
    onClose()
  }

  async function confirmDelete() {
    setPending(true)
    const result = await deleteFolder(folder.id)
    setPending(false)
    if (!result.ok) return setError(result.error)
    router.refresh()
    onClose()
  }

  if (mode === "edit") {
    return <FolderModal folder={folder} onClose={onClose} />
  }

  if (mode === "move") {
    return (
      <ModalLayer onClose={pending ? undefined : onClose}>
        <form
          onSubmit={saveMove}
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <h2 className="text-lg font-semibold">Mover pasta</h2>
          <select
            className={`${fieldClass} mt-4 w-full`}
            value={folderDest}
            onChange={(event) => setFolderDest(event.target.value)}
          >
            <option value="">Raiz</option>
            {flattenFolders(folders)
              .filter((item) => !blocked.has(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
          </select>
          {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Mover
            </Button>
          </div>
        </form>
      </ModalLayer>
    )
  }

  if (mode === "delete") {
    return (
      <ModalLayer onClose={pending ? undefined : onClose}>
        <div
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <h2 className="text-lg font-semibold">Excluir pasta</h2>
          <p className="mt-2 text-sm text-[#475569]">
            Excluir <span className="font-semibold">{folder.name}</span> e tudo que estiver dentro dela?
          </p>
          {error ? <p className="mt-3 text-sm text-[#B91C1C]">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={pending}>
              Excluir pasta
            </Button>
          </div>
        </div>
      </ModalLayer>
    )
  }

  return (
    <ModalLayer onClose={onClose}>
      <div
        role="dialog"
        className="w-full max-w-sm rounded-2xl bg-white p-2 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <ActionItem onClick={() => setMode("edit")}>Renomear / cor</ActionItem>
        <ActionItem onClick={() => setMode("move")}>Mover</ActionItem>
        <ActionItem onClick={() => setMode("delete")} danger>
          Excluir
        </ActionItem>
      </div>
    </ModalLayer>
  )
}

function SharePicker({
  selected,
  onChange,
}: {
  selected: { id: string; name: string }[]
  onChange: (value: { id: string; name: string }[]) => void
}) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<StudentSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const request = useRef(0)

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setHits([])
      return
    }
    const timeout = window.setTimeout(() => {
      const ticket = request.current + 1
      request.current = ticket
      setLoading(true)
      void searchStudents(term).then((result) => {
        if (ticket !== request.current) return
        setHits(result.students)
        setLoading(false)
      })
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [query])

  const selectedIds = new Set(selected.map((item) => item.id))

  return (
    <div className="mt-4">
      {selected.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2">
          {selected.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                onClick={() => onChange(selected.filter((item) => item.id !== student.id))}
                className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-semibold text-[#1D4ED8]"
              >
                {student.name}
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-[#64748B]">Nenhum aluno com acesso ainda.</p>
      )}
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar aluno"
        className={fieldClass}
      />
      {query.trim() ? (
        <ul className="mt-2 max-h-48 overflow-auto rounded-xl border border-[#0B1220]/10 p-1.5">
          {loading ? (
            <li className="px-3 py-2 text-sm text-[#64748B]">Buscando...</li>
          ) : hits.length === 0 ? (
            <li className="px-3 py-2 text-sm text-[#64748B]">Nenhum aluno encontrado.</li>
          ) : (
            hits.map((student) => {
              const already = selectedIds.has(student.id)
              return (
                <li key={student.id}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => {
                      onChange([...selected, { id: student.id, name: student.name }])
                      setQuery("")
                      setHits([])
                    }}
                    className="flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F1F5F9] disabled:text-[#94A3B8]"
                  >
                    {student.name}
                    {student.instrument ? (
                      <span className="ml-2 text-xs text-[#64748B]">{student.instrument}</span>
                    ) : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}

function ActionItem({
  onClick,
  danger = false,
  children,
}: {
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium",
        danger ? "text-[#B91C1C] hover:bg-[#FEF2F2]" : "text-[#0B1220] hover:bg-[#F8FAFC]",
      )}
    >
      {children}
    </button>
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

function libraryHref({
  folderId,
  type,
  query,
}: {
  folderId?: string
  type?: string
  query?: string
}) {
  const params = new URLSearchParams()
  if (folderId) params.set("pasta", folderId)
  if (type) params.set("tipo", type)
  if (query?.trim()) params.set("q", query.trim())
  const search = params.toString()
  return search ? `/materiais?${search}` : "/materiais"
}

function breadcrumb(folders: FolderRecord[], folderId: string) {
  const trail: { id: string; name: string }[] = [{ id: "", name: "Todos os materiais" }]
  if (!folderId) return trail
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const stack: FolderRecord[] = []
  let cursor = byId.get(folderId)
  const seen = new Set<string>()
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    stack.unshift(cursor)
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
  }
  return [...trail, ...stack.map((folder) => ({ id: folder.id, name: folder.name }))]
}

function flattenFolders(folders: FolderRecord[], parentId: string | null = null, prefix = "") {
  const rows: { id: string; label: string }[] = []
  for (const folder of folders.filter((item) => item.parentId === parentId)) {
    const label = prefix ? `${prefix} / ${folder.name}` : folder.name
    rows.push({ id: folder.id, label })
    rows.push(...flattenFolders(folders, folder.id, label))
  }
  return rows
}

function folderTree(folders: FolderRecord[], rootId: string) {
  const rows = [folders.find((folder) => folder.id === rootId)].filter(Boolean) as FolderRecord[]
  for (const folder of rows) {
    rows.push(...folders.filter((item) => item.parentId === folder.id))
  }
  return rows
}

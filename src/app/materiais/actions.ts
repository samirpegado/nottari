"use server"

import { revalidatePath } from "next/cache"
import { signedPhotoUrls } from "@/app/alunos/actions"
import {
  DEFAULT_FOLDER_COLOR,
  MATERIALS_BUCKET,
  detectMaterialFile,
  isMaterialType,
  materialPath,
  normalizeFolderColor,
  parseVideoUrl,
  type MaterialType,
} from "@/lib/materials"
import { saoPauloNow } from "@/lib/schedule"
import { normalizeStudentColor } from "@/lib/student-profile"
import { getTeacherContext } from "@/lib/teacher"

export type FolderRecord = {
  id: string
  name: string
  color: string
  parentId: string | null
  fileCount: number
  totalFiles: number
  childCount: number
}

export type AssigneeRecord = {
  id: string
  name: string
  color: string
  photoUrl: string | null
}

export type MaterialRecord = {
  id: string
  title: string
  type: MaterialType
  sizeBytes: number | null
  externalUrl: string | null
  folderId: string | null
  updatedAt: string
  assignees: AssigneeRecord[]
}

export type LibraryResult = {
  ok: true
  today: string
  folders: FolderRecord[]
  files: MaterialRecord[]
  currentChildren: FolderRecord[]
  typeCounts: Record<MaterialType, number>
  totalFiles: number
}

export async function listLibrary(input: {
  folderId?: string
  type?: string
  query?: string
}): Promise<LibraryResult | { ok: false; error: string }> {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const typeFilter = isMaterialType(input.type) ? input.type : null
  const query = input.query?.replace(/[%_,()\\]/g, "").trim() ?? ""
  let folderId = input.folderId?.trim() || null

  const [foldersResult, materialsResult] = await Promise.all([
    supabase
      .from("material_folders")
      .select("id, name, color, parent_id")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("materials")
      .select(
        "id, title, type, size_bytes, external_url, folder_id, updated_at, storage_path, material_assignments(student_id, students(id, full_name, stage_name, color, photo_path))",
      )
      .eq("organization_id", organizationId)
      .order("title", { ascending: true }),
  ])

  if (foldersResult.error || materialsResult.error) {
    return fail("Não foi possível abrir a biblioteca.")
  }

  const folderRows = (foldersResult.data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    color: normalizeFolderColor(row.color as string),
    parentId: (row.parent_id as string | null) ?? null,
  }))

  if (folderId && !folderRows.some((folder) => folder.id === folderId)) {
    folderId = null
  }

  const childrenByParent = new Map<string | null, string[]>()
  for (const folder of folderRows) {
    const list = childrenByParent.get(folder.parentId) ?? []
    list.push(folder.id)
    childrenByParent.set(folder.parentId, list)
  }

  const descendantCache = new Map<string, Set<string>>()
  function descendants(id: string): Set<string> {
    const cached = descendantCache.get(id)
    if (cached) return cached
    const set = new Set<string>()
    for (const child of childrenByParent.get(id) ?? []) {
      set.add(child)
      for (const nested of descendants(child)) set.add(nested)
    }
    descendantCache.set(id, set)
    return set
  }

  const directFiles = new Map<string | null, number>()
  const typeCounts: Record<MaterialType, number> = {
    pdf: 0,
    document: 0,
    audio: 0,
    video_link: 0,
  }
  for (const row of materialsResult.data ?? []) {
    const type = row.type as MaterialType
    if (typeCounts[type] !== undefined) typeCounts[type] += 1
    const key = (row.folder_id as string | null) ?? null
    directFiles.set(key, (directFiles.get(key) ?? 0) + 1)
  }

  const folders: FolderRecord[] = folderRows.map((folder) => {
    const childIds = childrenByParent.get(folder.id) ?? []
    let totalFiles = directFiles.get(folder.id) ?? 0
    for (const nested of descendants(folder.id)) {
      totalFiles += directFiles.get(nested) ?? 0
    }
    return {
      ...folder,
      fileCount: totalFiles,
      totalFiles,
      childCount: childIds.length,
    }
  })

  const subtree = folderId ? new Set([folderId, ...descendants(folderId)]) : null
  const searching = Boolean(query)
  const photoPaths: string[] = []
  const files: MaterialRecord[] = []

  for (const row of materialsResult.data ?? []) {
    const type = row.type as string
    if (!isMaterialType(type)) continue
    if (typeFilter && type !== typeFilter) continue
    const materialFolder = (row.folder_id as string | null) ?? null
    if (searching) {
      if (subtree && materialFolder && !subtree.has(materialFolder) && materialFolder !== folderId) continue
      if (subtree && !materialFolder && folderId) continue
      const title = String(row.title ?? "")
      if (!title.toLowerCase().includes(query.toLowerCase())) continue
    } else if (folderId) {
      if (materialFolder !== folderId) continue
    } else if (materialFolder) {
      continue
    }

    const assignees = assigneesOf(row).map((student) => {
      const path = student.photo_path
      if (path) photoPaths.push(path)
      return {
        id: student.id,
        name: student.stage_name?.trim() || student.full_name,
        color: normalizeStudentColor(student.color),
        photoUrl: path,
      }
    })

    files.push({
      id: row.id as string,
      title: row.title as string,
      type,
      sizeBytes: row.size_bytes === null || row.size_bytes === undefined ? null : Number(row.size_bytes),
      externalUrl: (row.external_url as string | null) ?? null,
      folderId: materialFolder,
      updatedAt: String(row.updated_at),
      assignees,
    })
  }

  const photos = await signedPhotoUrls(supabase, photoPaths)
  for (const file of files) {
    file.assignees = file.assignees.map((student) => ({
      ...student,
      photoUrl: student.photoUrl ? (photos.get(student.photoUrl) ?? null) : null,
    }))
  }

  const currentChildren = folders
    .filter((folder) => folder.parentId === (folderId ?? null))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

  return {
    ok: true,
    today: saoPauloNow().ymd,
    folders,
    files,
    currentChildren: searching || typeFilter ? [] : currentChildren,
    typeCounts,
    totalFiles: (materialsResult.data ?? []).length,
  }
}

export async function createFolder(input: { parentId?: string | null; name: string; color?: string }) {
  const name = input.name.trim()
  if (name.length < 1 || name.length > 80) return fail("Dê um nome de até 80 caracteres para a pasta.")
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const parentId = input.parentId?.trim() || null
  if (parentId) {
    const parent = await folderInOrg(supabase, organizationId, parentId)
    if (!parent) return fail("A pasta pai não existe.")
  }

  const { error } = await supabase.from("material_folders").insert({
    organization_id: organizationId,
    parent_id: parentId,
    name,
    color: normalizeFolderColor(input.color ?? DEFAULT_FOLDER_COLOR),
  })
  if (error) return writeFolderError(error)
  refresh()
  return { ok: true as const }
}

export async function updateFolder(input: {
  folderId: string
  name?: string
  color?: string
  parentId?: string | null
}) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")
  const folder = await folderInOrg(supabase, organizationId, input.folderId)
  if (!folder) return fail("Pasta não encontrada.")

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) {
    const name = input.name.trim()
    if (name.length < 1 || name.length > 80) return fail("Dê um nome de até 80 caracteres para a pasta.")
    patch.name = name
  }
  if (input.color !== undefined) patch.color = normalizeFolderColor(input.color)
  if (input.parentId !== undefined) {
    const parentId = input.parentId?.trim() || null
    if (parentId === folder.id) return fail("A pasta não pode ficar dentro dela mesma.")
    if (parentId) {
      const parent = await folderInOrg(supabase, organizationId, parentId)
      if (!parent) return fail("A pasta de destino não existe.")
      if (await isDescendant(supabase, organizationId, folder.id, parentId)) {
        return fail("Não dá para mover uma pasta para dentro dela mesma.")
      }
    }
    patch.parent_id = parentId
  }

  const { error } = await supabase
    .from("material_folders")
    .update(patch)
    .eq("id", folder.id)
    .eq("organization_id", organizationId)
  if (error) return writeFolderError(error)
  refresh()
  return { ok: true as const }
}

export async function deleteFolder(folderId: string) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")
  const folder = await folderInOrg(supabase, organizationId, folderId)
  if (!folder) return fail("Pasta não encontrada.")

  const ids = await folderTreeIds(supabase, organizationId, folderId)
  const { data: files } = await supabase
    .from("materials")
    .select("storage_path")
    .eq("organization_id", organizationId)
    .in("folder_id", ids)

  const paths = (files ?? []).map((row) => row.storage_path as string | null).filter(Boolean) as string[]
  if (paths.length > 0) {
    await supabase.storage.from(MATERIALS_BUCKET).remove(paths)
  }

  const { error } = await supabase
    .from("material_folders")
    .delete()
    .eq("id", folderId)
    .eq("organization_id", organizationId)
  if (error) return fail("Não foi possível excluir a pasta.")
  refresh()
  return { ok: true as const }
}

export async function uploadMaterial(form: FormData) {
  const file = form.get("file")
  if (!(file instanceof File)) return fail("Escolha um arquivo.")
  const detected = detectMaterialFile(file)
  if (!detected.ok) return detected

  const { supabase, organizationId, userId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const folderId = String(form.get("folderId") ?? "").trim() || null
  if (folderId) {
    const folder = await folderInOrg(supabase, organizationId, folderId)
    if (!folder) return fail("A pasta não existe mais.")
  }

  const title = file.name.replace(/\.[^.]+$/, "").trim() || file.name
  const materialId = crypto.randomUUID()
  const path = materialPath(organizationId, materialId, file.name)
  const { error: uploadError } = await supabase.storage.from(MATERIALS_BUCKET).upload(path, file, {
    contentType: detected.mime,
    upsert: false,
  })
  if (uploadError) return fail("Não foi possível enviar o arquivo. Tente de novo.")

  const { error: insertError } = await supabase.from("materials").insert({
    id: materialId,
    organization_id: organizationId,
    folder_id: folderId,
    type: detected.type,
    title,
    size_bytes: file.size,
    storage_path: path,
    created_by: userId,
  })
  if (insertError) {
    await supabase.storage.from(MATERIALS_BUCKET).remove([path])
    return fail("Não foi possível salvar o arquivo.")
  }

  refresh()
  return { ok: true as const }
}

export async function createVideoLink(input: { folderId?: string | null; url: string; title: string }) {
  const parsed = parseVideoUrl(input.url)
  if (!parsed.ok) return parsed
  const title = input.title.trim() || parsed.host
  if (title.length > 120) return fail("O título pode ter até 120 caracteres.")

  const { supabase, organizationId, userId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const folderId = input.folderId?.trim() || null
  if (folderId) {
    const folder = await folderInOrg(supabase, organizationId, folderId)
    if (!folder) return fail("A pasta não existe mais.")
  }

  const { error } = await supabase.from("materials").insert({
    organization_id: organizationId,
    folder_id: folderId,
    type: "video_link",
    title,
    external_url: parsed.url,
    created_by: userId,
  })
  if (error) return fail("Não foi possível salvar o link.")
  refresh()
  return { ok: true as const }
}

export async function renameMaterial(materialId: string, title: string) {
  const name = title.trim()
  if (name.length < 1 || name.length > 120) return fail("Dê um nome de até 120 caracteres.")
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")
  const { error } = await supabase
    .from("materials")
    .update({ title: name })
    .eq("id", materialId)
    .eq("organization_id", organizationId)
  if (error) return fail("Não foi possível renomear.")
  refresh()
  return { ok: true as const }
}

export async function moveMaterial(materialId: string, folderId: string | null) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")
  const destination = folderId?.trim() || null
  if (destination) {
    const folder = await folderInOrg(supabase, organizationId, destination)
    if (!folder) return fail("A pasta de destino não existe.")
  }
  const { error } = await supabase
    .from("materials")
    .update({ folder_id: destination })
    .eq("id", materialId)
    .eq("organization_id", organizationId)
  if (error) return fail("Não foi possível mover o arquivo.")
  refresh()
  return { ok: true as const }
}

export async function deleteMaterial(materialId: string) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")
  const { data } = await supabase
    .from("materials")
    .select("id, storage_path")
    .eq("id", materialId)
    .eq("organization_id", organizationId)
    .maybeSingle()
  if (!data) return fail("Arquivo não encontrado.")
  if (data.storage_path) {
    await supabase.storage.from(MATERIALS_BUCKET).remove([data.storage_path as string])
  }
  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId)
    .eq("organization_id", organizationId)
  if (error) return fail("Não foi possível excluir o arquivo.")
  refresh()
  return { ok: true as const }
}

export async function assignMaterial(materialId: string, studentIds: string[]) {
  const { supabase, organizationId, userId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")

  const { data: material } = await supabase
    .from("materials")
    .select("id")
    .eq("id", materialId)
    .eq("organization_id", organizationId)
    .maybeSingle()
  if (!material) return fail("Arquivo não encontrado.")

  const unique = [...new Set(studentIds.filter(Boolean))]
  if (unique.length > 0) {
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("active", true)
      .in("id", unique)
    const allowed = new Set((students ?? []).map((row) => row.id as string))
    if (allowed.size !== unique.length) return fail("Um dos alunos escolhidos não existe mais.")
  }

  const { data: current } = await supabase
    .from("material_assignments")
    .select("student_id")
    .eq("material_id", materialId)
    .eq("organization_id", organizationId)

  const have = new Set((current ?? []).map((row) => row.student_id as string))
  const want = new Set(unique)
  const toAdd = unique.filter((id) => !have.has(id))
  const toRemove = [...have].filter((id) => !want.has(id))

  if (toRemove.length > 0) {
    await supabase
      .from("material_assignments")
      .delete()
      .eq("material_id", materialId)
      .eq("organization_id", organizationId)
      .in("student_id", toRemove)
  }
  if (toAdd.length > 0) {
    const { error } = await supabase.from("material_assignments").insert(
      toAdd.map((studentId) => ({
        organization_id: organizationId,
        material_id: materialId,
        student_id: studentId,
        assigned_by: userId,
      })),
    )
    if (error) return fail("Não foi possível atualizar o compartilhamento.")
  }
  refresh()
  return { ok: true as const }
}

export async function openMaterial(materialId: string) {
  const { supabase, organizationId } = await getTeacherContext()
  if (!organizationId) return fail("Sua conta ainda não tem uma organização.")
  const { data } = await supabase
    .from("materials")
    .select("type, external_url, storage_path, title")
    .eq("id", materialId)
    .eq("organization_id", organizationId)
    .maybeSingle()
  if (!data) return fail("Arquivo não encontrado.")
  if (data.type === "video_link") {
    const url = data.external_url as string | null
    if (!url) return fail("Esse link não está disponível.")
    return { ok: true as const, url, title: data.title as string }
  }
  const path = data.storage_path as string | null
  if (!path) return fail("Esse arquivo não está disponível.")
  const { data: signed, error } = await supabase.storage.from(MATERIALS_BUCKET).createSignedUrl(path, 60 * 10)
  if (error || !signed?.signedUrl) return fail("Não foi possível abrir o arquivo.")
  return { ok: true as const, url: signed.signedUrl, title: data.title as string }
}

function assigneesOf(row: {
  material_assignments?: AssignmentJoin | AssignmentJoin[] | null
}) {
  const assignments = list(row.material_assignments)
  const students: {
    id: string
    full_name: string
    stage_name: string | null
    color: string | null
    photo_path: string | null
  }[] = []
  for (const assignment of assignments) {
    const student = one(assignment.students)
    if (student) students.push(student)
  }
  return students
}

async function folderInOrg(
  supabase: TeacherClient,
  organizationId: string,
  folderId: string,
) {
  const { data } = await supabase
    .from("material_folders")
    .select("id, parent_id")
    .eq("id", folderId)
    .eq("organization_id", organizationId)
    .maybeSingle()
  return data
}

async function folderTreeIds(
  supabase: TeacherClient,
  organizationId: string,
  rootId: string,
) {
  const { data } = await supabase
    .from("material_folders")
    .select("id, parent_id")
    .eq("organization_id", organizationId)
  const children = new Map<string | null, string[]>()
  for (const row of data ?? []) {
    const parent = (row.parent_id as string | null) ?? null
    const list = children.get(parent) ?? []
    list.push(row.id as string)
    children.set(parent, list)
  }
  const ids = [rootId]
  const seen = new Set(ids)
  for (const id of ids) {
    for (const child of children.get(id) ?? []) {
      if (seen.has(child)) continue
      seen.add(child)
      ids.push(child)
    }
  }
  return ids
}

async function isDescendant(
  supabase: TeacherClient,
  organizationId: string,
  ancestorId: string,
  maybeChildId: string,
) {
  const ids = await folderTreeIds(supabase, organizationId, ancestorId)
  return ids.includes(maybeChildId)
}

function writeFolderError(error: { code?: string }) {
  if (error.code === "23505") return fail("Já existe uma pasta com esse nome aqui.")
  return fail("Não foi possível salvar a pasta.")
}

function refresh() {
  revalidatePath("/materiais")
}

function fail(error: string) {
  return { ok: false as const, error }
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function list<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

type TeacherClient = Awaited<ReturnType<typeof getTeacherContext>>["supabase"]

type AssignmentJoin = {
  student_id: string
  students:
    | {
        id: string
        full_name: string
        stage_name: string | null
        color: string | null
        photo_path: string | null
      }
    | {
        id: string
        full_name: string
        stage_name: string | null
        color: string | null
        photo_path: string | null
      }[]
    | null
}

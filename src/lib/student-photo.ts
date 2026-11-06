export const STUDENT_PHOTO_BUCKET = "student-photos"
export const STUDENT_PHOTO_EDGE = 256
export const STUDENT_PHOTO_QUALITY = 0.6
const STUDENT_PHOTO_MAX_BYTES = 307_200

export function studentPhotoPath(organizationId: string, studentId: string) {
  return `${organizationId}/${studentId}.jpg`
}

export async function compressStudentPhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie uma imagem (JPG, PNG ou WebP).")
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("A foto pode ter até 8 MB.")
  }

  const source = URL.createObjectURL(file)
  try {
    const image = await loadImage(source)
    const canvas = document.createElement("canvas")
    canvas.width = STUDENT_PHOTO_EDGE
    canvas.height = STUDENT_PHOTO_EDGE
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Não foi possível preparar a foto.")

    const scale = Math.max(STUDENT_PHOTO_EDGE / image.naturalWidth, STUDENT_PHOTO_EDGE / image.naturalHeight)
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    context.drawImage(
      image,
      (STUDENT_PHOTO_EDGE - width) / 2,
      (STUDENT_PHOTO_EDGE - height) / 2,
      width,
      height,
    )

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", STUDENT_PHOTO_QUALITY)
    })
    if (!blob) throw new Error("Não foi possível comprimir a foto.")
    return new File([blob], "avatar.jpg", { type: "image/jpeg" })
  } finally {
    URL.revokeObjectURL(source)
  }
}

export async function readStudentPhoto(file: File) {
  if (file.type !== "image/jpeg") return { ok: false as const, error: "Envie a foto em JPEG." }
  if (file.size > STUDENT_PHOTO_MAX_BYTES) {
    return { ok: false as const, error: "A foto ficou grande demais depois da compressão." }
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { ok: false as const, error: "Envie uma foto JPEG válida." }
  }
  return { ok: true as const, bytes }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Não foi possível ler a foto."))
    image.src = url
  })
}

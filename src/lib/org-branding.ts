export const ORG_BRANDING_BUCKET = "org-branding"
export const ORG_LOGO_EDGE = 256
export const ORG_LOGO_QUALITY = 0.6
const ORG_LOGO_MAX_SOURCE_BYTES = 8 * 1024 * 1024
export const ORG_LOGO_MAX_BYTES = 307_200

export function orgLogoPath(organizationId: string) {
  return `${organizationId}/logo.jpg`
}

export async function compressOrgLogo(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie uma imagem (JPG, PNG ou WebP).")
  }
  if (file.size > ORG_LOGO_MAX_SOURCE_BYTES) {
    throw new Error("A logo pode ter até 8 MB.")
  }

  const source = URL.createObjectURL(file)
  try {
    const image = await loadImage(source)
    const canvas = document.createElement("canvas")
    canvas.width = ORG_LOGO_EDGE
    canvas.height = ORG_LOGO_EDGE
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Não foi possível preparar a logo.")

    const scale = Math.max(ORG_LOGO_EDGE / image.naturalWidth, ORG_LOGO_EDGE / image.naturalHeight)
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    context.drawImage(
      image,
      (ORG_LOGO_EDGE - width) / 2,
      (ORG_LOGO_EDGE - height) / 2,
      width,
      height,
    )

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", ORG_LOGO_QUALITY)
    })
    if (!blob) throw new Error("Não foi possível comprimir a logo.")
    return new File([blob], "logo.jpg", { type: "image/jpeg" })
  } finally {
    URL.revokeObjectURL(source)
  }
}

export async function readOrgLogo(file: File) {
  if (file.type !== "image/jpeg") return { ok: false as const, error: "Envie a logo em JPEG." }
  if (file.size > ORG_LOGO_MAX_BYTES) {
    return { ok: false as const, error: "A logo ficou grande demais depois da compressão." }
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { ok: false as const, error: "Envie uma logo JPEG válida." }
  }
  return { ok: true as const, bytes }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Não foi possível ler a imagem."))
    image.src = url
  })
}

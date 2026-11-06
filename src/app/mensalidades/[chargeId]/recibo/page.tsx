import { redirect } from "next/navigation"

export default async function MensalidadesReceiptRedirect({
  params,
}: {
  params: Promise<{ chargeId: string }>
}) {
  const { chargeId } = await params
  redirect(`/faturamento/${chargeId}/recibo`)
}

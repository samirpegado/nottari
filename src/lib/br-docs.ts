export function onlyDigits(value: string) {
  return value.replace(/\D/g, "")
}

export function formatCpf(raw: string) {
  const digits = onlyDigits(raw).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export function formatCep(raw: string) {
  const digits = onlyDigits(raw).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function isValidCpf(raw: string) {
  const cpf = onlyDigits(raw)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (length: number) => {
    let sum = 0
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index)
    }
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export function randomPin() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0")
}

export function requireHttpsUrl(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} não está definida`)

  let protocol: string
  try {
    protocol = new URL(value).protocol
  } catch {
    throw new Error(`${name} não é uma URL válida: ${value}`)
  }

  if (protocol !== 'https:') {
    throw new Error(`${name} deve usar HTTPS (TLS), recebido: ${value}`)
  }

  return value
}

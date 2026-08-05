import { ok, err, preflight } from '../_shared/cors.ts'
import { authenticate, defaultDeps, type Deps } from '../_shared/supabaseAuth.ts'

export async function handler(req: Request, deps: Deps = defaultDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()

  const auth = await authenticate(req, deps)
  if (auth instanceof Response) return auth
  const { client, userId, email } = auth

  const { data: profile, error } = await client
    .from('profiles')
    .select('is_admin, companies(code)')
    .eq('id', userId)
    .single()

  if (error) return err('Perfil não encontrado', 404)

  const companies = (profile.companies as unknown as { code: string }[] | null)?.[0] ?? null

  return ok({
    id: userId,
    email,
    is_admin: profile.is_admin ?? false,
    company_code: companies?.code ?? null,
  })
}

if (import.meta.main) Deno.serve((req) => handler(req))

import { ok, err, preflight } from '../_shared/cors.ts'
import { authenticate, getCompanyId, defaultDeps, type Deps } from '../_shared/supabaseAuth.ts'

export async function handler(req: Request, deps: Deps = defaultDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()

  const auth = await authenticate(req, deps)
  if (auth instanceof Response) return auth
  const { client, userId, email } = auth

  const body = await req.json() as { name?: string } & Record<string, unknown>
  if (!body.name) return err('name é obrigatório')

  const companyId = await getCompanyId(client, userId)
  if (!companyId) return err('Empresa não encontrada', 404)

  const { data, error } = await client
    .from('products')
    .insert({
      ...body,
      company_id: companyId,
      added_by: userId,
      added_by_email: email,
    })
    .select()
    .single()

  if (error) return err(error.message, 500)
  return ok(data)
}

if (import.meta.main) Deno.serve((req) => handler(req))

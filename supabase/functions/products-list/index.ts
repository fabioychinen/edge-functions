import { ok, err, preflight } from '../_shared/cors.ts'
import { authenticate, getCompanyId, defaultDeps, type Deps } from '../_shared/supabaseAuth.ts'

export async function handler(req: Request, deps: Deps = defaultDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()

  const auth = await authenticate(req, deps)
  if (auth instanceof Response) return auth
  const { client, userId } = auth

  const companyId = await getCompanyId(client, userId)
  if (!companyId) return err('Empresa não encontrada', 404)

  const { data: products, error } = await client
    .from('products')
    .select()
    .eq('company_id', companyId)
    .is('removed_at', null)
    .order('name')

  if (error) return err(error.message, 500)
  return ok(products)
}

if (import.meta.main) Deno.serve((req) => handler(req))

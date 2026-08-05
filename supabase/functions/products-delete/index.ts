import { ok, err, preflight } from '../_shared/cors.ts'
import { authenticate, getCompanyId, defaultDeps, type Deps } from '../_shared/supabaseAuth.ts'

export async function handler(req: Request, deps: Deps = defaultDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()

  const auth = await authenticate(req, deps)
  if (auth instanceof Response) return auth
  const { client, userId } = auth

  const { productId } = await req.json() as { productId: number }
  if (!productId) return err('productId é obrigatório')

  const companyId = await getCompanyId(client, userId)
  if (!companyId) return err('Empresa não encontrada', 404)

  // company_id scope prevents cross-company deletion
  const { error } = await client
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('company_id', companyId)

  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

if (import.meta.main) Deno.serve((req) => handler(req))

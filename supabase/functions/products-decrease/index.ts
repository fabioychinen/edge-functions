import { ok, err, preflight } from '../_shared/cors.ts'
import { authenticate, getCompanyId, defaultDeps, type Deps } from '../_shared/supabaseAuth.ts'

export async function handler(req: Request, deps: Deps = defaultDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()

  const auth = await authenticate(req, deps)
  if (auth instanceof Response) return auth
  const { client, userId, email } = auth

  const { productId, amount } = await req.json() as { productId: number; amount: number }

  if (!productId || !amount || amount < 1) return err('Parâmetros inválidos')

  const companyId = await getCompanyId(client, userId)
  if (!companyId) return err('Empresa não encontrada', 404)

  const { data: product, error: fetchError } = await client
    .from('products')
    .select('quantity')
    .eq('id', productId)
    .eq('company_id', companyId)
    .single()

  if (fetchError || !product) return err('Produto não encontrado', 404)
  if (amount > (product.quantity as number)) return err('Quantidade insuficiente em estoque', 422)

  const { error: updateError } = await client
    .from('products')
    .update({
      quantity: (product.quantity as number) - amount,
      last_updated_by_email: email,
      last_updated_at: new Date().toISOString(),
      last_update_type: 'collect',
    })
    .eq('id', productId)
    .eq('company_id', companyId)

  if (updateError) return err(updateError.message, 500)
  return ok({ ok: true })
}

if (import.meta.main) Deno.serve((req) => handler(req))

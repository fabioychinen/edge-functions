// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { err } from './cors.ts'
import { requireHttpsUrl } from './env.ts'

export type Deps = { createClient: (...args: any[]) => any }
export const defaultDeps: Deps = { createClient }

export type AuthenticatedRequest = {
  client: SupabaseClient
  userId: string
  email: string | undefined
}

export async function authenticate(req: Request, deps: Deps): Promise<AuthenticatedRequest | Response> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Não autorizado', 401)

  const client = deps.createClient(
    requireHttpsUrl('SUPABASE_URL'),
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user } } = await client.auth.getUser()
  if (!user) return err('Não autorizado', 401)

  return { client, userId: user.id, email: user.email }
}

export async function getCompanyId(client: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await client.from('profiles').select('company_id').eq('id', userId).single()
  return (data?.company_id as string | null) ?? null
}

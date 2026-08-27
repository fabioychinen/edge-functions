import { ok, err, preflight } from '../_shared/cors.ts'
import { requireEnv, requireHttpsUrl } from '../_shared/env.ts'
import { defaultDeps, type Deps } from '../_shared/supabaseAuth.ts'

export async function handler(req: Request, deps: Deps = defaultDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()

  const { email, password, companyCode, companyName } = await req.json() as {
    email: string
    password: string
    companyCode?: string
    companyName?: string
  }

  if (!email || !password) return err('E-mail e senha são obrigatórios')

  const admin = deps.createClient(
    requireHttpsUrl('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: { user }, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !user) {
    return err(createError?.message ?? 'Erro ao criar conta')
  }

  let companyId: string
  let resolvedCode: string
  let isAdmin: boolean

  if (companyCode) {
    const { data: company } = await admin
      .from('companies')
      .select('id, code')
      .eq('code', companyCode.toUpperCase())
      .maybeSingle()

    if (!company) {
      await admin.auth.admin.deleteUser(user.id)
      return err('Código de empresa inválido')
    }

    companyId = company.id as string
    resolvedCode = company.code as string
    isAdmin = false
  } else {
    resolvedCode = generateCode()
    const name = companyName?.trim() || email.split('@')[0]
    const { data: company, error: companyError } = await admin
      .from('companies')
      .insert({ name, code: resolvedCode })
      .select('id')
      .single()

    if (companyError || !company) {
      await admin.auth.admin.deleteUser(user.id)
      return err('Erro ao criar empresa', 500)
    }

    companyId = company.id as string
    isAdmin = true
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: user.id,
    company_id: companyId,
    is_admin: isAdmin,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(user.id)
    return err('Erro ao criar perfil', 500)
  }

  return ok({ company_code: resolvedCode, is_admin: isAdmin })
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

if (import.meta.main) Deno.serve((req) => handler(req))

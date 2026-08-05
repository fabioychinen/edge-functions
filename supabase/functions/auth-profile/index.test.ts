import { assertEquals } from '@std/assert'
import { handler } from './index.ts'
import { createMockClient, MOCK_USER, MOCK_COMPANY_CODE } from '../_shared/test-utils.ts'

const URL = 'http://localhost'
const AUTH = { Authorization: 'Bearer token' }

Deno.test('OPTIONS retorna preflight', async () => {
  const res = await handler(new Request(URL, { method: 'OPTIONS' }))
  assertEquals(res.status, 200)
})

Deno.test('sem Authorization retorna 401', async () => {
  const res = await handler(new Request(URL))
  assertEquals(res.status, 401)
})

Deno.test('token inválido retorna 401', async () => {
  const res = await handler(
    new Request(URL, { headers: AUTH }),
    { createClient: () => createMockClient({ getUser: () => ({ data: { user: null }, error: null }) }) },
  )
  assertEquals(res.status, 401)
})

Deno.test('perfil não encontrado retorna 404', async () => {
  const res = await handler(
    new Request(URL, { headers: AUTH }),
    {
      createClient: () => createMockClient({
        getUser: () => ({ data: { user: MOCK_USER }, error: null }),
        tables: { profiles: { select: { data: null, error: { message: 'not found' } } } },
      }),
    },
  )
  assertEquals(res.status, 404)
})

Deno.test('retorna perfil com company_code', async () => {
  const res = await handler(
    new Request(URL, { headers: AUTH }),
    {
      createClient: () => createMockClient({
        getUser: () => ({ data: { user: MOCK_USER }, error: null }),
        tables: {
          profiles: {
            select: { data: { is_admin: true, companies: [{ code: MOCK_COMPANY_CODE }] }, error: null },
          },
        },
      }),
    },
  )
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.id, MOCK_USER.id)
  assertEquals(body.email, MOCK_USER.email)
  assertEquals(body.is_admin, true)
  assertEquals(body.company_code, MOCK_COMPANY_CODE)
})

Deno.test('company_code é null quando sem empresa', async () => {
  const res = await handler(
    new Request(URL, { headers: AUTH }),
    {
      createClient: () => createMockClient({
        getUser: () => ({ data: { user: MOCK_USER }, error: null }),
        tables: { profiles: { select: { data: { is_admin: false, companies: null }, error: null } } },
      }),
    },
  )
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.company_code, null)
})

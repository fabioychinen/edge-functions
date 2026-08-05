import { assertEquals } from '@std/assert'
import { handler } from './index.ts'
import { createMockClient, MOCK_USER, MOCK_COMPANY_ID, MOCK_COMPANY_CODE } from '../_shared/test-utils.ts'

const URL = 'http://localhost'

function jsonReq(body: unknown) {
  return new Request(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

Deno.test('OPTIONS retorna preflight', async () => {
  const res = await handler(new Request(URL, { method: 'OPTIONS' }))
  assertEquals(res.status, 200)
})

Deno.test('sem email retorna 400', async () => {
  const res = await handler(jsonReq({ password: 'secret' }))
  assertEquals(res.status, 400)
})

Deno.test('sem password retorna 400', async () => {
  const res = await handler(jsonReq({ email: 'a@b.com' }))
  assertEquals(res.status, 400)
})

Deno.test('falha ao criar user retorna 400', async () => {
  const res = await handler(
    jsonReq({ email: 'a@b.com', password: 'secret' }),
    {
      createClient: () => createMockClient({
        adminCreateUser: () => ({ data: { user: null }, error: { message: 'Email já existe' } }),
      }),
    },
  )
  assertEquals(res.status, 400)
  const body = await res.json()
  assertEquals(body.error, 'Email já existe')
})

Deno.test('companyCode inválido retorna 400', async () => {
  const res = await handler(
    jsonReq({ email: 'a@b.com', password: 'secret', companyCode: 'INVALID' }),
    {
      createClient: () => createMockClient({
        adminCreateUser: () => ({ data: { user: MOCK_USER }, error: null }),
        tables: { companies: { select: { data: null, error: null } } },
      }),
    },
  )
  assertEquals(res.status, 400)
})

Deno.test('registro com companyCode válido retorna is_admin false', async () => {
  const res = await handler(
    jsonReq({ email: 'a@b.com', password: 'secret', companyCode: MOCK_COMPANY_CODE }),
    {
      createClient: () => createMockClient({
        adminCreateUser: () => ({ data: { user: MOCK_USER }, error: null }),
        tables: {
          companies: { select: { data: { id: MOCK_COMPANY_ID, code: MOCK_COMPANY_CODE }, error: null } },
          profiles: { insert: { error: null } },
        },
      }),
    },
  )
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.is_admin, false)
  assertEquals(body.company_code, MOCK_COMPANY_CODE)
})

Deno.test('registro sem companyCode cria empresa e retorna is_admin true', async () => {
  const res = await handler(
    jsonReq({ email: 'novo@empresa.com', password: 'secret' }),
    {
      createClient: () => createMockClient({
        adminCreateUser: () => ({ data: { user: MOCK_USER }, error: null }),
        tables: {
          companies: { insert: { data: { id: MOCK_COMPANY_ID }, error: null } },
          profiles: { insert: { error: null } },
        },
      }),
    },
  )
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.is_admin, true)
})

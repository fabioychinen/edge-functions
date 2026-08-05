import { assertEquals } from '@std/assert'
import { handler } from './index.ts'
import { createMockClient, MOCK_USER, MOCK_COMPANY_ID } from '../_shared/test-utils.ts'

const URL = 'http://localhost'
const AUTH = { Authorization: 'Bearer token' }

const withUser = {
  getUser: () => ({ data: { user: MOCK_USER }, error: null }),
  tables: { profiles: { select: { data: { company_id: MOCK_COMPANY_ID }, error: null } } },
}

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

Deno.test('empresa não encontrada retorna 404', async () => {
  const res = await handler(
    new Request(URL, { headers: AUTH }),
    {
      createClient: () => createMockClient({
        getUser: () => ({ data: { user: MOCK_USER }, error: null }),
        tables: { profiles: { select: { data: null, error: null } } },
      }),
    },
  )
  assertEquals(res.status, 404)
})

Deno.test('erro no DB retorna 500', async () => {
  const res = await handler(
    new Request(URL, { headers: AUTH }),
    {
      createClient: () => createMockClient({
        ...withUser,
        tables: {
          ...withUser.tables,
          products: { select: { data: null, error: { message: 'DB error' } } },
        },
      }),
    },
  )
  assertEquals(res.status, 500)
})

Deno.test('retorna lista de produtos', async () => {
  const products = [{ id: 1, name: 'Widget', quantity: 10 }]
  const res = await handler(
    new Request(URL, { headers: AUTH }),
    {
      createClient: () => createMockClient({
        ...withUser,
        tables: {
          ...withUser.tables,
          products: { select: { data: products, error: null } },
        },
      }),
    },
  )
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body, products)
})

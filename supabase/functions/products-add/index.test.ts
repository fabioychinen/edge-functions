import { assertEquals } from '@std/assert'
import { handler } from './index.ts'
import { createMockClient, MOCK_USER, MOCK_COMPANY_ID } from '../_shared/test-utils.ts'

const URL = 'http://localhost'
const AUTH = { Authorization: 'Bearer token' }

function jsonReq(body: unknown) {
  return new Request(URL, {
    method: 'POST',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const withUser = {
  getUser: () => ({ data: { user: MOCK_USER }, error: null }),
  tables: { profiles: { select: { data: { company_id: MOCK_COMPANY_ID }, error: null } } },
}

Deno.test('OPTIONS retorna preflight', async () => {
  const res = await handler(new Request(URL, { method: 'OPTIONS' }))
  assertEquals(res.status, 200)
})

Deno.test('sem Authorization retorna 401', async () => {
  const res = await handler(new Request(URL, { method: 'POST', body: '{}' }))
  assertEquals(res.status, 401)
})

Deno.test('token inválido retorna 401', async () => {
  const res = await handler(
    jsonReq({}),
    { createClient: () => createMockClient({ getUser: () => ({ data: { user: null }, error: null }) }) },
  )
  assertEquals(res.status, 401)
})

Deno.test('sem name retorna 400', async () => {
  const res = await handler(jsonReq({ quantity: 5 }), { createClient: () => createMockClient(withUser) })
  assertEquals(res.status, 400)
})

Deno.test('empresa não encontrada retorna 404', async () => {
  const res = await handler(
    jsonReq({ name: 'Produto' }),
    {
      createClient: () => createMockClient({
        getUser: () => ({ data: { user: MOCK_USER }, error: null }),
        tables: { profiles: { select: { data: null, error: null } } },
      }),
    },
  )
  assertEquals(res.status, 404)
})

Deno.test('erro no insert retorna 500', async () => {
  const res = await handler(
    jsonReq({ name: 'Produto' }),
    {
      createClient: () => createMockClient({
        ...withUser,
        tables: {
          ...withUser.tables,
          products: { insert: { data: null, error: { message: 'constraint violation' } } },
        },
      }),
    },
  )
  assertEquals(res.status, 500)
})

Deno.test('cria produto com sucesso', async () => {
  const newProduct = { id: 1, name: 'Produto', quantity: 5 }
  const res = await handler(
    jsonReq({ name: 'Produto', quantity: 5 }),
    {
      createClient: () => createMockClient({
        ...withUser,
        tables: {
          ...withUser.tables,
          products: { insert: { data: newProduct, error: null } },
        },
      }),
    },
  )
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body, newProduct)
})

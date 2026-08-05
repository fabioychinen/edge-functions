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
    jsonReq({ productId: 1, amount: 2 }),
    { createClient: () => createMockClient({ getUser: () => ({ data: { user: null }, error: null }) }) },
  )
  assertEquals(res.status, 401)
})

Deno.test('sem productId retorna 400', async () => {
  const res = await handler(
    jsonReq({ amount: 2 }),
    { createClient: () => createMockClient({ getUser: () => ({ data: { user: MOCK_USER }, error: null }) }) },
  )
  assertEquals(res.status, 400)
})

Deno.test('amount menor que 1 retorna 400', async () => {
  const res = await handler(
    jsonReq({ productId: 1, amount: 0 }),
    { createClient: () => createMockClient({ getUser: () => ({ data: { user: MOCK_USER }, error: null }) }) },
  )
  assertEquals(res.status, 400)
})

Deno.test('empresa não encontrada retorna 404', async () => {
  const res = await handler(
    jsonReq({ productId: 1, amount: 2 }),
    {
      createClient: () => createMockClient({
        getUser: () => ({ data: { user: MOCK_USER }, error: null }),
        tables: { profiles: { select: { data: null, error: null } } },
      }),
    },
  )
  assertEquals(res.status, 404)
})

Deno.test('produto não encontrado retorna 404', async () => {
  const res = await handler(
    jsonReq({ productId: 99, amount: 2 }),
    {
      createClient: () => createMockClient({
        ...withUser,
        tables: {
          ...withUser.tables,
          products: { select: { data: null, error: { message: 'not found' } } },
        },
      }),
    },
  )
  assertEquals(res.status, 404)
})

Deno.test('estoque insuficiente retorna 422', async () => {
  const res = await handler(
    jsonReq({ productId: 1, amount: 15 }),
    {
      createClient: () => createMockClient({
        ...withUser,
        tables: {
          ...withUser.tables,
          products: { select: { data: { quantity: 10 }, error: null } },
        },
      }),
    },
  )
  assertEquals(res.status, 422)
})

Deno.test('diminui estoque com sucesso', async () => {
  const res = await handler(
    jsonReq({ productId: 1, amount: 3 }),
    {
      createClient: () => createMockClient({
        ...withUser,
        tables: {
          ...withUser.tables,
          products: {
            select: { data: { quantity: 10 }, error: null },
            update: { error: null },
          },
        },
      }),
    },
  )
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.ok, true)
})

// deno-lint-ignore-file no-explicit-any
Deno.env.set('SUPABASE_URL', 'https://localhost.test')
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key')
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

type Result = { data?: unknown; error?: unknown }
type TableConfig = {
  select?: Result
  insert?: Result
  update?: Result
  delete?: Result
}

class MockQueryBuilder {
  #op: string | null = null

  constructor(private readonly cfg: TableConfig) {}

  select(_?: unknown) { if (!this.#op) this.#op = 'select'; return this }
  insert(_?: unknown) { if (!this.#op) this.#op = 'insert'; return this }
  update(_?: unknown) { if (!this.#op) this.#op = 'update'; return this }
  delete() { if (!this.#op) this.#op = 'delete'; return this }
  eq(_a: unknown, _b: unknown) { return this }
  is(_a: unknown, _b: unknown) { return this }
  order(_: unknown) { return this }

  #res(): Result {
    return (this.cfg as any)[this.#op ?? 'select'] ?? { data: null, error: null }
  }

  single() { return Promise.resolve(this.#res()) }
  maybeSingle() { return Promise.resolve(this.#res()) }
  then(res: any, rej: any) { return Promise.resolve(this.#res()).then(res, rej) }
}

export type MockClientConfig = {
  getUser?: () => { data: { user: unknown }; error: unknown }
  adminCreateUser?: (p: unknown) => { data: { user: unknown }; error: unknown }
  adminDeleteUser?: () => Promise<void>
  tables?: Record<string, TableConfig>
}

export function createMockClient(cfg: MockClientConfig): any {
  const tables = cfg.tables ?? {}
  return {
    auth: {
      getUser: () => Promise.resolve(cfg.getUser?.() ?? { data: { user: null }, error: null }),
      admin: {
        createUser: (p: unknown) =>
          Promise.resolve(cfg.adminCreateUser?.(p) ?? { data: { user: null }, error: null }),
        deleteUser: cfg.adminDeleteUser ?? (() => Promise.resolve()),
      },
    },
    from: (table: string) => new MockQueryBuilder(tables[table] ?? {}),
  }
}

export const MOCK_USER = { id: 'user-123', email: 'test@example.com' }
export const MOCK_COMPANY_ID = 'company-456'
export const MOCK_COMPANY_CODE = 'TESTCODE'

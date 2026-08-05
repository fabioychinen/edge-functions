# edge-functions

Coleção de Supabase Edge Functions (Deno) para um sistema multi-tenant de controle de estoque, com autenticação própria por empresa (`company_id`) e papéis de admin/usuário comum.

## Stack

- **Runtime**: Deno 2 (Supabase Edge Runtime)
- **Linguagem**: TypeScript
- **Backend/DB**: Supabase (Postgres + Auth) via `@supabase/supabase-js`
- **Testes**: `Deno.test`

## Estrutura

```
main.ts                        # exemplo raiz standalone (Deno Deploy), não faz parte das funções Supabase
supabase/
  config.toml                  # configuração do projeto Supabase local
  functions/
    deno.json                  # import map compartilhado pelas funções autenticadas
    tsconfig.json
    hello/                     # função de exemplo (sem verificação de JWT)
    auth-register/              # cadastro de usuário + empresa
    auth-profile/                # perfil do usuário autenticado
    products-list/               # listagem de produtos da empresa
    products-add/                 # criação de produto
    products-increase/             # entrada de estoque
    products-decrease/             # saída de estoque
    products-delete/                # remoção de produto
    _shared/
      cors.ts                  # helpers de resposta (ok/err/preflight) + CORS
      env.ts                    # validação de variáveis de ambiente (exige HTTPS)
      supabaseAuth.ts            # autenticação via header Authorization + resolução de company_id
```

## Modelo de dados (implícito, via Supabase)

- **companies**: `id`, `name`, `code` (código único de convite, gerado automaticamente)
- **profiles**: `id` (= auth user id), `company_id`, `is_admin`
- **products**: `id`, `company_id`, `quantity`, `added_by`, `added_by_email`, `last_updated_by_email`, `last_updated_at`, `last_update_type` (`add` | `collect`), `removed_at`

## Convenções das funções

- Toda função trata `OPTIONS` com `preflight()` (CORS).
- Respostas padronizadas: `ok(data, status?)` e `err(message, status?)`, sempre JSON com headers de CORS.
- Funções autenticadas usam `authenticate(req, deps)`, que:
  - exige header `Authorization`;
  - cria um client Supabase com esse token e resolve o usuário via `auth.getUser()`;
  - retorna `401` (`Não autorizado`) se ausente/inválido.
- O escopo por empresa é sempre reforçado com `.eq('company_id', companyId)` nas queries, evitando vazamento/edição entre empresas.
- Mensagens de erro voltadas ao usuário são em português.
- `requireHttpsUrl` garante que `SUPABASE_URL` seja HTTPS antes de instanciar o client (aborta se não for TLS).
- Cada handler exporta `handler(req, deps?)` (injeção de dependência do `createClient`, facilitando testes) e só chama `Deno.serve` quando executado como entrypoint (`import.meta.main`).

## Especificação dos endpoints

### `hello` (sem autenticação, `verify_jwt = false`)
Função de exemplo do template padrão do Supabase.

### `POST auth-register`
Cria um usuário e o vincula a uma empresa.

Body: `{ email, password, companyCode?, companyName? }`

- `email`/`password` obrigatórios.
- Se `companyCode` for informado: valida que a empresa existe (código case-insensitive, salvo em maiúsculas); usuário entra como membro comum (`is_admin: false`).
- Se `companyCode` **não** for informado: cria uma nova empresa com código aleatório de 8 caracteres (`generateCode`) e nome = `companyName` ou prefixo do e-mail; usuário entra como admin (`is_admin: true`).
- Em qualquer falha após a criação do usuário (empresa inválida, erro ao criar empresa/perfil), o usuário criado é removido (rollback via `auth.admin.deleteUser`).
- Retorno: `{ company_code, is_admin }`.

### `GET/POST auth-profile` (autenticado)
Retorna os dados do usuário autenticado: `{ id, email, is_admin, company_code }`. `404` se o perfil não existir.

### `GET products-list` (autenticado)
Lista produtos da empresa do usuário (`removed_at IS NULL`), ordenados por nome.

### `POST products-add` (autenticado)
Cria um produto na empresa do usuário. Body livre (`Record<string, unknown>`), com `company_id`, `added_by` e `added_by_email` preenchidos automaticamente pelo servidor.

### `POST products-increase` (autenticado)
Entrada de estoque. Body: `{ productId, amount }` (`amount >= 1`). Soma `amount` à quantidade atual e registra `last_update_type: 'add'`.

### `POST products-decrease` (autenticado)
Saída de estoque. Body: `{ productId, amount }` (`amount >= 1`). Valida estoque suficiente (`422` se `amount` maior que a quantidade); subtrai e registra `last_update_type: 'collect'`.

### `POST products-delete` (autenticado)
Remove um produto (`{ productId }`), restrito à empresa do usuário.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase (deve ser HTTPS) |
| `SUPABASE_ANON_KEY` | usada nas funções autenticadas, propagando o token do usuário |
| `SUPABASE_SERVICE_ROLE_KEY` | usada em `auth-register` para operações administrativas (criar/apagar usuário, criar empresa) |

## Desenvolvimento local

```bash
# função de exemplo na raiz
deno task dev

# funções Supabase
supabase start
supabase functions serve

# testes
deno test
```

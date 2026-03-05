# API Boilerplate Reduction Plan

## Objective
- Remove repeated auth/validation/error scaffolding from route handlers while preserving strict security and current response contracts.

## 1) New abstraction layer

### 1.1 `src/lib/api/http.ts`
- Standard response helpers:
  - `ok(data, status?)`
  - `badRequest(message)`
  - `forbidden(message?)`
  - `notFound(message?)`
  - `serverError(message?)`

### 1.2 `src/lib/api/route-guards.ts`
- Session and profile wrappers:
  - `withSessao(request, handler)`
  - `withPerfis(request, ["EMPRESA", ...], handler)`
  - Optionally `withPdvAccess(...)` helper for manager scope checks.

### 1.3 `src/lib/api/route-validation.ts`
- Validation and parse helpers:
  - `parseJson(request)` safe wrapper.
  - `validateBody(schema, payload)`.
  - `validateQuery(schema, request.nextUrl.searchParams)`.
  - Always return `mensagemErroValidacao` format on failure.

### 1.4 `src/lib/api/route-errors.ts`
- `try/catch` helper to map unknown errors safely and avoid route-level duplication.

## 2) Consolidate auth helper duplication
- Remove `src/app/api/pendencias/permissoes.ts`.
- Replace all `exigeSessao` usage in pendencias routes with `exigirSessao` from `src/lib/permissoes.ts`.

## 3) Migration pattern per route

### 3.1 Before
- route-level repetition:
  - session guard
  - parse JSON
  - zod validation
  - NextResponse error shape

### 3.2 After
- route-level file contains only business logic.
- helpers handle session + validation + common responses.

## 4) Route groups and migration order

### Group A (highest repetition, highest ROI)
- `src/app/api/funcionarios/route.ts`
- `src/app/api/funcionarios/[id]/route.ts`
- `src/app/api/leads/route.ts`
- `src/app/api/leads/[id]/route.ts`
- `src/app/api/leads/[id]/mover/route.ts`

### Group B
- `src/app/api/pdvs/route.ts`
- `src/app/api/pdvs/[id]/route.ts`
- `src/app/api/whatsapp/instances/route.ts`
- `src/app/api/whatsapp/instances/[id]/route.ts`

### Group C
- chat and automations routes:
  - `src/app/api/whatsapp/chat/*`
  - `src/app/api/whatsapp/automations/*`
  - `src/app/api/whatsapp/agendamentos/*`

### Group D
- auth routes:
  - `src/app/api/autenticacao/login/route.ts`
  - `src/app/api/autenticacao/cadastro-empresa/route.ts`
  - `src/app/api/autenticacao/logout/route.ts`

## 5) Optional route consolidation opportunities
- If endpoint coverage confirms no usage:
  - remove `pendencias/[id]` write-block route.
  - remove `pendencias/lead/[leadId]` if module no longer needs per-lead endpoint.
  - remove `whatsapp/agendamentos/retry` if no caller.

## 6) Contract safety checklist
- Keep response status codes unchanged.
- Keep `erro` field naming unchanged for frontend compatibility.
- Keep authorization semantics unchanged (`EMPRESA`, `GERENTE`, `COLABORADOR`).
- Keep tenant isolation (`id_empresa`) in every query path.

## 7) Expected outcome
- Route files become shorter and more uniform.
- Lower token count from duplicated scaffolding.
- Reduced onboarding friction and lower bug rate for new endpoints.

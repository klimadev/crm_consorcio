<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.2 | Updated: 2026-02-24 -->

# Technical Domain

Core concept: This project is a multi-tenant CRM built with Next.js App Router, TypeScript, Prisma, and Tailwind. The dominant implementation style is auth-first API handlers, feature-module hooks for UI orchestration, optimistic interactions with rollback, and event-driven automations for WhatsApp.

## Key Points
- Stack: Next.js 16, React 19, TypeScript 5, Prisma 5, SQLite, Tailwind v4, Vitest.
- Directory style: App Router endpoints in `src/app/api/**/route.ts` and feature slices in `src/modules/*`.
- API style: `exigirSessao` auth guard, permission gates, Zod `safeParse`, and `NextResponse.json` responses.
- Frontend style: hooks-first module orchestration, optimistic updates with rollback, and debounced autosave.
- Naming and security baseline: kebab-case/PascalCase conventions, JWT httpOnly cookie, bcrypt, and tenant scoping by `id_empresa`.
- WhatsApp automation: event-driven pattern with rules stored in database.

## Primary Stack
| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 | Unified SSR and API handlers |
| Runtime UI | React | 19.2.3 | Hooks and component composition |
| Language | TypeScript | 5 | Strong typing for handlers/components |
| ORM | Prisma | 5.22.0 | Typed schema and data access |
| Database | SQLite | current | Local-first, simple setup |
| Styling | Tailwind CSS | 4 | Fast utility-first styling |
| Testing | Vitest | 3.2.4 | Fast unit and route tests |

## Directory Patterns
- `src/app/`: routes and pages using App Router.
- `src/app/api/**/route.ts`: HTTP handlers by domain resource.
- `src/modules/*`: feature-centric hooks/components/pages (`kanban`, `equipe`, `configs`, `whatsapp`).
- `src/components/ui`: shared reusable primitives.
- `src/lib`: cross-cutting utilities (auth, permissions, validation, integrations, WhatsApp automations).
- WhatsApp automation: `src/lib/whatsapp-automations.ts` for event-driven orchestrator.

## Code Patterns

### API Endpoint
```ts
export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const body = await request.json();
  const validacao = schema.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json({ erro: "Dados invalidos." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
```

### Module Hook Pattern
```tsx
const idTemporario = `temp-${Date.now()}`;
setLeads((atual) => [{ ...novoLead, id: idTemporario }, ...atual]);
const resposta = await fetch("/api/leads", { method: "POST", body: JSON.stringify(novoLead) });
if (!resposta.ok) {
  setLeads((atual) => atual.filter((lead) => lead.id !== idTemporario));
}
```

### WhatsApp Automation Pattern (Event-Driven)
```ts
// 1. Call automation function after action completes
import { executarAutomacoesLeadStageChanged } from "@/lib/whatsapp-automations";

await prisma.lead.update({ where: { id }, data: { id_estagio } });

// 2. Fire-and-forget with error logging
try {
  await executarAutomacoesLeadStageChanged({
    idEmpresa: auth.sessao.id_empresa,
    lead: { id: lead.id, nome: lead.nome, telefone: lead.telefone },
    estagioAnterior: { id: oldStage.id, nome: oldStage.nome },
    estagioNovo: { id: newStage.id, nome: newStage.nome },
  });
} catch (erro) {
  console.error("Erro ao executar automacoes WhatsApp:", erro);
}
```

### JSON Parse Error Handling
```ts
// Always handle parse errors gracefully
const json = await resposta.json().catch(() => ({}));
if (!resposta.ok) {
  setErro(json.erro ?? "Erro ao carregar dados.");
  return;
}
```

## Design Patterns
- Feature module composition: `page.tsx` delegates logic to `use-*-module` hooks.
- Auth and RBAC gateway in API handlers before business logic.
- Controlled async UX with explicit loading, error, success, and rollback states.
- Debounce timers for autosave and transient UI status feedback.
- Event-driven automations: trigger → find matching rules → execute action.

## Naming Conventions
| Type | Convention | Example |
|---|---|---|
| Files | kebab-case | `modulo-equipe.tsx` |
| Components | PascalCase | `ModuloEquipe` |
| Functions | camelCase | `exigirSessao` |
| Database fields | snake_case | `id_empresa` |

## Code Standards
- TypeScript strict mode (`strict: true`).
- Validate request payloads with Zod `safeParse`.
- Use shared Prisma client from `@/lib/prisma`.
- Keep API handlers in `src/app/api/**/route.ts`.
- Use `@/*` alias for internal imports.
- Always handle JSON parse errors gracefully with `.catch(() => ({}))`.

## Security Requirements
- Validate all user input before persistence.
- Store sessions as signed JWT in httpOnly cookie.
- Hash passwords with bcrypt.
- Enforce role-based access (`EMPRESA`, `GERENTE`, `COLABORADOR`).
- Scope queries by tenant (`id_empresa`).

## 📂 Codebase References
- API route pattern: `src/app/api/leads/route.ts`
- Auth and RBAC helpers: `src/lib/permissoes.ts`
- Validation schemas: `src/lib/validacoes.ts`
- Session and JWT handling: `src/lib/autenticacao.ts`
- Module hook pattern: `src/modules/kanban/hooks/use-kanban-module.ts`
- Team module hook pattern: `src/modules/equipe/hooks/use-equipe-module.ts`
- WhatsApp integration: `src/lib/evolution-api.ts`
- WhatsApp automations: `src/lib/whatsapp-automations.ts`
- WhatsApp automations API: `src/app/api/whatsapp/automations/route.ts`
- WhatsApp module UI: `src/modules/whatsapp/`
- Feature directory pattern: `src/modules/`
- Data model: `prisma/schema.prisma`
- Tooling: `package.json`, `tsconfig.json`, `eslint.config.mjs`

## Reference
- `.opencode/context/core/context-system/standards/mvi.md`

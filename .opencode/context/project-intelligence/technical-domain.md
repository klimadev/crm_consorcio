<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.0 | Updated: 2026-02-20 -->

# Technical Domain

Core concept: This project is a multi-tenant CRM built with Next.js App Router, TypeScript, Prisma, and Tailwind. API routes follow a session-first plus validation-first flow, and UI uses typed functional components with Radix/shadcn patterns.

## Key Points
- Stack: Next.js 16, React 19, TypeScript 5, Prisma 5, SQLite, Tailwind v4.
- API style: `exigirSessao` auth guard, Zod `safeParse`, and `NextResponse.json` for all responses.
- Component style: typed props, hooks-first state, modular UI in `src/components/`.
- Naming style: kebab-case files, PascalCase components/types, camelCase functions, snake_case DB fields.
- Security baseline: JWT httpOnly cookie, bcrypt, role checks, and tenant scoping by `id_empresa`.

## Primary Stack
| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 | Unified SSR and API handlers |
| Language | TypeScript | 5 | Strong typing for handlers/components |
| ORM | Prisma | 5.22.0 | Typed schema and data access |
| Database | SQLite | current | Local-first, simple setup |
| Styling | Tailwind CSS | 4 | Fast utility-first styling |

## Code Patterns

### API Endpoint
```ts
export async function POST(request: NextRequest) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  const body = await request.json();
  const validacao = esquemaCriarLead.safeParse(body);
  if (!validacao.success) {
    return NextResponse.json({ erro: mensagemErroValidacao(validacao.error) }, { status: 400 });
  }

  const lead = await prisma.lead.create({ data: { ...validacao.data, id_empresa: auth.sessao.id_empresa } });
  return NextResponse.json({ lead });
}
```

### Component
```tsx
type Props = { perfil: "EMPRESA" | "GERENTE" | "COLABORADOR" };

export function ModuloEquipe({ perfil }: Props) {
  const [erro, setErro] = useState<string | null>(null);
  if (perfil === "COLABORADOR") return <p>Sem permissao para acessar equipe.</p>;
  return <section className="space-y-4">{/* form + table */}</section>;
}
```

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
- Component pattern: `src/components/modulo-equipe.tsx`
- Data model: `prisma/schema.prisma`
- Tooling: `package.json`, `tsconfig.json`, `eslint.config.mjs`

## Reference
- `.opencode/context/core/context-system/standards/mvi.md`

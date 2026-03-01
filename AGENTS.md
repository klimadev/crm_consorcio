# AGENTS.md — CRM Consórcio

Agentic coding guidelines for this CRM application.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI + class-variance-authority
- **Testing:** Vitest + React Testing Library

## Commands

```bash
# Development
npm run dev                # Start dev server (port 3333)

# Validate (USE LINT FIRST - faster)
npm run lint               # ESLint (FAST - always run this first)
npm run build              # Full build (only when needed)

# Testing
npm run test                           # Run all tests
npm run test -- src/file.test.ts      # Single file
npm run test -- --run -t "test name"  # Single test by name

# Database
npm run seed              # Seed database
npx prisma studio         # Open Prisma GUI
npx prisma db push        # Push schema changes
npx prisma generate       # Regenerate client
```

## Test Credentials

| Email | Password |
|-------|----------|
| liam@gmail.com | lima123 |
| teste1@gmail.com | teste123 |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/           # Auth pages (login, cadastro)
│   ├── (dashboard)/      # Protected pages
│   └── api/              # API routes
├── components/ui/         # Reusable UI components
├── modules/               # Modular architecture
│   ├── equipe/           # Team module (funcionários)
│   ├── kanban/           # Kanban module (leads pipeline)
│   ├── configs/          # Settings module (estágios)
│   └── whatsapp/         # WhatsApp module
│       ├── components/   # UI components
│       ├── hooks/       # Module hooks
│       └── types.ts     # Module types
└── lib/                  # Utilities
```

## Largest Files (Complexity Indicators)

| Lines | File | Purpose |
|-------|------|---------|
| 624 | `automation-form-dialog.tsx` | WhatsApp automation form |
| 594 | `whatsapp-automations.ts` | Automation logic |
| 587 | `use-equipe-module.ts` | Team module hook |
| 511 | `use-kanban-module.ts` | Kanban module hook |
| 449 | `jobs-table.tsx` | WhatsApp jobs/agendamentos |

## Code Style

### Naming Conventions
- **Files:** kebab-case (`modulo-equipe.tsx`)
- **Components:** PascalCase (`ModuloEquipe`)
- **Hooks:** `use-nome-module.ts`
- **Types:** PascalCase (`Lead`, `WhatsappAutomacao`)

### Imports (use @/*)
```tsx
import { Button } from "@/components/ui/button";
import { cn, formataMoeda } from "@/lib/utils";
import type { Lead } from "@/types";
```

### Component Pattern
```tsx
"use client";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export function ModuloExemplo({ perfil }: Props) {
  const [state, setState] = useState("");
  const filtered = useMemo(() => items.filter(i => i.active), [items]);
  return <div className={cn("base", condition && "active")}>{filtered}</div>;
}
```

## Error Handling

```tsx
// API responses - always handle JSON parse errors
const json = await resposta.json().catch(() => ({}));

// Async - always try/catch
try {
  await executarAutomacao(data);
} catch (erro) {
  console.error("Erro ao executar automacao:", erro);
}

// Context - throw if used outside provider
export function useMyContext() {
  const context = useContext(MyContext);
  if (!context) throw new Error("useMyContext must be used within MyProvider");
  return context;
}
```

## Key Patterns

### Synchronous State Sync Bug (AVOID)
```tsx
// WRONG - stale data!
setLeads(newLeads);
sincronizarPendencias();

// CORRECT - use useEffect
useEffect(() => {
  sincronizarPendencias();
}, [leads, estagios]);
```

### Optimistic UI with Rollback
```tsx
const idTemp = `temp-${Date.now()}`;
setItems(prev => [{ ...item, id: idTemp }, ...prev]);
const res = await fetch("/api/items", { method: "POST", body: JSON.stringify(item) });
if (!res.ok) setItems(prev => prev.filter(i => i.id !== idTemp));
```

### Controlled Dialog
```tsx
<Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setErro(null); }}>
```

## Tailwind Classes
```tsx
className="space-y-3"              // vertical spacing
className="flex items-center gap-2" // alignment
className="text-sm text-slate-500"  // secondary text
className={cn("base", condition && "conditional")}
```

## Testing
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("Component", () => {
  it("should render", () => {
    render(<Componente prop="value" />);
    expect(screen.getByText("label")).toBeInTheDocument();
  });
});
```

## Validation Pipeline (ALWAYS RUN)

After ANY code change, run in order:
1. `npm run lint` - Fastest, catch syntax errors
2. `npm run build` - Full type check + build
3. Manual logic review - Verify flows, edge cases

## Critical Rules

1. **Use LINT over BUILD** - `npm run lint` is faster, use always
2. **Verify Consolidation** - After changes, check other parts need updating (hooks, types, API routes)
3. **Rollback on Fail** - Always implement rollback for optimistic updates
4. **Context + useEffect** - For cross-component sync, use Context + useEffect (NOT sync calls)
5. **Event-Driven** - For automations: trigger → find rules → execute action
6. **Multi-tenant** - Always include `id_empresa` in queries for tenant isolation
7. **Never Block** - Never run dev server or processes that require human interaction

## Editing Strategy

1. **Maximum First** - Edit entire files when possible
2. **Multi-file** - Edit all related files in same iteration
3. **Fail Fast** - If lint/build fails, fix all related errors before continuing
4. **Loop** - Repeat validation until passing

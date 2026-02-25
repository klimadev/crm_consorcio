# AGENTS.md — CRM Consórcio

Agentic coding guidelines for this CRM application.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI + class-variance-authority
- **Testing:** Vitest

## Commands

```bash
# Development
npm run dev                # Start dev server

# Validate (USE LINT - faster)
npm run lint              # ESLint (FAST - use this always)
npm run build             # Only when needed

# Testing
npm run test              # Run all tests
npm run test -- src/components/button.test.ts  # Single file
npm run test -- --run -t "test name"           # Single test

# Database
npm run seed              # Seed database
npx prisma studio         # Open Prisma GUI
npx prisma db push        # Push schema changes
npx prisma generate       # Regenerate client
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/           # Auth pages
│   ├── (dashboard)/      # Protected pages
│   └── api/              # API routes
├── components/ui/         # Reusable UI
├── modules/               # Modular architecture
│   ├── equipe/           # Team module
│   ├── kanban/          # Kanban module
│   ├── configs/         # Settings module
│   └── whatsapp/        # WhatsApp module
│       ├── components/  # UI components
│       ├── hooks/       # Module hooks
│       └── types.ts     # Module types
└── lib/                  # Utilities
```

## Code Style

### Naming
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

### Error Handling
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

### Debounce/Autosave
```tsx
const ref = useRef<NodeJS.Timeout>();
const onChange = (val) => {
  setState(val);
  clearTimeout(ref.current);
  ref.current = setTimeout(() => save(val), 1000);
};
useEffect(() => () => ref.current && clearTimeout(ref.current), []);
```

## Tailwind Classes
```tsx
className="space-y-3"              // vertical spacing
className="flex items-center gap-2" // alignment
className="text-sm text-slate-500"  // secondary text
className={cn("base", condition && "conditional")}
```

## Status Badges
```tsx
// Active (green)
<span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Ativo
</span>
// Error (rose)
<span className="...bg-rose-50 text-rose-700 border-rose-100...">Erro</span>
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

## Critical Rules

1. **Use LINT over BUILD** - `npm run lint` is faster, use always
2. **Verify Consolidation** - After changes, check other parts need updating (hooks, types, API routes)
3. **Rollback on Fail** - Always implement rollback for optimistic updates
4. **Context + useEffect** - For cross-component sync, use Context + useEffect (NOT sync calls)
5. **Event-Driven** - For automations: trigger → find rules → execute action
6. **Multi-tenant** - Always include `id_empresa` in queries for tenant isolation

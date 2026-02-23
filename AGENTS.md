# AGENTS.md — CRM Consórcio

Agentic coding guidelines for this CRM application.

## Tech Stack

- **Framework:** Next.js 16 (App Router)  
- **Language:** TypeScript  
- **Database:** Prisma ORM + PostgreSQL  
- **Styling:** Tailwind CSS v4  
- **UI Components:** Radix UI + class-variance-authority  
- **Testing:** Vitest  

## Build, Lint & Test Commands

```bash
# Development
npm run dev                # Start dev server

# Build & Validate
npm run build             # Production build (includes TypeScript)
npm run lint              # ESLint validation

# Testing
npm run test              # Run all tests (Vitest)
npm run test -- --run     # Run tests once (non-watch mode)
npm run test -- src/components/button.test.ts  # Single test file
npm run test -- --run -t "test name"           # Single test by name

# Database
npm run seed              # Seed database
npx prisma studio         # Open Prisma GUI
npx prisma db push        # Push schema changes
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/           # Auth pages
│   ├── (dashboard)/      # Protected pages
│   └── api/              # API routes
├── components/ui/         # Reusable UI components
├── modules/               # Modular architecture
│   ├── equipe/           # Team module
│   ├── kanban/           # Kanban module
│   └── configs/          # Settings module
└── lib/                   # Utilities
```

## Code Style

### File Naming
- **Files:** kebab-case (`modulo-equipe.tsx`, `button.tsx`)
- **Components:** PascalCase (`ModuloEquipe`, `Button`)

### Imports
```tsx
// Use @/* alias
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

### TypeScript
```tsx
type Props = { perfil: "EMPRESA" | "GERENTE" | "COLABORADOR" };
type Lead = { id: string; nome: string };
```

## Key Patterns

### Optimistic UI
```tsx
const idTemp = `temp-${Date.now()}`;
setItems(prev => [{ ...item, id: idTemp }, ...prev]);
const res = await fetch("/api/items", { method: "POST", body: JSON.stringify(item) });
if (!res.ok) setItems(prev => prev.filter(i => i.id !== idTemp)); // rollback
```

### Autosave/Debounce
```tsx
const ref = useRef<NodeJS.Timeout>();
const onChange = (val) => {
  setState(val);
  if (ref.current) clearTimeout(ref.current);
  ref.current = setTimeout(() => save(val), 1000);
};
useEffect(() => () => ref.current && clearTimeout(ref.current), []);
```

### Controlled Dialog
```tsx
<Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setErro(null); }}>
```

### Permission System
```tsx
const podeGerenciar = perfil === "EMPRESA";
const podeInativar = perfil === "EMPRESA" || perfil === "GERENTE";
```

## Tailwind Classes
```tsx
// Standard patterns
className="space-y-3"           // vertical spacing
className="flex items-center gap-2"  // alignment
className="text-sm text-slate-500"   // secondary text
// Conditional
className={cn("base", condition && "conditional")}
```

## Visual Style (2024)

### Module Shell
```tsx
<section className="space-y-5 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
  <header className="flex...rounded-2xl border border-slate-200/60 bg-white px-6 py-5...">
    {/* header content */}
  </header>
  <section className="rounded-2xl border border-slate-200/60 bg-white px-5 py-4...">
    {/* content */}
  </section>
</section>
```

### Status Badges
```tsx
// Active (green)
<span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Ativo
</span>
// Inactive (gray)
<span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Inativo
</span>
```

### Feedback Colors
```tsx
// Error: border-rose-200/60 bg-rose-50/50 text-rose-700
// Success: border-emerald-200/60 bg-emerald-50/50 text-emerald-700
// Warning: border-amber-200/60 bg-amber-50/50 text-amber-800
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

## Key Conventions

1. Use `@/*` imports, kebab-case files, PascalCase components
2. Extract business logic into custom hooks in `src/modules/*/hooks/`
3. Keep page composition thin — only orchestration, no business logic
4. Always validate with `npm run lint` and `npm run build` before committing
5. Implement rollback on API failures for optimistic updates
6. Use controlled Dialog with `open`/`onOpenChange` and cleanup
7. Follow the visual style consistently across all modules

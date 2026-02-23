# AGENTS.md — CRM Consórcio

Agentic coding guidelines for this CRM application.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** Prisma ORM + PostgreSQL
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI (Dialog, Select, etc.) + class-variance-authority
- **Testing:** Vitest
- **Forms:** React Hook Form + Zod

## Build, Lint & Test Commands

```bash
# Development
npm run dev                # Start dev server

# Build & Validate
npm run build             # Production build (includes TypeScript check)
npm run lint              # ESLint validation

# Testing
npm run test              # Run all tests (Vitest)
npm run test -- --run     # Run tests once (non-watch mode)
npm run test -- src/components/button.test.ts  # Run single test file
npm run test -- --run -t "test name"           # Run single test by name
npm run test -- --run --coverage                # With coverage report

# Database
npm run seed              # Seed database with sample data
npx prisma studio         # Open Prisma database GUI
npx prisma db push        # Push schema changes to database
```

## Code Style Guidelines

### File Naming

- **Components:** kebab-case (`modulo-kanban.tsx`, `botao-sair.tsx`)
- **UI Components:** kebab-case (`button.tsx`, `dialog.tsx`)
- **Utilities:** kebab-case (`utils.ts`, `helpers.ts`)

### Component Patterns

```tsx
// Use "use client" for interactive components
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Export named function (PascalCase)
export function ModuloKanban({ perfil, idUsuario }: Props) {
  const [estado, setEstado] = useState<string>("");
  
  // Use useMemo for derived state
  const itensFiltrados = useMemo(() => {
    return itens.filter(item => item.ativa);
  }, [itens]);

  // ...
}
```

### Imports

```tsx
// Use @/* alias for project imports
import { Button } from "@/components/ui/button";
import { cn, formataMoeda } from "@/lib/utils";

// Group imports: external → UI components → project utilities
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Type imports
import type { Lead, Funcionario } from "@/types";
```

### TypeScript

```tsx
// Define types inline for simple types
type Lead = {
  id: string;
  nome: string;
  telefone: string;
};

// Props interface outside component
type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  idUsuario: string;
};

export function Componente({ perfil, idUsuario }: Props) {
  // ...
}
```

### CVA Component Variants

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white hover:bg-slate-700",
        secondary: "bg-slate-100 text-slate-900",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;
```

### Controlled Dialog Pattern

```tsx
// Always use controlled open/onOpenChange
const [dialogAberto, setDialogAberto] = useState(false);

<Dialog
  open={dialogAberto}
  onOpenChange={(aberto) => {
    setDialogAberto(aberto);
    if (!aberto) {
      // Cleanup when closing
      setErro(null);
    }
  }}
>
  <DialogTrigger asChild>
    <Button>Novo Item</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titulo</DialogTitle>
    </DialogHeader>
    {/* Form content */}
  </DialogContent>
</Dialog>
```

### Optimistic UI Pattern

```tsx
// Create temporary ID for optimistic updates
const idTemporario = `temp-${Date.now()}`;
const itemTemporario: Lead = {
  id: idTemporario,
  nome,
  // ...other fields
};

// Add to list immediately
setLeads((atual) => [itemTemporario, ...atual]);

// API call
const resposta = await fetch("/api/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

// Rollback on failure
if (!resposta.ok) {
  setLeads((atual) => atual.filter((item) => item.id !== idTemporario));
  return;
}

// Replace temp with real item
const json = await resposta.json();
if (json.lead) {
  setLeads((atual) =>
    atual.map((item) => (item.id === idTemporario ? json.lead : item)),
  );
}
```

### API Error Handling

```tsx
async function salvarDados() {
  const resposta = await fetch("/api/endpoint", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!resposta.ok) {
    const json = await resposta.json();
    setErro(json.erro ?? "Erro ao salvar.");
    return;
  }

  const json = await resposta.json();
  // Handle success
}
```

### Tailwind Classes

```tsx
// Use consistent spacing and colors
className="space-y-3"           // Vertical spacing in forms
className="flex items-center gap-2"  // Horizontal alignment
className="text-sm text-slate-500"    // Secondary text
className="rounded-md border"         // Standard border

// Conditional classes
className={cn(
  "base-classes",
  condition && "conditional-class",
)}
```

### State Management

- **Local state:** `useState` for component-level state
- **Derived state:** `useMemo` for computed values
- **Effects:** `useEffect` with cleanup function and active flag pattern

```tsx
useEffect(() => {
  let ativo = true;
  
  async function carregar() {
    const dados = await fetch("/api/data");
    if (ativo && dados.ok) {
      setState(await dados.json());
    }
  }
  
  carregar();
  
  return () => {
    ativo = false;
  };
}, []);
```

## Novo Estilo Visual (2024)

O projeto utiliza um estilo visual moderno e consistente baseado no `modulo-equipe`. Todos os novos módulos devem seguir este padrão:

### Estrutura Principal do Módulo

```tsx
// Container principal
<section className="space-y-5 rounded-2xl bg-slate-50/50 p-4 pb-6 md:p-6">
  
  // Header com ícone e título
  <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:flex-row md:items-center md:justify-between">
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
        <Icone className="h-6 w-6 text-slate-600" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Titulo</h1>
        <p className="text-sm text-slate-500">Subtitulo</p>
      </div>
    </div>
  </header>

  // Seções internas
  <section className="rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
    {/* Conteúdo */}
  </section>
</section>
```

### Cards e Itens

```tsx
// Card de item
<article className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
  {/* Conteúdo */}
</article>
```

### Inputs e Selects

```tsx
// Input
<Input 
  className="h-11 rounded-xl border-slate-200 bg-slate-50/80 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200/50" 
/>

// Select
<SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-600">
  <SelectValue placeholder="Selecione..." />
</SelectTrigger>
```

### Botões

```tsx
// Botão primário
<Button className="rounded-xl bg-slate-800 font-medium text-white hover:bg-slate-700">
  Texto
</Button>

// Botão secundário/outline
<Button className="rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
  Texto
</Button>
```

### Badges de Status

```tsx
// Status ativo (verde)
<span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
  Ativo
</span>

// Status inativo (cinza)
<span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
  Inativo
</span>
```

### Cores de Feedback

```tsx
// Erro/Alerta
<div className="rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 text-sm text-rose-700 shadow-sm">
  Mensagem de erro
</div>

// Sucesso
<div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3 text-sm text-emerald-700 shadow-sm">
  Mensagem de sucesso
</div>

// Informativo
<div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 text-sm text-amber-800 shadow-sm">
  Mensagem informativa
</div>
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

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, cadastro)
│   ├── api/               # API routes
│   └── page.tsx          # Dashboard
├── components/
│   ├── modulo-*.tsx       # Feature modules
│   └── ui/                # Reusable UI components
├── lib/
│   └── utils.ts           # Utility functions (cn, formata*, etc.)
└── types/                  # TypeScript types (if needed)
```

## Key Conventions

1. **kebab-case** for file names
2. **PascalCase** for React components
3. Use `@/*` imports (not relative `../../`)
4. Use `cn()` utility for conditional classes
5. Always validate with `npm run lint` and `npm run build` before committing
6. Implement rollback on API failures for optimistic updates
7. Use controlled Dialog components with `open`/`onOpenChange`
8. Follow the new visual style consistently across all modules

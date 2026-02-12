# AGENTS.md - CRM-next Development Guide

This document provides guidelines for AI coding agents working on this CRM project.

## Project Overview

CRM-next is a Next.js 16 CRM application built with React 19.2, TypeScript, and Tailwind CSS. It features a Kanban sales pipeline, dashboard BI, customer management, and Google Gemini AI integration.

## Build & Development Commands

```bash
# Development server (Turbopack enabled)
npm run dev

# Production build (always run before committing)
npm run build

# Linting
npm run lint

# Start production server (after build)
npm run start

# Database operations
npm run db:init      # Initialize database schema
npm run db:seed      # Seed with sample data
npm run db:setup     # Run init + seed
```

## Testing Commands

This project uses Playwright for E2E testing:

```bash
# Run all tests
npx playwright test

# Run single test file
npx playwright test tests/example.spec.ts

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Run tests with specific project (chromium/firefox/webkit)
npx playwright test --project=chromium

# Run tests in UI mode
npx playwright test --ui

# Debug specific test
npx playwright test tests/example.spec.ts --debug
```

## Code Style Guidelines

### Imports
- Use path aliases (`@/components`, `@/context`, `@/types`)
- Group imports: React → external → internal
- Use named imports for clarity
- Import types separately with `import type`

```typescript
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCRM } from '@/context';
import { commercialDashboardApi } from '@/services/api';
import type { CommercialDashboardFilters } from '@/types';
```

### TypeScript
- Enable `strict: true` in tsconfig.json (already configured)
- Use explicit types for props, state, and function parameters
- Avoid `any` - use `unknown` or proper type definitions
- Use `interface` for objects, `type` for unions/primitives
- Export types from `@/types` barrel file

```typescript
interface Props { title: string; onClose: () => void; }
type View = 'dashboard' | 'kanban' | 'sales_engine';
type Role = 'ADMIN' | 'MANAGER' | 'SALES_REP' | 'SUPPORT';
```

### Naming Conventions
- **Components**: PascalCase (`KanbanBoard`, `DealForm`)
- **Files**: camelCase for utilities, PascalCase for components (`.tsx`)
- **Variables/Props**: camelCase (`currentUser`, `isOpen`)
- **Constants**: SCREAMING_SNAKE_CASE for configs, camelCase for others
- **Types/Interfaces**: PascalCase
- **Custom Hooks**: camelCase starting with `use` (`useCRM`, `useCurrentUser`)
- **API routes**: kebab-case folders, route.ts files

### Component Patterns (React 19.2)
- Use `'use client'` directive for client components
- Prefer functional components with hooks over class components
- Destructure props for better readability
- Keep components focused - single responsibility principle
- Use React.FC<Props> for component typing
- **React 19**: Pass `ref` directly as prop instead of using `forwardRef`
- **React 19**: Use `use` hook for async resources when needed
- **React 19**: Use Actions for form submissions (server actions pattern)
- **React 19.2**: Use View Transitions for animated UI updates
- **React 19.2**: Use `useEffectEvent` to extract non-reactive logic from Effects
- **React 19.2**: Use `<Activity/>` for background loading states

```typescript
'use client';

interface Props { 
  title: string; 
  onClose: () => void;
}

export const ComponentName: React.FC<Props> = ({ title, onClose }) => {
  const { data } = useCRM();
  return <div>{title}</div>;
};

// React 19: ref as prop
interface RefProps {
  ref: React.Ref<HTMLDivElement>;
}
```

### Tailwind CSS
- Use consistent color palette (slate for neutrals, semantic colors for states)
- Prefer utility classes over custom CSS
- Group related classes: layout → sizing → styling → interactive
- Use `text-` for text colors, `bg-` for backgrounds
- Extract reusable class combinations to consts

```typescript
className="flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"

const tabButtonClass = (isActive: boolean) =>
  `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
  }`;
```

### Error Handling
- Use optional chaining and nullish coalescing
- Handle async errors with try/catch
- Provide user-friendly error messages
- Log errors appropriately for debugging
- Use early returns for guard clauses

```typescript
const result = data?.items ?? [];

if (!user) {
  return null;
}

try {
  await saveData();
} catch (error) {
  console.error('Save failed:', error);
  // Show user notification
}
```

### State Management
- Use `useState` for local component state
- Use Context API (`CRMContext`, `AuthContext`) for global state
- Use React Query for server state management
- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed as props

### API Routes
- Group related routes under `/api/entities/` or `/api/db/`
- Use standard HTTP methods (GET, POST, PUT, DELETE)
- Return consistent error responses
- Validate input before processing

```typescript
// app/api/entities/customers/route.ts
export async function GET() {
  try {
    const customers = await getCustomers();
    return Response.json(customers);
  } catch (error) {
    return Response.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
```

### Database Operations
- Use better-sqlite3 for database access
- Keep operations in `lib/db/operations.ts`
- Use transactions for multi-step operations
- Sanitize all user inputs

### File Structure
```
src/
├── app/              # Next.js App Router pages
│   ├── api/          # API routes
│   ├── login/        # Auth pages
│   └── init/         # Setup pages
├── components/       # Reusable UI components
│   ├── auth/         # Auth-related components
│   └── index.ts      # Barrel exports
├── context/          # React Context providers
├── constants/        # Static data and configs
├── hooks/            # Custom React hooks
├── lib/              # Utilities and configs
│   ├── auth/         # Auth utilities
│   ├── db/           # Database operations
│   └── prisma/       # Prisma client
├── services/         # External API integrations
└── types/            # TypeScript definitions
    └── db/           # Database types
```

### Git Workflow
- Commit messages follow Conventional Commits format
- Run `npm run build` before committing to ensure no build errors
- Keep commits atomic and focused
- Tag releases with semantic versioning

## Mandatory Context Analysis

### Always Analyze Codebase First
**OBRIGATÓRIO**: Antes de fazer qualquer implementação, correção ou modificação significativa, você DEVE usar `myCodeKit_analyze_codebase` para obter uma visão completa da estrutura do projeto.

```bash
# Execute no início de cada tarefa
myCodeKit_analyze_codebase path="/var/www/crm_consorcio/src"
```

Isso fornecerá:
- Todos os símbolos (funções, classes, interfaces, types)
- Estrutura completa das API routes
- Componentes e suas dependências
- Contextos e hooks disponíveis

### Use Exploration Agents for Complex Tasks
Para tarefas complexas que envolvam múltiplas partes do codebase, delegue para um agente de exploração:

```typescript
// Exemplo de delegação
task(description="Explore deals API", 
     prompt="Analyze all deal-related API routes in app/api/entities/deals and app/api/db/deals. 
     Find all functions, their parameters, and how they handle authentication. 
     Return a summary of the deal CRUD operations.",
     subagent_type="explore")
```

Isso garante que você:
- Não quebre rotas existentes
- Entenda todas as dependências
- Faça implementações perfeitas sem erros
- Encontre padrões existentes para seguir

### Combining Approaches
Para máximo contexto, combine ambas as abordagens:

1. **Análise inicial**: `myCodeKit_analyze_codebase` para visão geral
2. **Exploração específica**: Agente para áreas específicas relacionadas à tarefa
3. **Verificação**:grep/glob para confirmar padrões antes de implementar

## Best Practices - Common AI Agent Pitfalls

### Code Duplication (DRY - Don't Repeat Yourself)
**CRÍTICO**: AI agents frequentemente duplicam código. Sempre procure por funções/hooks/components existentes antes de criar novos.

```typescript
// ❌ ERRADO: Duplicar lógica
const CustomerCard = () => {
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
  // ...
};

// ✅ CERTO: Reutilizar função existente
import { formatDate } from '@/utils/date';
```

### Magic Strings & Numbers
- Nunca use strings ou números hardcoded em código
- Crie constantes em `constants/` ou `lib/config/`
- Use enums para valores fixos

```typescript
// ❌ ERRADO
if (status === 'pending') { ... }

// ✅ CERTO
import { DealStatus } from '@/types';
if (status === DealStatus.PENDING) { ... }
```

### Consistent Patterns
- Sempre siga os padrões existentes no codebase
- Antes de implementar, analise como similar funcionalidade foi feita
- Usegrep para encontrar padrões de código no projeto

### Security Best Practices
- Nunca exponha secrets/keys no código
- Valide todas as inputs de usuário
- Use parameterized queries para DB (não concatenar strings)
- Sanitize dados antes de renderizar

### Edge Cases & Null Handling
- Sempre considere: null, undefined, empty arrays, API failures
- Use optional chaining (`?.`) e nullish coalescing (`??`)
- Não assuma que dados sempre existirão

### Performance Considerations
- Evite funções dentro de render (crie fora ou use useCallback)
- Use React.memo para componentes que renderizam frequentemente
- Não recrie objetos/arrays em cada render
- Use lazy loading para rotas e componentes pesados

### Loading & Error States
- Sempre implemente estados de loading para async operations
- Mostre mensagens de erro amigáveis ao usuário
- Nunca deixe a UI travada sem feedback

### Accessibility (a11y)
- Use elementos semânticos (button, input, etc)
- Inclua aria-labels quando necessário
-garanta contraste de cores

### Refactoring vs New Code
- Antes de adicionar código novo, considere refatorar o existente
- Se algo precisa ser usado em mais de um lugar,抽象 (crie util/hook/component)
- Evite "feature flags" desnecessárias

### Testing
- Não quebre testes existentes
- Se adicionar nova feature, considere adicionar teste E2E
- Teste casos de borda, não só happy path

### Commit & Build
- SEMPRE rode `npm run build` antes de commit
- Certifique-se que lint passa
- Não faça commit de código quebrado

## Important Notes
- **Next.js 16** with Turbopack enabled (default bundler)
- **React 19.2** with automatic JSX runtime
- **React Compiler**: Enable with `reactCompiler: true` in next.config.ts
- TypeScript strict mode enabled (min 5.1)
- Path aliases configured (`@/*` → `./src/*`)
- LocalStorage persistence in CRMContext
- RBAC with ADMIN, MANAGER, SALES_REP, SUPPORT roles
- Google Gemini AI integration for deal analysis
- Authentication uses JWT with jose library (Edge Runtime compatible)
- Database uses SQLite with better-sqlite3
- **Middleware**: Use `proxy.ts` instead of `middleware.ts`

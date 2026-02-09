# AGENTS.md - CRM-next Development Guide

This document provides guidelines for AI coding agents working on this CRM project.

## Project Overview

CRM-next is a Next.js 16 CRM application built with React 19, TypeScript, and Tailwind CSS. It features a Kanban sales pipeline, dashboard BI, customer management, and Google Gemini AI integration.

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

### Component Patterns
- Use `'use client'` directive for client components
- Prefer functional components with hooks over class components
- Destructure props for better readability
- Keep components focused - single responsibility principle
- Use React.FC<Props> for component typing

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

### Important Notes
- Next.js 16 with Turbopack enabled
- React 19 with automatic JSX runtime
- TypeScript strict mode enabled
- Path aliases configured (`@/*` → `./src/*`)
- LocalStorage persistence in CRMContext
- RBAC with ADMIN, MANAGER, SALES_REP, SUPPORT roles
- Google Gemini AI integration for deal analysis
- Authentication uses JWT with jose library (Edge Runtime compatible)
- Database uses SQLite with better-sqlite3

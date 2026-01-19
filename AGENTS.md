# AGENTS.md - CRM-next Development Guide

This document provides guidelines for AI coding agents working on this CRM project.

## Project Overview

CRM-next is a Next.js 16 CRM application built with React 19, TypeScript, and Tailwind CSS. It features a Kanban sales pipeline, dashboard BI, customer management, and Google Gemini AI integration.

## Build & Development Commands

```bash
# Development server
npm run dev

# Production build (always run before committing)
npm run build

# Linting
npm run lint

# Start production server (after build)
npm run start
```

## Code Style Guidelines

### Imports
- Use path aliases (`@/components`, `@/context`, `@/types`)
- Group imports: React → external → internal
- Use named imports for clarity
```typescript
import React, { useState, useEffect } from 'react';
import { useCRM } from '@/context';
import { KanbanBoard, DashboardBI } from '@/components';
```

### TypeScript
- Enable `strict: true` in tsconfig.json
- Use explicit types for props, state, and function parameters
- Avoid `any` - use `unknown` or proper type definitions
- Use `interface` for objects, `type` for unions/primitives
```typescript
interface Props { title: string; onClose: () => void; }
type View = 'dashboard' | 'kanban' | 'sales_engine';
```

### Naming Conventions
- **Components**: PascalCase (`KanbanBoard`, `DealForm`)
- **Files**: camelCase for utilities, PascalCase for components (`.tsx`)
- **Variables/Props**: camelCase (`currentUser`, `isOpen`)
- **Constants**: SCREAMING_SNAKE_CASE for configs, camelCase for others
- **Types/Interfaces**: PascalCase
- **Custom Hooks**: camelCase starting with `use` (`useCRM`)

### Component Patterns
- Use `'use client'` directive for client components
- Prefer functional components with hooks over class components
- Destructure props for better readability
- Keep components focused - single responsibility principle
```typescript
'use client';
export const ComponentName: React.FC<Props> = ({ title }) => {
  const { data } = useCRM();
  return <div>{title}</div>;
};
```

### Tailwind CSS
- Use consistent color palette (slate for neutrals, semantic colors for states)
- Prefer utility classes over custom CSS
- Group related classes (layout → sizing → styling → interactive)
- Use `text-` for text colors, `bg-` for backgrounds
```typescript
className="flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
```

### Error Handling
- Use optional chaining and nullish coalescing
- Handle async errors with try/catch
- Provide user-friendly error messages
- Log errors appropriately for debugging
```typescript
const result = data?.items ?? [];
try {
  await saveData();
} catch (error) {
  console.error('Save failed:', error);
  // Show user notification
}
```

### State Management
- Use `useState` for local component state
- Use Context API (`CRMContext`) for global state
- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed as props

### File Structure
```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable UI components
├── context/          # React Context providers
├── constants/        # Static data and configs
├── services/         # External API integrations
└── types/            # TypeScript type definitions
```

### Git Workflow
- Commit messages follow Conventional Commits format
- Run `npm run build` before committing to ensure no build errors
- Keep commits atomic and focused

### Testing Notes
- This project does not currently have test files configured
- If adding tests, use Vitest or Jest with React Testing Library
- Run single test files with: `npm test -- <test-file>`

### Important Notes
- Next.js 16 with Turbopack enabled
- React 19 with automatic JSX runtime
- LocalStorage persistence in CRMContext
- RBAC with ADMIN, MANAGER, SALES_REP, SUPPORT roles
- Google Gemini AI integration for deal analysis

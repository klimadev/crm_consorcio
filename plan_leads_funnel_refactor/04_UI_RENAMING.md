# 04 — UI Renaming: "Kanban" → "Leads"

> Every user-visible occurrence of "Kanban" in the UI must be renamed to "Leads".
> Internal code (type names, function names, file names) may stay for now to minimize refactor scope, but **all user-facing text** must change.

---

## Complete Checklist

### 1. Sidebar Navigation Label

**File**: `src/components/sidebar-principal.tsx` (line 91)

```diff
- { href: "/kanban", label: "Kanban", icon: LayoutGrid, tourTarget: TOUR_TARGETS.sidebarKanban },
+ { href: "/kanban", label: "Leads", icon: LayoutGrid, tourTarget: TOUR_TARGETS.sidebarKanban },
```

> The URL route `/kanban` stays to avoid breaking bookmarks/links. Only the **label** changes.

---

### 2. Page Header Title

**File**: `src/modules/kanban/components/kanban-header.tsx` (line 115)

```diff
- <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Kanban</h1>
- <p className="text-sm text-slate-500">Funil de vendas com arrastar e soltar.</p>
+ <h1 className="text-xl font-bold text-slate-800 md:text-2xl">Leads</h1>
+ <p className="text-sm text-slate-500">Gestão de leads com arrastar e soltar.</p>
```

---

### 3. Onboarding Tour Step Title

**File**: `src/modules/onboarding/steps/onboarding-kanban.steps.ts` (line 10-11)

```diff
-    title: "Kanban",
-    content: "Gerencie sua pipeline de vendas com drag-and-drop. Acompanhe pendencias (leads estagnados, documentos faltando) e receba alertas.",
+    title: "Leads",
+    content: "Gerencie sua pipeline de leads com drag-and-drop. Acompanhe pendências, documentos e aprovações, e receba alertas.",
```

---

### 4. Tour Target Constants

**File**: `src/modules/onboarding/lib/selectors.ts`

The tour targets use `sidebarKanban` as an internal identifier. These are **not user-visible** (they are `data-tour` attributes). You can optionally rename for consistency but it's not required for user-facing changes:

```diff
 export const TOUR_TARGETS = {
   sidebarResumo: "sidebar-resumo",
-  sidebarKanban: "sidebar-kanban",
+  sidebarKanban: "sidebar-leads",   // Optional rename
   sidebarEquipe: "sidebar-equipe",
   sidebarWhatsapp: "sidebar-whatsapp",
   sidebarConfigs: "sidebar-configs",
 } as const;
```

If renamed, also update:
- `sidebar-principal.tsx` — the `tourTarget` property already uses the constant, so no manual change needed
- `onboarding-kanban.steps.ts` — the `id` field:

```diff
-    id: "sidebar-kanban",
+    id: "sidebar-leads",
```

---

### 5. Browser Tab Title (Optional)

**File**: `src/app/(dashboard)/kanban/page.tsx`

Currently has no `metadata` export. Consider adding:

```typescript
export const metadata = {
  title: "Leads | CRM Consórcio",
};
```

Or in `layout.tsx` if a shared layout exists.

---

## Summary of Changes

| Location | Current Text | New Text |
|---|---|---|
| Sidebar label | "Kanban" | "Leads" |
| Page header `<h1>` | "Kanban" | "Leads" |
| Page header subtitle | "Funil de vendas com arrastar e soltar." | "Gestão de leads com arrastar e soltar." |
| Onboarding tour title | "Kanban" | "Leads" |
| Onboarding tour content | "...pipeline de vendas..." | "...pipeline de leads..." |
| Tour step id | "sidebar-kanban" | "sidebar-leads" (optional) |
| Tour target | "sidebar-kanban" | "sidebar-leads" (optional) |

### What Stays as "Kanban" (Internal Only)

These are **internal code identifiers** not visible to users:

- Folder `src/modules/kanban/` — stays (rename is optional, large refactor)
- File names: `kanban-board.tsx`, `kanban-header.tsx`, etc. — stay
- TypeScript types: `KanbanFilters`, `KanbanBoardProps`, etc. — stay
- Component names: `KanbanBoard`, `KanbanHeader`, etc. — stay
- Hook: `useKanbanModule` — stays
- Export: `ModuloKanban` — stays
- URL route: `/kanban` — stays to avoid link breakage

> **Rationale**: Renaming internal identifiers is safe but creates a massive diff with no user-facing benefit. It can be done as a separate, follow-up refactor if desired.

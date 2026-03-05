# UI Consolidation Plan

## Objective
- Eliminate repeated layout/header/alert boilerplate without flattening module identity.
- Keep module-specific visual accents and interactions.

## 1) Universal `ModulePageHeader`

### 1.1 New component
- Path: `src/components/shared/module-page-header.tsx`
- Props (suggested):
  - `title: string`
  - `subtitle?: string`
  - `icon: ReactNode`
  - `iconTone?: "slate" | "emerald" | "blue" | "amber" | "rose"`
  - `badges?: ReactNode[]`
  - `actions?: ReactNode`
  - `children?: ReactNode` (optional secondary controls row)

### 1.2 Replace usages
- `src/modules/configs/components/configs-header.tsx` -> replace entirely.
- `src/modules/whatsapp/components/whatsapp-header.tsx` -> replace entirely.
- `src/modules/kanban/components/kanban-header.tsx` -> keep controls, replace shell/title block.

### 1.3 Design parity rule
- Keep each module accent:
  - Configs: neutral/slate.
  - WhatsApp: emerald emphasis.
  - Kanban: neutral with operational controls.

## 2) Shared `ModulePageShell`

### 2.1 New component
- Path: `src/components/shared/module-page-shell.tsx`
- Purpose: normalize repeated section wrappers and spacing logic.
- Props:
  - `children`
  - `spacing?: "md" | "lg"`
  - `className?: string`

### 2.2 Replace usages
- `src/modules/configs/page.tsx`
- `src/modules/kanban/page.tsx`
- `src/modules/whatsapp/page.tsx`
- optionally `src/modules/equipe/page.tsx` (custom bottom spacing still allowed).

## 3) Shared `InlineStatusAlert`

### 3.1 New component
- Path: `src/components/shared/inline-status-alert.tsx`
- Props:
  - `variant: "error" | "success" | "warning" | "info"`
  - `message: string`
  - `icon?: ReactNode`
  - `className?: string`

### 3.2 Replace duplicated blocks
- `src/modules/configs/components/configs-error-alert.tsx` (remove file after migration)
- inline blocks in:
  - `src/modules/equipe/page.tsx`
  - `src/modules/whatsapp/page.tsx`

## 4) `AccessDeniedCard` (optional but recommended)

### 4.1 New component
- Path: `src/components/shared/access-denied-card.tsx`
- Unify repeated restricted access sections.

### 4.2 Candidates
- `src/modules/equipe/page.tsx` collaborator restricted section.
- `src/app/(dashboard)/whatsapp/page.tsx` restricted section.
- `src/app/(dashboard)/configs/page.tsx` restricted section.

## 5) Kanban header decomposition

### 5.1 Current issue
- `kanban-header.tsx` is large due to mixed concerns: title area, search shortcuts, filters, notification toggles, sync, and create-lead dialog.

### 5.2 Split proposal
- `kanban-header.tsx` (container orchestrator)
- `kanban-header-controls.tsx` (search, order, filters, toggles)
- `kanban-create-lead-dialog.tsx` (dialog only)
- `kanban-whatsapp-sync-button.tsx` (sync action only)

### 5.3 Benefits
- Better readability.
- Easier incremental testing.
- Lower token impact in one file.

## 6) Implementation sequence
1. Create shared components in `src/components/shared`.
2. Migrate `configs` and `whatsapp` headers first.
3. Migrate inline error alerts.
4. Migrate kanban header shell, then split controls/dialog.
5. Delete obsolete per-module header/alert files.

## 7) Validation checklist
- Header visual hierarchy unchanged per module.
- Spacing and responsive breakpoints preserved.
- All action buttons remain functional.
- No style regression in mobile drawer/dialog overlays.

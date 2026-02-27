# Prompt for AI Implementation

Use this exact brief to implement a production-ready onboarding tour.

## Context

- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4.
- Existing repo root: `/var/www/crm_consorcio_final`.
- Follow project conventions from `AGENTS.md`.
- Tour scope (V1): global provider + first sidebar module.

## Requirements

1. Build a hydration-safe onboarding guided tour in client-only architecture.
2. Use `react-joyride` (or equivalent robust React 19-compatible library if peer issues block safe install).
3. Never target steps by IDs or classes. Only data attributes, e.g. `data-tour="sidebar-module-1"`.
4. Implement 2 steps:
   - Step 1: centered welcome modal (no specific target element).
   - Step 2: highlight sidebar first module using selector `[data-tour="sidebar-module-1"]` with `spotlightClicks: true`.
5. Tooltip UI must be premium and non-intrusive:
   - Card: `rounded-2xl`, white background, dark slate text, `shadow-2xl`.
   - Backdrop: soft dark tint + blur (`backdrop-blur-sm` equivalent).
   - Content stack: title (`text-lg font-semibold`), description (`text-sm text-slate-600`), footer row.
   - Footer: progress (e.g., `1/2`), left ghost `Skip Tour`, right primary Indigo CTA (`rounded-lg`, hover/active transitions).
6. Use `next/dynamic` with `ssr: false` so tour runtime is lazy-loaded only when needed.
7. Track completion in localStorage; users who finished/skipped should not auto-run again and should not load tour chunk.
8. Implement robust callback/state handling for next/prev/skip/finish/close/target-not-found.
9. Design for scale: easy to add future tour bundles (sidebar, modals, pages) without rewriting core.

## Architectural Target

Create module structure:

```txt
src/modules/onboarding/
  components/
    onboarding-tour-gate.tsx
    onboarding-tour-runner.tsx
    onboarding-tooltip.tsx
  providers/
    onboarding-tour-provider.tsx
  steps/
    dashboard-initial.steps.ts
  lib/
    storage.ts
    selectors.ts
    lifecycle.ts
  types.ts
```

Integrate via:

- `src/components/providers-wrapper.tsx` (mount provider)
- `src/components/sidebar-principal.tsx` (add `data-tour="sidebar-module-1"`)

## Implementation Rules

1. Keep all tour logic in Client Components (`"use client"`).
2. Never read localStorage during render; read it in `useEffect`.
3. Add idempotent initialization guards for React StrictMode.
4. Use controlled tour state (`run`, `stepIndex`) instead of fragile uncontrolled behavior.
5. Handle missing target gracefully (`TARGET_NOT_FOUND` fallback).
6. Ensure z-index/portal compatibility with existing dialogs.
7. Respect reduced motion where applicable.

## Acceptance Criteria

1. Tour starts on first eligible dashboard load only.
2. Step 1 appears centered; Step 2 highlights sidebar module 1.
3. Spotlight click-through works on Step 2.
4. Skip and finish persist completion.
5. Returning users do not load tour JS chunk.
6. No hydration warnings.
7. No class/id selectors in step targeting.
8. `npm run lint` passes.
9. `npm run build` passes.

## Validation to run

1. `npm run lint`
2. `npm run build`
3. Manual QA for:
   - first run,
   - skip/finish persistence,
   - refresh behavior,
   - missing target fallback,
   - mobile/desktop sidebar behavior,
   - no overlay lock/stuck tooltip.

## Deliverables

1. All new onboarding module files.
2. Integration changes in provider wrapper + sidebar item.
3. Short summary of architecture and callback flow.
4. Validation output summary with pass/fail and fixes.

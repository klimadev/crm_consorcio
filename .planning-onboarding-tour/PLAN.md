# Onboarding Guided Tour Plan (Next.js 16 + React 19)

## 1) Goal and Scope

Build a premium, non-intrusive, hydration-safe onboarding tour for the dashboard, starting with:

1. Global client-side provider/gate.
2. First sidebar module target (`data-tour="sidebar-module-1"`).
3. Two steps only in V1:
   - Step 1: centered welcome modal (no element target).
   - Step 2: spotlight sidebar item with click-through (`spotlightClicks: true`).

This plan prioritizes scalability for future sidebar steps and modal tours without fragile selectors.

---

## 2) Compatibility Research Summary

### Library compatibility

- `react-joyride@2.9.3` works functionally for required features but currently declares React peer range up to `18`.
- Repository uses React `19.2.3` + Next `16.1.6`.
- Risk: peer-dependency warnings (or strict install failures) and potential edge regressions.

### Recommendation

- Primary path (requested): use `react-joyride`, but treat as **controlled-risk** dependency.
- Safer alternative if policy requires explicit React 19 support: `@reactour/tour`.

### Next.js 16 App Router constraints

- Tour runner must be in a Client Component (`"use client"`).
- Use `next/dynamic(..., { ssr: false })` only inside client boundary.
- Local storage checks must run in `useEffect` (never during initial render) to avoid hydration mismatch.

---

## 3) Non-Negotiable Requirements

1. **Selector policy**: no CSS class names or IDs for targeting tour steps.
2. **Only explicit data attributes**: `data-tour="..."`.
3. **Hydration safety**: first paint must not diverge server/client due to localStorage reads.
4. **Progressive loading**: do not load tour runtime for users who already completed tour.
5. **Premium UX**: tooltip, backdrop, controls, and motion as specified.
6. **Non-intrusive behavior**: clear skip option, no repetitive prompting.

---

## 4) Proposed Architecture

## Folder structure (new module)

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

## Integration points

- Mount provider in `src/components/providers-wrapper.tsx`.
- Ensure V1 target exists in `src/components/sidebar-principal.tsx`.
- Keep provider persistent under dashboard shell in `src/app/(dashboard)/layout.tsx` flow.

---

## 5) Step-by-Step Implementation Plan

## Phase 0 - Dependency Decision (Joyride vs Alternative)

1. Confirm org tolerance for Joyride React 19 peer mismatch.
2. If accepted: pin Joyride version and document risk.
3. If rejected: switch to React 19-compatible equivalent with same API contract in internal wrapper.

**Acceptance criteria**
- Dependency choice is documented with rationale.
- Internal API hides vendor differences.

## Phase 1 - Target Contract Hardening

1. Add `data-tour="sidebar-module-1"` to first sidebar module interactive element.
2. Ensure only one visible matching node at runtime (desktop/mobile duplication guard).
3. Add helper constants for selectors in `selectors.ts`.

**Acceptance criteria**
- Query selector returns exactly one visible target in dashboard context.
- No ID/class-based targeting in steps.

## Phase 2 - Client-Only Gate + Dynamic Loading

1. Create `onboarding-tour-gate.tsx` (`"use client"`).
2. On mount, read localStorage completion key/version.
3. If completed: render `null` and never import runner.
4. If not completed: dynamically import runner via `next/dynamic` with `ssr: false`.
5. Add init idempotency guard for StrictMode double-invocation.

**Acceptance criteria**
- No hydration warnings.
- Returning users do not download tour runtime chunk.

## Phase 3 - Runner State Machine (Controlled Mode)

1. Define V1 step set in `dashboard-initial.steps.ts`.
2. Use controlled state:
   - `run: boolean`
   - `stepIndex: number`
3. Implement callback handling:
   - `EVENTS.STEP_AFTER`: advance/rewind based on `ACTIONS.NEXT/PREV`.
   - `EVENTS.TARGET_NOT_FOUND`: bounded retry then skip/finish gracefully.
   - `STATUS.FINISHED` and `STATUS.SKIPPED`: persist and stop.
   - Close behavior: treat as skip + persist to avoid annoyance.
4. Enable `spotlightClicks: true` globally or per step 2.

**Acceptance criteria**
- Flow works: welcome -> sidebar highlight -> finish/skip persistence.
- Missing target never crashes UI.

## Phase 4 - Premium Tooltip + Overlay Styling

1. Build custom tooltip component (`onboarding-tooltip.tsx`) for exact layout control.
2. Enforce visual tokens:
   - Container: `rounded-2xl bg-white text-slate-900 shadow-2xl`.
   - Title: `text-lg font-semibold`.
   - Description: `text-sm text-slate-600`.
   - Footer row with progress (`1/2`), left ghost skip button, right Indigo CTA (`rounded-lg`).
3. Overlay/backdrop style:
   - Slight dark tint.
   - `backdrop-blur-sm` equivalent via inline style/backdrop filter.
4. Fine-tune spacing, transitions, and button states (hover/active).

**Acceptance criteria**
- Tooltip and backdrop match spec visually.
- Interactions remain non-intrusive and clear.

## Phase 5 - Provider Wiring and Registry for Scale

1. Create provider orchestrator with extensible registry (tour key -> steps bundle).
2. Start with `dashboard-initial` bundle.
3. Expose API for future modules/modals:
   - `startTour(key)`
   - `resetTour(key)` (optional admin/dev)
   - `isTourCompleted(key)`

**Acceptance criteria**
- New tours can be added via bundle file, without modifying runner core.

## Phase 6 - Validation Pipeline and QA

1. Run `npm run lint`.
2. Run `npm run build`.
3. Manual logical review and QA matrix (below).

**Acceptance criteria**
- Lint/build pass.
- QA scenarios pass without hydration issues or stuck overlays.

---

## 6) Step Definition Contract (V1)

Use a typed contract so future AI implementations remain deterministic.

```ts
type TourStep = {
  id: string;
  target: string;          // CSS selector, must be data-tour based or "body"
  placement: "center" | "bottom" | "right" | "left" | "top" | "auto";
  title: string;
  content: string;
  disableBeacon?: boolean;
  spotlightClicks?: boolean;
  offset?: number;
};
```

V1 instances:

1. `welcome`
   - `target: "body"`
   - `placement: "center"`
   - `disableBeacon: true`
2. `sidebar-module-1`
   - `target: '[data-tour="sidebar-module-1"]'`
   - `spotlightClicks: true`

---

## 7) Storage and Versioning Strategy

Use versioned keys to allow future replay when onboarding changes:

`crm:onboarding:v1:{tenantId}:{userId}:dashboard-initial = "completed"`

Rules:

1. Only mark complete on finished/skip/close decision.
2. Bump `v1 -> v2` when major steps change.
3. Tenant/user-scoped keys preserve multi-tenant isolation.

---

## 8) Hydration and Concurrency Safety Checklist

1. Never read localStorage during render.
2. Gate rendering with mounted flag from `useEffect`.
3. Make initialization idempotent for React StrictMode.
4. Keep runner unmounted when not needed to avoid stale portals.
5. Guard against missing targets with retries + graceful fallback.

---

## 9) UX and Accessibility Rules

1. Keep skip action always visible.
2. Avoid trapping users in long sequences.
3. Keyboard support:
   - ESC closes/skips (if product allows).
   - Focus order predictable in footer controls.
4. Respect `prefers-reduced-motion` for transitions.
5. Ensure contrast and readable text hierarchy.

---

## 10) Edge Cases and Mitigations

1. **Hidden duplicate target nodes** (responsive sidebar):
   - Ensure selector points to visible active instance only.
2. **Route changes mid-tour**:
   - Stop tour cleanly or relocate step if still valid.
3. **Dialog/portal z-index conflicts**:
   - Set explicit z-index policy above app shell overlays.
4. **Slow mount of sidebar**:
   - Retry target discovery before skipping.
5. **Returning users**:
   - Skip dynamic import entirely when completed.

---

## 11) QA Matrix (Manual)

1. First dashboard visit -> Step 1 shows centered.
2. Next -> Step 2 highlights first sidebar item.
3. Step 2 spotlight allows click-through to sidebar item.
4. Skip at any step persists completion.
5. Finish persists completion.
6. Refresh after completion -> no auto tour, no extra chunk load.
7. Missing target path -> no crash, graceful complete/skip.
8. Mobile and desktop both maintain correct target behavior.
9. No hydration warnings in console.
10. Tooltip/backdrop visual spec matches premium criteria.

---

## 12) Deliverable Definition for AI Implementation

Implementation is considered complete only when all of the following are true:

1. Provider + gate + runner + tooltip architecture exists and is modular.
2. V1 two-step tour works exactly as specified.
3. All selectors are data-attribute based.
4. Returning users do not load tour JS after completion.
5. `npm run lint` and `npm run build` pass.
6. Manual QA matrix passes.

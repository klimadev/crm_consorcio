# 05 — Visual Cues: Pulsating Circles, Column Tints & Emoji Indicators

> Affects: `src/modules/kanban/components/kanban-board.tsx`, `src/modules/kanban/components/lead-details-drawer.tsx`, Tailwind config (if custom animations needed)

---

## 1. Lead Card Status Indicators

Each lead card on the board should display a **pulsating circle** in the top-right corner that communicates its status **instantly**, without clicking.

### Status Matrix

| Condition | Circle Color | Animation | Border | Extra |
|---|---|---|---|---|
| In "Pré Aprovação" + **no** contract | 🔴 Red | `animate-pulse` | `border-red-300` | — |
| In "Pré Aprovação" + contract + **not approved** | 🟡 Amber | `animate-pulse` | `border-amber-300` | — |
| In "Pré Aprovação" + contract + **approved** | 🟢 Green | `animate-pulse` | `border-green-300` | — |
| In "Fechado" or "Pós Vendas" | 🟢 Green | `animate-pulse` | `border-green-200` | 🎉 emoji |
| In "Perdido" | ⚫ Slate | none | `border-slate-300` | — |
| All other stages (normal) | — | — | Default | — |

---

## 2. Implementation in `kanban-board.tsx`

### Helper Function

Add a helper to determine the visual cue for a lead based on its stage:

```tsx
type LeadVisualCue = {
  circle: string | null;       // Tailwind classes for the pulsating circle
  border: string | null;       // Tailwind border class for the card
  emoji: string | null;        // Emoji to display next to value
  columnTint: string | null;   // Column background tint
};

function getLeadVisualCue(
  lead: Lead,
  estagio: Estagio
): LeadVisualCue {
  const defaultCue: LeadVisualCue = {
    circle: null,
    border: null,
    emoji: null,
    columnTint: null,
  };

  // "Pré Aprovação" stage logic
  if (estagio.nome === "Pré Aprovação") {
    if (!lead.documento_aprovacao_url) {
      return {
        circle: "h-3 w-3 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
        border: "border-red-300 bg-red-50/30",
        emoji: null,
        columnTint: null,
      };
    }
    if (!lead.aprovado_em) {
      return {
        circle: "h-3 w-3 animate-pulse rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
        border: "border-amber-300 bg-amber-50/30",
        emoji: null,
        columnTint: null,
      };
    }
    // Approved but still in Pré Aprovação (ready to move)
    return {
      circle: "h-3 w-3 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]",
      border: "border-green-300 bg-green-50/30",
      emoji: "✅",
      columnTint: null,
    };
  }

  // "Fechado" or "Pós Vendas" stages
  if (estagio.tipo === "GANHO") {
    return {
      circle: "h-3 w-3 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]",
      border: "border-green-200",
      emoji: estagio.nome === "Fechado" ? "🎉" : "🤝",
      columnTint: null,
    };
  }

  // "Perdido"
  if (estagio.tipo === "PERDIDO") {
    return {
      circle: "h-2.5 w-2.5 rounded-full bg-slate-400",
      border: "border-slate-300 opacity-60",
      emoji: null,
      columnTint: null,
    };
  }

  return defaultCue;
}
```

### Rendering the Circle

Inside the lead card's `<CardContent>`, add the circle in the top-right:

```tsx
<CardContent className="p-3">
  <div className="flex items-start justify-between">
    <div>
      {/* ... existing lead info ... */}
      <p className="mt-1 text-sm font-medium text-slate-700">
        {formataMoeda(lead.valor_consorcio)}
        {visualCue.emoji && (
          <span className="ml-1">{visualCue.emoji}</span>
        )}
      </p>
    </div>
    <div className="flex flex-col items-end gap-1.5">
      {/* NEW: Pulsating status circle */}
      {visualCue.circle && (
        <span className={visualCue.circle} />
      )}
      {/* Existing pendency badge */}
      {pendenciaBadge}
    </div>
  </div>
</CardContent>
```

### Card Border Class

Merge the visual cue border with existing border logic:

```tsx
<Card
  className={cn(
    "cursor-pointer rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md",
    visualCue.border || "border-slate-200/60",
    getClasseBordaGravidade(pendenciasPorLead[lead.id]?.gravidadeMaxima)
  )}
>
```

---

## 3. Column Background Tints

Each column should have a faint tint based on stage type.

### Column Tint Helper

```tsx
function getColumnTint(estagio: Estagio): string {
  switch (estagio.tipo) {
    case "GANHO":
      return "bg-gradient-to-b from-green-50/80 to-white";
    case "PERDIDO":
      return "bg-gradient-to-b from-slate-100/80 to-white";
    default:
      // ABERTO stages
      if (estagio.nome === "Pré Aprovação") {
        return "bg-gradient-to-b from-amber-50/60 to-white";
      }
      return "bg-white";
  }
}
```

### Apply to Droppable Column

```diff
 <div
   className={cn(
-    "rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200",
+    "rounded-2xl border border-slate-200/60 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200",
+    getColumnTint(estagio),
     snapshot.isDraggingOver && "border-blue-300 bg-blue-50/50"
   )}
 >
```

---

## 4. Column Header Enhancement

Add a small colored indicator dot next to the column name:

```tsx
<div className="mb-3 flex items-center gap-2">
  {/* Stage type indicator dot */}
  <span className={cn(
    "h-2 w-2 rounded-full",
    estagio.tipo === "GANHO" && "bg-green-500",
    estagio.tipo === "PERDIDO" && "bg-slate-400",
    estagio.tipo === "ABERTO" && estagio.nome === "Pré Aprovação" && "bg-amber-400",
    estagio.tipo === "ABERTO" && estagio.nome !== "Pré Aprovação" && "bg-blue-400",
  )} />
  <p className="text-sm font-semibold text-slate-700">
    {estagio.nome}{" "}
    <span className="font-normal text-slate-400">({leads.length})</span>
  </p>
</div>
```

---

## 5. Custom CSS Animation (Optional Enhancement)

If Tailwind's built-in `animate-pulse` is too subtle, add a custom glow animation in `index.css` or `globals.css`:

```css
@keyframes status-glow {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 4px currentColor;
  }
  50% {
    opacity: 0.5;
    box-shadow: 0 0 12px currentColor;
  }
}

.animate-status-glow {
  animation: status-glow 2s ease-in-out infinite;
}
```

Then use `animate-status-glow` instead of `animate-pulse` for the status circles.

---

## 6. "Aguardando Aprovação" Badge in Card

For leads in "Pré Aprovação" that have a contract but await approval, show a small text badge:

```tsx
{estagio.nome === "Pré Aprovação" && lead.documento_aprovacao_url && !lead.aprovado_em && (
  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
    ⏳ Aguardando Aprovação
  </span>
)}
```

---

## 7. "Perdido" Column Styling

Leads in "Perdido" should appear visually muted:

```tsx
{estagio.tipo === "PERDIDO" && (
  // Apply opacity and grayscale to the card
  <Card className="... opacity-60 grayscale-[20%]">
)}
```

---

## 8. Data Flow Considerations

The `KanbanBoard` component currently does NOT receive the full `Estagio` object for each lead — it only iterates over `estagios`. The visual cue helper needs both the `lead` and the `estagio`. Since we already iterate `estagios.map(estagio => ...)` and then `leads.map(lead => ...)`, we can call `getLeadVisualCue(lead, estagio)` inside the inner loop where both are in scope. ✅

The `Lead` type needs `aprovado_em` and `aprovado_por` (from Schema Changes doc). The API already returns the full lead object, so these fields will be serialized automatically once the schema is migrated. ✅

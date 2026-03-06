# 06 — UI Components

## A. LeadParcelasTab (Drawer Tab)

### File: `src/modules/kanban/components/lead-parcelas-tab.tsx` (~280 lines)

This is the extracted component that lives **inside the Lead Details Drawer** as the 3rd tab.

### Props

```ts
type LeadParcelasTabProps = {
  leadId: string
}
```

### Component Structure

```
<LeadParcelasTab>
  ├─ useLeadParcelas(leadId)
  │
  ├─ [Empty State] if !temParcelas && !loading
  │   ├─ Heading: "Gerar Plano de Pagamento"
  │   ├─ Input: "Valor da Parcela" (masked BRL via aplicaMascaraMoedaBr)
  │   ├─ Input: "Quantidade de Parcelas" (number, type="number")
  │   ├─ Input: "Data do 1º Vencimento" (type="date")
  │   └─ Button: "Gerar Plano de Pagamento" (bg-emerald-600 text-white)
  │
  ├─ [Loading State] Loader2 spinner
  │
  └─ [List State] if temParcelas
      └─ Scrollable list of <ParcelaCard> items
```

### ParcelaCard (inline sub-component, ~60 lines)

Each installment card renders inside the list:

```
┌─────────────────────────────────────────────────┐
│  Parcela 5/60          R$ 1.500,00      [Badge] │
│  10/04/2026            ─────────────    PENDENTE │
│                                                 │
│  [Hover: "Marcar como Pago" button appears]     │
└─────────────────────────────────────────────────┘
```

#### Card UI Details

```tsx
<div className="group relative rounded-xl border border-slate-200 bg-white p-4 
  hover:shadow-md transition-all duration-200">
  <div className="flex items-center justify-between">
    {/* Left */}
    <div>
      <span className="text-sm font-semibold text-slate-800">
        Parcela {parcela.numero_parcela}/{parcela.quantidade_total}
      </span>
      <p className="text-xs text-slate-500">
        {formataData(parcela.data_vencimento)}
      </p>
    </div>

    {/* Middle */}
    <span className="text-sm font-bold text-slate-800">
      {formataMoeda(parcela.valor)}
    </span>

    {/* Right: Status Badge */}
    <StatusBadgeParcela status={parcela.status} />
  </div>

  {/* Hover action: only for PENDENTE and ATRASADO */}
  {parcela.status !== 'PAGO' && (
    <div className="absolute inset-0 flex items-center justify-end pr-4 
      opacity-0 group-hover:opacity-100 transition-opacity">
      <PayParcelaPopover
        onConfirm={(dataPagamento) => onPagar(parcela.id, dataPagamento)}
        pagando={pagando === parcela.id}
      />
    </div>
  )}
</div>
```

#### Status Badge Logic

```tsx
function StatusBadgeParcela({ status }: { status: string }) {
  const config = {
    PAGO:     { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Pago' },
    ATRASADO: { bg: 'bg-rose-100',    text: 'text-rose-700',    label: 'Atrasado' },
    PENDENTE: { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Pendente' },
  }[status] ?? { bg: 'bg-slate-100', text: 'text-slate-600', label: status };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
```

#### Pay Popover (inline, ~40 lines)

A tiny popover that appears on hover allowing the user to confirm a payment date:

```tsx
function PayParcelaPopover({ onConfirm, pagando }: { ... }) {
  const [dataPagamento, setDataPagamento] = useState(
    new Date().toISOString().slice(0, 10) // defaults to today
  );
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
        onClick={() => setAberto(!aberto)}
        disabled={pagando}
      >
        <CheckCircle className="h-4 w-4 mr-1" />
        Marcar como Pago
      </Button>

      {aberto && (
        <div className="absolute right-0 top-full mt-1 z-10 rounded-xl border bg-white p-3 shadow-lg">
          <label className="text-xs font-medium text-slate-600">Data do Pagamento</label>
          <input
            type="date"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
          />
          <Button
            className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 rounded-lg"
            size="sm"
            disabled={pagando}
            onClick={() => { onConfirm(dataPagamento); setAberto(false); }}
          >
            {pagando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
          </Button>
        </div>
      )}
    </>
  );
}
```

---

## B. Drawer Integration

### File: `src/modules/kanban/components/lead-details-drawer.tsx` (MODIFY ~20 lines)

#### Changes:

1. **Import** `LeadParcelasTab` and `Banknote` icon
2. **Change TabsList grid** from `grid-cols-2` to `grid-cols-3`
3. **Add 3rd TabsTrigger** for "Parcelas" tab
4. **Add 3rd TabsContent** that lazy-renders `<LeadParcelasTab>`

```diff
 import { AlertCircle, X, Phone, FileText, Trash2, MessageCircle, Loader2 } from "lucide-react";
+import { Banknote } from "lucide-react";
+import { LeadParcelasTab } from "./lead-parcelas-tab";

 ...

-<TabsList className="grid w-full grid-cols-2 bg-slate-200">
+<TabsList className="grid w-full grid-cols-3 bg-slate-200">
   <TabsTrigger value="detalhes" ...>
     <FileText className="h-4 w-4 mr-2" />
     Detalhes
   </TabsTrigger>
   <TabsTrigger value="chat" ...>
     <MessageCircle className="h-4 w-4 mr-2" />
     Chat
   </TabsTrigger>
+  <TabsTrigger
+    value="parcelas"
+    className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm"
+  >
+    <Banknote className="h-4 w-4 mr-2" />
+    Parcelas
+  </TabsTrigger>
 </TabsList>

 ...

 {/* After the Chat TabsContent */}
+<TabsContent value="parcelas" className="flex-1 overflow-y-auto p-4 m-0">
+  <LeadParcelasTab leadId={leadSelecionado.id} />
+</TabsContent>
```

---

## C. Financial Dashboard Components

### File: `src/modules/financeiro/components/parcela-list-item.tsx` (~100 lines)

**Reusable card** component. Same visual as ParcelaCard in the drawer, but also shows:
- Lead avatar (initials) and name
- Quick action button (Check icon) for "Baixar"

```tsx
type ParcelaListItemProps = {
  parcela: ParcelaComLead
  onPagar: (id: string, dataPagamento?: string) => void
  pagando: boolean
}
```

Layout:
```
┌─────────────────────────────────────────────────────────┐
│ [Avatar]  João Silva   Parcela 5/60   R$ 1.500,00  [✓] │
│            10/04/2026                              PEND  │
└─────────────────────────────────────────────────────────┘
```

### File: `src/modules/financeiro/components/financeiro-tabs.tsx` (~200 lines)

**Main tabs layout** for the dashboard page:

```tsx
type FinanceiroTabsProps = {
  // All from useFinanceiroDashboard return
}
```

Structure:
```
<Tabs>
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="proximos">Próximos Vencimentos</TabsTrigger>
    <TabsTrigger value="atrasados" className="text-rose-600">Atrasadas</TabsTrigger>
    <TabsTrigger value="recebidos" className="text-emerald-600">Recebidas</TabsTrigger>
  </TabsList>

  <TabsContent value="proximos">
    {loading ? <Skeleton /> : parcelas.map(p => <ParcelaListItem ... />)}
  </TabsContent>

  <TabsContent value="atrasados">
    {/* Same structure, rose-colored badge header */}
  </TabsContent>

  <TabsContent value="recebidos">
    {/* Same structure, no pay button (already paid) */}
  </TabsContent>
</Tabs>
```

### File: `src/modules/financeiro/page.tsx` (~60 lines)

```tsx
"use client";

import { ModulePageShell } from "@/components/shared/module-page-shell";
import { ModulePageHeader } from "@/components/shared/module-page-header";
import { Wallet } from "lucide-react";
import { useFinanceiroDashboard } from "./hooks/use-financeiro-dashboard";
import { FinanceiroTabs } from "./components/financeiro-tabs";

export function ModuloFinanceiro() {
  const dashboard = useFinanceiroDashboard();

  return (
    <ModulePageShell>
      <ModulePageHeader
        title="Financeiro"
        subtitle="Controle de parcelas e pagamentos"
        icon={<Wallet className="h-6 w-6" />}
        iconTone="emerald"
      />
      <FinanceiroTabs {...dashboard} />
    </ModulePageShell>
  );
}
```

### File: `src/modules/financeiro/types.ts` (~40 lines)

```ts
export type { Parcela, ParcelaComLead } from "@/lib/api/parcelas"

export type TabFinanceiro = 'proximos' | 'atrasados' | 'recebidos'
```

### File: `src/modules/financeiro/index.ts` (~3 lines)

```ts
export { ModuloFinanceiro } from "./page";
```

---

## D. Sidebar Update

### File: `src/components/sidebar-principal.tsx` (MODIFY ~10 lines)

Add `"Financeiro"` under the **OPERAÇÃO** section:

```diff
 import {
   BarChart3,
   LayoutGrid,
   Menu,
   Settings2,
   Sparkles,
   Users,
   X,
   MessageCircle,
+  Wallet,
 } from "lucide-react";

 ...

 {
   titulo: "OPERAÇÃO",
   itens: [
     { href: "/kanban", label: "Leads", icon: LayoutGrid, tourTarget: TOUR_TARGETS.sidebarKanban },
+    { href: "/financeiro", label: "Financeiro", icon: Wallet },
     ...(sessao.perfil !== "COLABORADOR"
       ? [{ href: "/equipe", label: "Equipe", icon: Users, tourTarget: TOUR_TARGETS.sidebarEquipe }]
       : []),
   ],
 },
```

---

## E. Dashboard Route Page

### File: `src/app/(dashboard)/financeiro/page.tsx` (~15 lines, NEW)

```tsx
import { verificarSessao } from "@/lib/autenticacao";
import { redirect } from "next/navigation";
import { ModuloFinanceiro } from "@/modules/financeiro";

export default async function FinanceiroPage() {
  const sessao = await verificarSessao();
  if (!sessao) redirect("/login");

  return <ModuloFinanceiro />;
}
```

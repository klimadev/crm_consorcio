# 03 — Business Logic: Pré Aprovação Gate & Approval Workflow

> Affects: `src/app/api/leads/[id]/mover/route.ts`, API new route, `src/lib/permissoes.ts`, `src/lib/validacoes.ts`, `src/lib/calculo-pendencias.ts`, `src/modules/kanban/hooks/use-kanban-module.ts`, `src/modules/kanban/components/lead-details-drawer.tsx`

---

## 1. State Machine

```
┌──────────┐    ┌───────────────┐    ┌───────────┐    ┌───────────────┐
│Indefinido│───▶│Em Atendimento │───▶│ Proposta  │───▶│Pré Aprovação  │
└──────────┘    └───────────────┘    └───────────┘    └──────┬────────┘
                                                             │
                                          ┌──────────────────┤
                                          │                  │
                                   (sem contrato)    (com contrato,
                                   RED PULSE          sem aprovação)
                                                     AMBER PULSE
                                                             │
                                                    [EMPRESA/ADMIN/
                                                     GERENTE clica
                                                     "Aprovar Lead"]
                                                             │
                                                             ▼
                                                      ┌───────────┐
                                                      │  Fechado   │──▶ Pós Vendas
                                                      └───────────┘    GREEN PULSE 🎉
                                                             │
                                                             ▼
                                                        ┌─────────┐
                                                        │ Perdido │ (can come from any stage)
                                                        └─────────┘
```

---

## 2. Automatic Pendency on "Pré Aprovação"

### File: `src/lib/calculo-pendencias.ts`

When a lead enters "Pré Aprovação" and has no `documento_aprovacao_url`, the existing `DOCUMENTO_APROVACAO_PENDENTE` pendency should fire. Currently, this pendency only fires for `GANHO`/`FECHADO` stages:

```typescript
// CURRENT:
const isFechadoOuGanho = estagio.tipo === "FECHADO" || estagio.tipo === "GANHO";
if (isFechadoOuGanho && !hasDocumento) { ... }
```

**Change**: Also trigger when the stage **name** is "Pré Aprovação":

```diff
- const isFechadoOuGanho = estagio.tipo === "FECHADO" || estagio.tipo === "GANHO";
+ const isFechadoOuGanho = estagio.tipo === "FECHADO" || estagio.tipo === "GANHO";
+ const isPreAprovacao = estagio.nome === "Pré Aprovação";

- if (isFechadoOuGanho && !hasDocumento) {
+ if ((isFechadoOuGanho || isPreAprovacao) && !hasDocumento) {
```

---

## 3. Approval Gate: Move Route Modification

### File: `src/app/api/leads/[id]/mover/route.ts`

Add a validation block **after** the "PERDIDO motivo" check and **before** the `prisma.lead.update`:

```typescript
// NEW: Approval gate for moving to "Fechado" from "Pré Aprovação"
const isMovingToFechado = estagioDestino.tipo === "GANHO";
const isFromPreAprovacao = lead.estagio.nome === "Pré Aprovação";

if (isMovingToFechado && isFromPreAprovacao) {
  // Check if lead has been approved by management
  if (!lead.aprovado_em || !lead.aprovado_por) {
    return NextResponse.json(
      { erro: "Lead precisa ser aprovado pela gerência antes de ser movido para Fechado." },
      { status: 403 }
    );
  }
}

// NEW: Approval gate for COLABORADOR moving to Fechado/Pós Vendas
if (isMovingToFechado && auth.sessao.perfil === "COLABORADOR") {
  if (!lead.aprovado_em || !lead.aprovado_por) {
    return NextResponse.json(
      { erro: "Lead precisa ser aprovado pela gerência." },
      { status: 403 }
    );
  }
}
```

Also need to update the `findFirst` include to fetch `aprovado_em` and `aprovado_por`:

```diff
 const lead = await prisma.lead.findFirst({
   where: { ... },
   include: {
     estagio: {
-      select: { id: true, nome: true },
+      select: { id: true, nome: true, tipo: true },
     },
     funcionario: {
       select: { id_pdv: true },
     },
   },
 });
```

### Reset Approval on Stage Reversion

When a lead is moved **backward** (from Fechado to an earlier stage), reset the approval:

```typescript
// After the update:
if (estagioDestino.tipo === "ABERTO") {
  await prisma.lead.update({
    where: { id: lead.id },
    data: { aprovado_em: null, aprovado_por: null },
  });
}
```

---

## 4. New API Endpoint: `POST /api/leads/[id]/aprovar`

### File: `src/app/api/leads/[id]/aprovar/route.ts` [NEW]

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirSessao } from "@/lib/permissoes";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await exigirSessao(request);
  if (auth.erro) return auth.erro;

  // Permission check: only EMPRESA, ADMINISTRADOR, or GERENTE can approve
  if (auth.sessao.perfil === "COLABORADOR") {
    return NextResponse.json(
      { erro: "Apenas gerência pode aprovar leads." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      id_empresa: auth.sessao.id_empresa,
    },
    include: {
      estagio: { select: { id: true, nome: true, tipo: true } },
    },
  });

  if (!lead) {
    return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
  }

  // Can only approve leads in "Pré Aprovação"
  if (lead.estagio.nome !== "Pré Aprovação") {
    return NextResponse.json(
      { erro: "Lead precisa estar no estagio 'Pré Aprovação' para ser aprovado." },
      { status: 400 }
    );
  }

  // Require document before approval
  if (!lead.documento_aprovacao_url) {
    return NextResponse.json(
      { erro: "Lead precisa ter documento de aprovação antes de ser aprovado." },
      { status: 400 }
    );
  }

  // Already approved?
  if (lead.aprovado_em) {
    return NextResponse.json({ lead, mensagem: "Lead já foi aprovado." });
  }

  const leadAtualizado = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      aprovado_em: new Date(),
      aprovado_por: auth.sessao.id_usuario,
    },
  });

  return NextResponse.json({ lead: leadAtualizado });
}
```

---

## 5. Permission Helper

### File: `src/lib/permissoes.ts`

Add a new helper:

```typescript
export function podeAprovarLead(sessao: SessaoToken): boolean {
  return sessao.perfil === "EMPRESA" || sessao.perfil === "GERENTE";
  // Note: ADMINISTRADOR is a cargo for Funcionario, handled via perfil
}
```

---

## 6. Frontend Drag-and-Drop Validation

### File: `src/modules/kanban/hooks/use-kanban-module.ts`

In `aoDragEnd`, add a check before calling `moverLead`:

```typescript
const aoDragEnd = useCallback(
  async (resultado: DropResult) => {
    if (!resultado.destination) return;

    const idLead = resultado.draggableId;
    const idEstagioDestino = resultado.destination.droppableId;

    const lead = leads.find((item) => item.id === idLead);
    if (!lead || lead.id_estagio === idEstagioDestino) return;

    const estagioDestino = estagios.find((item) => item.id === idEstagioDestino);
    if (!estagioDestino) return;

    const estagioOrigem = estagios.find((item) => item.id === lead.id_estagio);

    // NEW: Block dragging to Fechado/Pós Vendas without approval
    if (estagioDestino.tipo === "GANHO" && estagioOrigem?.nome === "Pré Aprovação") {
      if (!lead.aprovado_em) {
        // Show error toast
        addToast({
          type: "error",
          title: "Movimentação bloqueada",
          description: "Lead precisa ser aprovado pela gerência antes de avançar.",
        });
        return; // Block the drag
      }
    }

    // NEW: COLABORADOR cannot drag to GANHO without approval
    if (estagioDestino.tipo === "GANHO" && perfil === "COLABORADOR" && !lead.aprovado_em) {
      addToast({
        type: "error",
        title: "Movimentação bloqueada",
        description: "Lead precisa ser aprovado pela gerência.",
      });
      return;
    }

    if (estagioDestino.tipo === "PERDIDO") {
      setMovimentoPendente({ id_lead: idLead, id_estagio: idEstagioDestino });
      return;
    }

    await moverLead(idLead, idEstagioDestino);
  },
  [leads, estagios, moverLead, perfil],
);
```

> Note: `addToast` needs to be added to the hook dependencies. Import `useToast` and extract `addToast`.

---

## 7. "Aprovar Lead" Button in Drawer

### File: `src/modules/kanban/components/lead-details-drawer.tsx`

Add an "Aprovar Lead" button visible only to EMPRESA/GERENTE when the lead is in "Pré Aprovação" stage and has a document uploaded but not yet approved:

```tsx
{/* Show when lead is in Pré Aprovação, has document, but not approved */}
{estagioPorId(leadSelecionado.id_estagio)?.nome === "Pré Aprovação" &&
 leadSelecionado.documento_aprovacao_url &&
 !leadSelecionado.aprovado_em &&
 perfil !== "COLABORADOR" && (
  <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
    <p className="text-sm font-semibold text-amber-800 mb-2">
      ⚠️ Lead aguardando aprovação da gerência
    </p>
    <Button
      className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium"
      onClick={handleAprovarLead}
      disabled={aprovando}
    >
      {aprovando ? "Aprovando..." : "✅ Aprovar Lead"}
    </Button>
  </div>
)}

{/* Show approval confirmation when already approved */}
{leadSelecionado.aprovado_em && (
  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
    <p className="font-semibold">✅ Lead aprovado</p>
    <p className="text-xs mt-1">
      Aprovado em {new Date(leadSelecionado.aprovado_em).toLocaleDateString("pt-BR")}
    </p>
  </div>
)}
```

The `handleAprovarLead` function:

```typescript
const handleAprovarLead = async () => {
  if (!leadSelecionado) return;
  setAprovando(true);
  try {
    const resposta = await fetch(`/api/leads/${leadSelecionado.id}/aprovar`, {
      method: "POST",
    });
    if (!resposta.ok) {
      const json = await resposta.json();
      setErroDetalhesLead(json.erro ?? "Erro ao aprovar lead.");
      return;
    }
    const json = await resposta.json();
    if (json.lead) {
      onMudarLead(json.lead);
    }
  } catch {
    setErroDetalhesLead("Erro ao aprovar lead.");
  } finally {
    setAprovando(false);
  }
};
```

> The drawer also needs the `estagios` array passed as a prop so it can determine the current stage name.

---

## 8. Validations Update

### File: `src/lib/validacoes.ts`

Update `esquemaAtualizarLead` to accept the new fields (read-only from frontend perspective, but needed for the API response parsing):

No change needed in the Zod schema since `aprovado_em` and `aprovado_por` are server-set and not part of the update payload.

However, add awareness of the "Pré Aprovação" pendency type. The `TIPOS_PENDENCIA` array already has `"DOCUMENTO_APROVACAO_PENDENTE"` which covers our use case ✅.

### Consider adding a new pendency type:

```diff
 export const TIPOS_PENDENCIA = [
   "SEM_RESPOSTA",
   "CARTA_CREDITO_PENDENTE",
   "DOCUMENTOS_PENDENTES",
   "QUEDA_RESERVA",
   "ALTO_VALOR",
   "DOCUMENTO_APROVACAO_PENDENTE",
   "ESTAGIO_PARADO",
+  "APROVACAO_GERENCIA_PENDENTE",
 ] as const;

 export const LABELS_PENDENCIA: Record<TipoPendencia, string> = {
   ...existing,
+  APROVACAO_GERENCIA_PENDENTE: "Aprovação da Gerência Pendente",
 };
```

And in `calculo-pendencias.ts`, add logic:

```typescript
// Lead is in Pré Aprovação, has document, but not approved
if (isPreAprovacao && hasDocumento && !lead.aprovado_em) {
  pendencias.push({
    id: gerarIdPendencia(lead.id, "APROVACAO_GERENCIA_PENDENTE"),
    id_lead: lead.id,
    tipo: "APROVACAO_GERENCIA_PENDENTE",
    descricao: "Lead aguardando aprovação da gerência para avançar.",
    resolvida: false,
  });
}
```

This enables the pendency badge to show specifically when management approval is pending and distinct from the "document missing" pendency.

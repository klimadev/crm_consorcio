# 06 — Verification Plan

> How to verify every aspect of the refactor — existing tests to update, new tests to write, and manual QA.

---

## 1. Existing Tests to Update

### `src/app/api/leads/[id]/mover/route.test.ts`

This test file has 3 tests:
1. "retorna erro quando id_estagio nao e enviado" → **no change needed**
2. "exige motivo ao mover para perdido" → **no change needed**
3. "retorna no-op quando lead ja esta no destino" → **no change needed**

**New tests to add to this file:**

```typescript
it("bloqueia COLABORADOR de mover para GANHO sem aprovação", async () => {
  // Setup: perfil = "COLABORADOR", lead sem aprovado_em
  // Destino: estagioDestino.tipo = "GANHO"
  // Expectativa: 403 com mensagem "Lead precisa ser aprovado pela gerência."
});

it("permite mover para GANHO quando lead está aprovado", async () => {
  // Setup: lead.aprovado_em = set, lead.aprovado_por = set
  // Destino: estagioDestino.tipo = "GANHO"
  // Expectativa: 200, lead.update chamado
});

it("bloqueia mover de Pré Aprovação para Fechado sem aprovação", async () => {
  // Setup: lead.estagio.nome = "Pré Aprovação", lead.aprovado_em = null
  // Destino: estagioDestino.tipo = "GANHO"
  // Expectativa: 403
});
```

### Run command:

```bash
npx vitest run src/app/api/leads/[id]/mover/route.test.ts
```

---

## 2. New Test File: `src/app/api/leads/[id]/aprovar/route.test.ts`

```typescript
describe("POST /api/leads/[id]/aprovar", () => {
  it("rejeita COLABORADOR tentando aprovar", async () => {
    // perfil = "COLABORADOR"
    // Expectativa: 403 "Apenas gerência pode aprovar leads."
  });

  it("rejeita lead fora de Pré Aprovação", async () => {
    // lead.estagio.nome = "Proposta"
    // Expectativa: 400
  });

  it("rejeita lead sem documento de aprovação", async () => {
    // lead.documento_aprovacao_url = null
    // Expectativa: 400
  });

  it("aprova lead com sucesso", async () => {
    // perfil = "EMPRESA", lead em "Pré Aprovação", documento presente
    // Expectativa: 200, lead com aprovado_em e aprovado_por preenchidos
  });

  it("retorna idempotente se lead já aprovado", async () => {
    // lead.aprovado_em already set
    // Expectativa: 200, mensagem "Lead já foi aprovado."
  });
});
```

### Run command:

```bash
npx vitest run src/app/api/leads/[id]/aprovar/route.test.ts
```

---

## 3. Stages Migration Test

Add a test to verify the `garantirEstagiosFixosEmpresa` function correctly handles the migration from 5 to 7 stages:

**File**: `src/lib/estagios-fixos.test.ts` [NEW]

```typescript
describe("garantirEstagiosFixosEmpresa", () => {
  it("cria 7 estágios fixos para empresa nova", async () => {
    // Expectativa: 7 estágios com nomes e ordens corretos
  });

  it("migra empresa existente de 5 para 7 estágios sem conflito de unique", async () => {
    // Setup: empresa com 5 estágios antigos
    // Expectativa: 7 estágios após upsert, nenhum duplicado
  });
});
```

### Run command:

```bash
npx vitest run src/lib/estagios-fixos.test.ts
```

---

## 4. Full Test Suite

Run all existing tests to ensure nothing is broken:

```bash
npx vitest run
```

---

## 5. Manual QA Checklist

### Prerequisites
1. Run `npx prisma migrate dev --name add_lead_approval_fields`
2. Run `npx prisma db seed` (or manually create test data)
3. Start dev server: `npm run dev`
4. Have accounts ready:
   - EMPRESA: `empresa.demo@crmconsorcio.com` / `123456`
   - GERENTE: `gerente.demo@crmconsorcio.com` / `123456`
   - COLABORADOR: `colaborador1.demo@crmconsorcio.com` / `123456`

### Checklist

| # | Test | Expected | Status |
|---|---|---|---|
| 1 | Open sidebar | Menu shows "Leads" (not "Kanban") | ☐ |
| 2 | Open the Leads board | Header says "Leads" with subtitle "Gestão de leads..." | ☐ |
| 3 | Count board columns | 7 columns: Indefinido, Em Atendimento, Proposta, Pré Aprovação, Fechado, Pós Vendas, Perdido | ☐ |
| 4 | Column backgrounds | Fechado/Pós Vendas have faint green tint, Perdido has slate tint, Pré Aprovação has amber tint | ☐ |
| 5 | Drag lead to "Pré Aprovação" (no contract) | Card shows **red pulsating circle** and red border | ☐ |
| 6 | Upload contract on lead in "Pré Aprovação" | Red circle changes to **amber pulsating circle**, amber border, "Aguardando Aprovação" badge | ☐ |
| 7 | Login as COLABORADOR, try drag from "Pré Aprovação" to "Fechado" | Drag is **blocked**, toast: "Lead precisa ser aprovado pela gerência." | ☐ |
| 8 | Login as EMPRESA, open lead in "Pré Aprovação" with contract | See "Aprovar Lead" button in drawer | ☐ |
| 9 | Click "Aprovar Lead" | Lead shows **green pulsating circle**, approval confirmation in drawer | ☐ |
| 10 | Drag approved lead to "Fechado" | Drag succeeds, card shows green circle + 🎉 emoji | ☐ |
| 11 | Move lead to "Pós Vendas" | Card shows green circle + 🤝 emoji | ☐ |
| 12 | Move lead to "Perdido" | Requires motivo_perda dialog, card becomes muted | ☐ |
| 13 | Onboarding tour | Tour step says "Leads" (not "Kanban") | ☐ |
| 14 | Login as COLABORADOR, open drawer on "Pré Aprovação" lead | "Aprovar Lead" button is **NOT** visible | ☐ |
| 15 | Move lead from "Fechado" back to "Proposta" | approval fields (`aprovado_em`, `aprovado_por`) reset to null | ☐ |

---

## 6. Execution Order

Recommended order of implementation to minimize breakage:

| Step | Action | Risk |
|---|---|---|
| 1 | Prisma schema migration | Low — additive only |
| 2 | Update `ESTAGIOS_FIXOS_PADRAO` and seed | Medium — requires migration function update |
| 3 | Update `calculo-pendencias.ts` | Low — additive |
| 4 | Add permission helper | Low — additive |
| 5 | Create approval API route + tests | Low — new endpoint |
| 6 | Update move API route + tests | Medium — behavioral change |
| 7 | Update frontend types | Low |
| 8 | Update `use-kanban-module.ts` drag validation | Medium |
| 9 | UI renaming ("Kanban" → "Leads") | Low — text only |
| 10 | Visual cues in `kanban-board.tsx` | Medium — UI changes |
| 11 | "Aprovar Lead" button in drawer | Medium |
| 12 | Run full test suite | — |
| 13 | Manual QA | — |

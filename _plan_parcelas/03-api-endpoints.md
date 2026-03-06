# 03 — API Endpoints

## Overview

Three API route files covering all installment operations:

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/parcelas` | `GET` | List parcelas (global dashboard + per-lead) |
| `/api/parcelas` | `POST` | Batch-generate installment plan for a lead |
| `/api/parcelas/[id]/pagar` | `PATCH` | Mark a single parcela as paid |

---

## File 1: `src/app/api/parcelas/route.ts` (~180 lines)

### `GET /api/parcelas`

**Query Params:**
- `id_lead` (optional) — filter by lead
- `status` (optional) — `PENDENTE` | `PAGO` | `ATRASADO`
- `tab` (optional) — `proximos` | `atrasados` | `recebidos` (dashboard tabs)
- `limit` (optional, default 50)

**Logic:**
1. Require session via `exigirSessao(request)`
2. Build `where` clause scoped to `id_empresa`
3. If `id_lead` provided, add to `where`
4. If `tab` is present, apply tab-specific logic:
   - `proximos` → `status: 'PENDENTE'`, `data_vencimento >= today`, ordered by `data_vencimento ASC`
   - `atrasados` → `status: 'PENDENTE'`, `data_vencimento < today`, `data_pagamento: null` → return with computed `status: 'ATRASADO'`
   - `recebidos` → `status: 'PAGO'`, ordered by `data_pagamento DESC`
5. Return `{ parcelas: [...] }` with Lead data included:
   ```ts
   include: {
     lead: {
       select: { id: true, nome: true, telefone: true, valor_consorcio: true }
     }
   }
   ```

**Response Shape:**
```ts
{
  parcelas: Array<{
    id: string
    id_lead: string
    numero_parcela: number
    quantidade_total: number
    valor: number
    data_vencimento: string  // ISO
    data_pagamento: string | null
    status: 'PENDENTE' | 'PAGO' | 'ATRASADO'  // ATRASADO is computed
    lead: {
      id: string
      nome: string
      telefone: string
      valor_consorcio: number
    }
  }>
}
```

---

### `POST /api/parcelas`

**Request Body:**
```ts
{
  id_lead: string
  valor_parcela: number        // value per installment
  quantidade_parcelas: number  // e.g. 60, 120
  data_primeiro_vencimento: string // ISO date, e.g. "2026-04-10"
}
```

**Validation:**
- `id_lead` → must exist and belong to same `id_empresa`
- `valor_parcela` → must be > 0
- `quantidade_parcelas` → must be between 1 and 360
- `data_primeiro_vencimento` → must be a valid future or present date
- Lead must NOT already have parcelas (prevent duplicates)

**Generation Logic (critical date math):**

```ts
function gerarDatasVencimento(
  dataInicial: Date,
  quantidade: number
): Date[] {
  const datas: Date[] = [];
  const diaOriginal = dataInicial.getDate();

  for (let i = 0; i < quantidade; i++) {
    const data = new Date(dataInicial);
    data.setMonth(data.getMonth() + i);

    // Clamp to end of month if original day overflows
    // e.g. Jan 31 + 1 month → Feb 28/29, not Mar 3
    if (data.getDate() !== diaOriginal) {
      data.setDate(0); // go to last day of previous month
    }

    datas.push(data);
  }

  return datas;
}
```

**Database Operation:**
- Use `prisma.parcela.createMany({ data: [...] })` for batch insert
- Each item includes: `id_empresa`, `id_lead`, `numero_parcela`, `quantidade_total`, `valor`, `data_vencimento`, `status: 'PENDENTE'`

**Response:**
```ts
{ 
  ok: true,
  parcelas_criadas: number
}
```

---

## File 2: `src/app/api/parcelas/[id]/pagar/route.ts` (~60 lines)

### `PATCH /api/parcelas/[id]/pagar`

**Request Body:**
```ts
{
  data_pagamento: string  // ISO date, defaults to today
}
```

**Logic:**
1. Require session
2. Find parcela by `id`, verify `id_empresa` matches session
3. Verify parcela exists and is not already `PAGO`
4. Update:
   ```ts
   prisma.parcela.update({
     where: { id },
     data: {
       status: 'PAGO',
       data_pagamento: new Date(data_pagamento)
     }
   })
   ```
5. Return updated parcela

**Response:**
```ts
{
  parcela: { ... }  // updated parcela object
}
```

---

## Auth & Permissions

All endpoints use `exigirSessao()` to extract `id_empresa` from JWT.

| Endpoint | Required Profile |
|----------|-----------------|
| `GET /api/parcelas` | Any authenticated user |
| `POST /api/parcelas` | Any (EMPRESA, GERENTE, COLABORADOR) |
| `PATCH /api/parcelas/[id]/pagar` | Any authenticated user |

> Permission model follows the same pattern as existing leads API — scoped by `id_empresa` from the session token.

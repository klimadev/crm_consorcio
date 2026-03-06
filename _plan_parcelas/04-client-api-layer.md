# 04 — Client-Side API Layer

## File: `src/lib/api/parcelas.ts` (~90 lines)

This file follows the exact same pattern as `src/lib/api/kanban.ts`:
- Uses `ResultadoApi<T>` return type (`{ ok: true, dados: T } | { ok: false, erro: string }`)
- Uses the internal `lerJsonSeguro<T>` helper (or import from a shared location)

### Types

```ts
export type Parcela = {
  id: string
  id_lead: string
  numero_parcela: number
  quantidade_total: number
  valor: number
  data_vencimento: string   // ISO
  data_pagamento: string | null
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO'
}

export type ParcelaComLead = Parcela & {
  lead: {
    id: string
    nome: string
    telefone: string
    valor_consorcio: number
  }
}

export type PayloadGerarParcelas = {
  id_lead: string
  valor_parcela: number
  quantidade_parcelas: number
  data_primeiro_vencimento: string // ISO date
}

export type PayloadPagarParcela = {
  data_pagamento: string  // ISO date
}
```

### Functions

```ts
// List parcelas for a lead (drawer tab)
export async function listarParcelasLead(idLead: string): Promise<ResultadoApi<{ parcelas: Parcela[] }>>

// List parcelas for the financial dashboard (with lead data included)
export async function listarParcelasDashboard(
  tab: 'proximos' | 'atrasados' | 'recebidos'
): Promise<ResultadoApi<{ parcelas: ParcelaComLead[] }>>

// Batch-generate installment plan
export async function gerarParcelas(
  payload: PayloadGerarParcelas
): Promise<ResultadoApi<{ parcelas_criadas: number }>>

// Mark a parcela as paid
export async function pagarParcela(
  idParcela: string,
  payload: PayloadPagarParcela
): Promise<ResultadoApi<{ parcela: Parcela }>>
```

### Implementation Pattern

Each function follows this pattern (from kanban.ts):

```ts
async function lerJsonSeguro<T>(resposta: Response): Promise<T> {
  return (await resposta.json().catch(() => ({}))) as T;
}

export async function listarParcelasLead(idLead: string): Promise<ResultadoApi<{ parcelas: Parcela[] }>> {
  const resposta = await fetch(`/api/parcelas?id_lead=${idLead}`);
  const json = await lerJsonSeguro<{ parcelas?: Parcela[] } & ApiErro>(resposta);

  if (!resposta.ok) {
    return { ok: false, erro: json.erro ?? "Erro ao buscar parcelas." };
  }

  return { ok: true, dados: { parcelas: json.parcelas ?? [] } };
}
```

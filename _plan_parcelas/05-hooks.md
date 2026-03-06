# 05 — Custom Hooks

## Hook 1: `src/modules/kanban/hooks/use-lead-parcelas.ts` (~140 lines)

This hook manages all parcela logic inside the **Lead Details Drawer**.

### Responsibilities

1. **Fetch** parcelas for the selected lead
2. **Generate** the installment plan (batch create)
3. **Pay** an individual parcela with optimistic UI
4. **Compute** dynamic `ATRASADO` status on the client

### Interface

```ts
type UseLeadParcelasParams = {
  leadId: string | undefined
}

type UseLeadParcelasReturn = {
  // Data
  parcelas: Parcela[]
  loading: boolean
  error: string | null

  // Generator form state
  valorParcela: string        // masked BRL string
  setValorParcela: (v: string) => void
  quantidadeParcelas: string  // string for input
  setQuantidadeParcelas: (v: string) => void
  dataPrimeiroVencimento: string  // YYYY-MM-DD
  setDataPrimeiroVencimento: (v: string) => void

  // Actions
  gerarPlano: () => Promise<void>
  gerando: boolean

  pagarParcela: (idParcela: string, dataPagamento?: string) => Promise<void>
  pagando: string | null  // id of parcela being paid

  // Computed
  temParcelas: boolean
}
```

### Key Implementation Details

#### Fetching
```ts
useEffect(() => {
  if (!leadId) return;
  setLoading(true);
  listarParcelasLead(leadId).then(result => {
    if (result.ok) {
      setParcelas(computarStatus(result.dados.parcelas));
    } else {
      setError(result.erro);
    }
    setLoading(false);
  });
}, [leadId]);
```

#### Dynamic Status Computation (client-side)
```ts
function computarStatus(parcelas: Parcela[]): Parcela[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return parcelas.map(p => {
    if (p.status === 'PAGO') return p;
    const vencimento = new Date(p.data_vencimento);
    vencimento.setHours(0, 0, 0, 0);

    return {
      ...p,
      status: vencimento < hoje ? 'ATRASADO' : 'PENDENTE'
    };
  });
}
```

#### Optimistic Pay
```ts
const pagarParcela = async (idParcela: string, dataPagamento?: string) => {
  setPagando(idParcela);

  // Optimistic: immediately update UI
  const parcelasBackup = [...parcelas];
  setParcelas(prev => prev.map(p =>
    p.id === idParcela
      ? { ...p, status: 'PAGO', data_pagamento: dataPagamento ?? new Date().toISOString() }
      : p
  ));

  const resultado = await apiPagarParcela(idParcela, {
    data_pagamento: dataPagamento ?? new Date().toISOString()
  });

  if (!resultado.ok) {
    // Revert on failure
    setParcelas(parcelasBackup);
    setError(resultado.erro);
  }

  setPagando(null);
};
```

#### Generate Plan
```ts
const gerarPlano = async () => {
  if (!leadId) return;
  setGerando(true);
  setError(null);

  const resultado = await apiGerarParcelas({
    id_lead: leadId,
    valor_parcela: converteMoedaBrParaNumero(valorParcela),
    quantidade_parcelas: Number(quantidadeParcelas),
    data_primeiro_vencimento: dataPrimeiroVencimento,
  });

  if (resultado.ok) {
    // Refetch parcelas after generation
    const listagem = await listarParcelasLead(leadId);
    if (listagem.ok) {
      setParcelas(computarStatus(listagem.dados.parcelas));
    }
  } else {
    setError(resultado.erro);
  }

  setGerando(false);
};
```

---

## Hook 2: `src/modules/financeiro/hooks/use-financeiro-dashboard.ts` (~120 lines)

This hook manages the **Financial Dashboard** page data.

### Responsibilities

1. **Fetch** parcelas for the active tab (Próximos / Atrasados / Recebidos)
2. **Pay** a parcela with optimistic UI
3. **Track** loading and error state per-tab
4. **Auto-refresh** on tab change

### Interface

```ts
type TabFinanceiro = 'proximos' | 'atrasados' | 'recebidos'

type UseFinanceiroDashboardReturn = {
  tabAtiva: TabFinanceiro
  setTabAtiva: (tab: TabFinanceiro) => void

  parcelas: ParcelaComLead[]
  loading: boolean
  error: string | null

  pagarParcela: (idParcela: string, dataPagamento?: string) => Promise<void>
  pagando: string | null

  // Counts for tab badges
  contadores: {
    proximos: number | null
    atrasados: number | null
    recebidos: number | null
  }
}
```

### Key Implementation Details

#### Fetch on Tab Change
```ts
useEffect(() => {
  setLoading(true);
  listarParcelasDashboard(tabAtiva).then(result => {
    if (result.ok) {
      setParcelas(result.dados.parcelas);
    } else {
      setError(result.erro);
    }
    setLoading(false);
  });
}, [tabAtiva]);
```

#### Optimistic Pay (same pattern as useLeadParcelas)
After paying, remove the item from current tab view (since its status changed from PENDENTE/ATRASADO to PAGO).

```ts
const pagarParcela = async (idParcela: string, dataPagamento?: string) => {
  setPagando(idParcela);
  const parcelasBackup = [...parcelas];

  // Optimistic: remove from current view
  setParcelas(prev => prev.filter(p => p.id !== idParcela));

  const resultado = await apiPagarParcela(idParcela, {
    data_pagamento: dataPagamento ?? new Date().toISOString()
  });

  if (!resultado.ok) {
    setParcelas(parcelasBackup);
    setError(resultado.erro);
  }

  setPagando(null);
};
```

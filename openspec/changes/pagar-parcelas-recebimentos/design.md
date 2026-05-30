## Context

O módulo `/recebimentos` (exclusivo do perfil EMPRESA) exibe um dashboard de parcelas com KPIs, gráficos e uma tabela paginada. Cada linha da tabela mostra os dados da parcela e um link "Abrir lead" que navega para o kanban (`/kanban?lead=<id>`). Para marcar uma parcela como paga, o usuário é forçado a sair do dashboard, esperar o kanban carregar, abrir o drawer, alternar para a aba "Parcelas" e confirmar o pagamento.

O endpoint `PATCH /api/parcelas/[id]/pagar` já existe e é consumido pelo hook `useLeadParcelas` do módulo de kanban. O padrão de optimistic update com rollback também já está estabelecido nesse hook (linhas 104-128 de `use-lead-parcelas.ts`).

O desafio é injetar essa capacidade de mutação no módulo de recebimentos sem duplicar lógica, mantendo o padrão MVVM do projeto e sem alterar backend.

## Goals / Non-Goals

**Goals:**
- Permitir marcar parcela como paga diretamente da tabela e cards mobile do `/recebimentos`
- Implementar optimistic update: linha atualiza visualmente antes da resposta da API
- Rollback automático se a API falhar, com toast de erro
- Atualizar KPIs e gráficos após pagamento bem-sucedido (via `recarregar()`)
- Manter link "Abrir lead" como ação secundária (ainda útil para ver detalhes completos)
- Reutilizar `pagarParcela()` de `@/lib/api/parcelas` — zero novas chamadas de API

**Non-Goals:**
- Alterar o módulo de kanban ou seus hooks
- Criar novos endpoints de API
- Adicionar suporte para GERENTE no `/recebimentos` (mudança de permissão)
- Permitir editar valores ou vencimentos diretamente de recebimentos
- Implementar pagamento em lote (batch)

## Decisions

### 1. Reutilizar `pagarParcela` de `@/lib/api/parcelas` em vez de criar nova chamada

**Rationale:** O endpoint e cliente já existem, testados, e lidam com validação de sessão/permissão. Não há ganho em duplicar. O hook de recebimentos só precisa importar e usar.

### 2. Optimistic update com backup/rollback (padrão `useLeadParcelas`)

**Rationale:** Padrão já validado no projeto. A UX é imediata: a linha fica verde no instante do clique. Se falhar, volta ao estado anterior.

**Alternativa considerada:** Loading spinner até resposta da API. Rejeitada por latência percebida — o padrão optimistic já é usado em `useLeadParcelas` e entrega melhor UX.

### 3. Estado `pagando: string | null` (single mutation)

**Rationale:** Mutar uma parcela por vez. Simplifica o estado (string vs Set). Permite desabilitar só o item em mutação, não a tabela inteira.

### 4. Inline date picker (sem dialog)

**Rationale:** Segue o mesmo padrão do `InstallmentCard` no kanban. O botão "Marcar como Pago" expande localmente um `<input type="date">` com valor default = hoje + botão confirmar. Mais rápido que abrir um Dialog, e consistente com o resto do app.

### 5. `recarregar()` ao final do pagamento

**Rationale:** Após optimistic update local, o servidor recalcula status (ATRASADO pode virar PAGO). Os KPIs, gráficos e contadores de abas precisam refletir a nova realidade. Recarregar é simples, confiável, e o custo de uma requisição GET extra é aceitável (a lista já carregou antes).

**Alternativa considerada:** Recalcular KPIs no client. Rejeitada — os cálculos de resumo (`calcularResumoParcelas`, `taxaAdimplencia`) são complexos e residem no servidor. Duplicar no client seria frágil.

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| Clique acidental em "Marcar como Pago" | Botão expande confirmador com date picker antes de disparar — 2 cliques mínimos |
| Inconsistência entre estado local e servidor | Rollback no padrão `useLeadParcelas` (linha 110-123: backup antes do optimistic, restore no erro) |
| KPIs desatualizados brevemente | Janela de ~200ms entre optimistic update e recarga. Aceitável. |
| Duas abas abertas (recebimentos + kanban) pagando a mesma parcela | API retorna `badRequest("Parcela ja esta paga.")` — optimistic update reverte |

## Open Questions

<!-- Nenhuma pendência. Todas as decisões técnicas estão resolvidas. -->

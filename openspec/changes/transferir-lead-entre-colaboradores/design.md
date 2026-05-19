## Context

Atualmente o CRM possui três perfis com regras distintas de transferência de lead: `EMPRESA` transfere para qualquer funcionário da empresa via `PATCH /api/leads/[id]`, `GERENTE` transfere para qualquer funcionário do seu PDV, e `COLABORADOR` é forçado a manter `id_funcionario` = self — ou seja, nunca pode transferir.

O levantamento da exploração identificou os pontos exatos de bloqueio:
- `src/app/api/leads/[id]/route.ts:149-151` — override `idFuncionarioDestino = auth.sessao.id_usuario` para COLABORADOR
- `src/modules/kanban/components/lead-details-tab-content.tsx:326` — seletor de Responsável oculto para COLABORADOR
- `src/app/api/leads/route.ts:46-49` — COLABORADOR recebe todos os funcionários da empresa (sem scope por PDV)

O design proposto introduz um sistema de **convite com aceitação** entre pares. O colaborador envia um convite, o destinatário aceita ou recusa. Enquanto pendente, o lead aparece em uma coluna dedicada "Transferências Recebidas" no kanban do destinatário.

## Goals / Non-Goals

**Goals:**
- Permitir que COLABORADOR transfira qualquer lead seu para outro COLABORADOR do mesmo PDV, via convite
- O destinatário deve aceitar ou recusar; não há transferência unilateral automática
- Leads com convite pendente aparecem em coluna dedicada no kanban do destinatário
- O remetente pode cancelar o convite a qualquer momento antes da resposta
- Durante a pendência, o remetente continua editando o lead normalmente

**Non-Goals:**
- Transferência unilateral: COLABORADOR não ganha poder de trocar `id_funcionario` diretamente (isso continua restrito a GERENTE/EMPRESA)
- Transferências entre PDVs diferentes: o convite só funciona dentro do mesmo PDV
- Transferências em lote: o fluxo é individual (lead a lead)
- Modificar regras de GERENTE/EMPRESA: eles continuam com transferência direta via `PATCH /api/leads/[id]`
- WhatsApp automation: não é afetado neste escopo

## Decisions

### Decisão 1: Nova tabela `TransferenciaLead` ao invés de campo no `Lead`

**Alternativa considerada:** Adicionar campos `id_solicitante_transferencia` e `status_transferencia` diretamente no model `Lead`.

**Decisão:** Nova tabela separada. Razões:
- Separação de concerns: o lead não carrega estado de "quem está tentando transferir"
- Histórico natural: transferências passadas ficam registradas para auditoria
- Restrição `@@unique([id_lead])` com `status = PENDENTE` garante que um lead só tenha um convite ativo
- Fácil de estender (ex: adicionar `mensagem` no convite no futuro)

### Decisão 2: Rotas como sub-recurso de lead (`/api/leads/[id]/transferencia`)

**Alternativa considerada:** Recurso top-level `/api/transferencias` com `id_lead` no body.

**Decisão:** Sub-recurso. O convite é intrinsicamente ligado a um lead específico. A URL expressa essa relação. O `PATCH` e `DELETE` no mesmo path com lógica condicional (perfil do chamador) é mais RESTful e evita criar 3 rotas separadas.

### Decisão 3: Coluna dedicada "Transferências Recebidas" no kanban

**Alternativas consideradas:** (a) Seção/banner acima das colunas, (b) badge de notificação + filtro.

**Decisão:** Coluna dedicada à esquerda do funil. Justificativa:
- Tratamento visual igualitário: cards de transferência têm a mesma hierarquia visual que cards do funil
- Ação imediata: botões ACEITAR/RECUSAR no próprio card, sem precisar abrir drawer
- Naturalidade: quando a transferência é aceita, o card "desliza" para a coluna correta do funil
- A coluna só aparece quando há transferências pendentes (evita poluir kanban vazio)

### Decisão 4: Sem restrição de estágio para transferência

**Decisão:** COLABORADOR pode transferir leads em qualquer estágio (ABERTO, GANHO, ou PERDIDO). A transferência não muda o estágio — apenas o responsável. Se o lead está em GANHO, o novo dono herda a venda (com `aprovado_em` e `aprovado_por` preservados). Isso é consistente com o comportamento de GERENTE/EMPRESA no `PATCH` existente.

### Decisão 5: Visibilidade total dos dados do lead durante pendência

**Decisão:** O destinatário vê nome, telefone, valor e observações do lead antes de aceitar. Como ambos pertencem ao mesmo PDV e o lead já é visível para o gerente do PDV de qualquer forma, não há vazamento de privacidade. Ver os dados completos ajuda o destinatário a decidir se aceita ou não.

## Data Model

```prisma
model TransferenciaLead {
  id                     String    @id @default(uuid())
  id_lead                String
  id_funcionario_origem  String
  id_funcionario_destino String
  status                 String    @default("PENDENTE")  // PENDENTE | ACEITA | RECUSADA
  criado_em              DateTime  @default(now())
  respondido_em          DateTime?

  lead                   Lead         @relation(fields: [id_lead], references: [id])
  funcionario_origem     Funcionario  @relation("TransferenciasEnviadas", fields: [id_funcionario_origem], references: [id])
  funcionario_destino    Funcionario  @relation("TransferenciasRecebidas", fields: [id_funcionario_destino], references: [id])

  @@unique([id_lead, status], name: "unique_pending_transfer_per_lead")  // Partial unique: só bloqueia duplicata PENDENTE
  @@index([id_funcionario_origem])
  @@index([id_funcionario_destino])
}
```

Nota: o `@@unique([id_lead, status])` é um partial unique via PostgreSQL `WHERE status = 'PENDENTE'` (requer Prisma `@@unique` com condição ou raw SQL na migration). Garante no máximo um convite pendente por lead.

## API Design

### `POST /api/leads/[id]/transferencia`
- **Quem:** COLABORADOR
- **Validações:**
  - Lead pertence ao COLABORADOR logado (`lead.id_funcionario === auth.sessao.id_usuario`)
  - `id_funcionario_destino` é COLABORADOR ativo, mesmo PDV, mesma empresa
  - Não existe `TransferenciaLead` PENDENTE para este lead
- **Ação:** Cria `TransferenciaLead` com status `PENDENTE`
- **Response:** `201` com transferência criada

### `PATCH /api/leads/[id]/transferencia`
- **Quem:** COLABORADOR (destinatário do convite)
- **Body:** `{ acao: "ACEITAR" | "RECUSAR" }`
- **Se ACEITAR:**
  - Atualiza `lead.id_funcionario = id_funcionario_destino`
  - Atualiza `TransferenciaLead.status = "ACEITA"`, `respondido_em = now()`
  - Operação em `prisma.$transaction`
- **Se RECUSAR:**
  - Atualiza `TransferenciaLead.status = "RECUSADA"`, `respondido_em = now()`
- **Response:** `200` com lead atualizado (se aceito) ou transferência atualizada (se recusado)

### `DELETE /api/leads/[id]/transferencia`
- **Quem:** COLABORADOR (remetente do convite)
- **Validação:** Existe `TransferenciaLead` PENDENTE onde `id_funcionario_origem === auth.sessao.id_usuario`
- **Ação:** Atualiza `status = "RECUSADA"`, `respondido_em = now()` (soft cancel, preserva histórico)
- **Response:** `200`

### Modificação: `GET /api/leads`
- Cada lead no response agora inclui campo opcional `transferencia_pendente`:
  ```json
  {
    "transferencia_pendente": {
      "id": "...",
      "status": "PENDENTE",
      "origem": { "id": "...", "nome": "..." },
      "destino": { "id": "...", "nome": "..." },
      "criado_em": "..."
    }
  }
  ```
- Para COLABORADOR, o `whereLeadsPorPerfil` é estendido para incluir leads com transferência pendente onde ele é o destinatário (para popular a coluna "Transferências Recebidas")

## UI Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  KANBAN (visão do COLABORADOR destinatário)                              │
│                                                                          │
│  ┌──────────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐  │
│  │ 📥 Transferências│ │ 🟢 Novo  │ │ 🟡 ...   │ │ 🟠 ...   │ │🔴 Ganho│  │
│  │   Recebidas (2)  │ │ Contato  │ │          │ │          │ │ /Perda │  │
│  ├──────────────────┤ │          │ │          │ │          │ │       │  │
│  │ ┌──────────────┐ │ │          │ │          │ │          │ │       │  │
│  │ │ João Silva   │ │ │          │ │          │ │          │ │       │  │
│  │ │ De: Maria     │ │ │          │ │          │ │          │ │       │  │
│  │ │ 📞 (11) 9... │ │ │          │ │          │ │          │ │       │  │
│  │ │ 💰 R$ 50.000 │ │ │          │ │          │ │          │ │       │  │
│  │ │ [✓ Aceitar]  │ │ │          │ │          │ │          │ │       │  │
│  │ │ [✗ Recusar]  │ │ │          │ │          │ │          │ │       │  │
│  │ └──────────────┘ │ │          │ │          │ │          │ │       │  │
│  │ ┌──────────────┐ │ │          │ │          │ │          │ │       │  │
│  │ │ Ana Costa    │ │ │          │ │          │ │          │ │       │  │
│  │ │ De: Pedro     │ │ │          │ │          │ │          │ │       │  │
│  │ │ ...           │ │ │          │ │          │ │          │ │       │  │
│  │ └──────────────┘ │ │          │ │          │ │          │ │       │  │
│  └──────────────────┘ └──────────┘ └──────────┘ └──────────┘ └───────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Drawer de detalhes (COLABORADOR remetente)

No lugar do seletor de Responsável (hoje oculto), o drawer mostra:
- Se **sem transferência pendente**: botão "Transferir Lead" → abre dialog de seleção de destino
- Se **com transferência pendente**: badge "Transferência pendente para Fulano" + botão "Cancelar"

### Card no kanban do remetente

O card do lead que está sendo transferido mostra um indicador visual sutil (ex: borda diferenciada + badge "Transferindo...").

## Risks / Trade-offs

| Risco | Mitigação |
|-------|-----------|
| **Race condition:** dois colaboradores tentam transferir o mesmo lead simultaneamente | `@@unique([id_lead, status])` no banco garante 1 convite pendente por lead. O segundo `POST` recebe `409 Conflict`. |
| **Destinatário inativado durante pendência:** convite fica órfão | `PATCH` (aceitar) valida que `id_funcionario_destino` continua ativo. Se inativado, retorna `400`. Remetente pode cancelar. No futuro, um job pode limpar transfers com destino inativo. |
| **Lead excluído durante pendência:** convite aponta pra lead inexistente | `ON DELETE CASCADE` na FK `id_lead` resolve. `TransferenciaLead` é removida automaticamente. |
| **Convites acumulados sem resposta:** poluição visual | Coluna só aparece quando há pendentes. Badge de contagem no header informa "N pendentes". Sem timeout automático por enquanto (v2). |
| **Colaborador aceita e imediatamente transfere de volta:** ciclo | Válido. Não há restrição de "cooldown". Se abusivo, GERENTE pode intervir com transferência direta. |

## Open Questions

Nenhuma. Todas as decisões de design foram respondidas durante a exploração.

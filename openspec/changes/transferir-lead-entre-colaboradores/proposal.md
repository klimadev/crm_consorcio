## Why

Colaboradores não conseguem transferir leads entre si — a atribuição é fixa e só pode ser alterada por GERENTE ou EMPRESA. Isso trava o fluxo natural de colaboração no PDV: um vendedor sobrecarregado não pode passar leads para um colega com mais disponibilidade, um especialista em determinado nicho não pode receber leads daquele perfil, e ausências (férias, afastamentos) forçam intervenção do gerente para redistribuir manualmente. Permitir que o próprio colaborador transfira, via convite com aceitação, devolve autonomia ao time sem abrir brecha para transferências unilaterais indesejadas.

## What Changes

- Nova tabela `TransferenciaLead` para registrar convites de transferência com status (`PENDENTE`, `ACEITA`, `RECUSADA`)
- Três novas rotas API sob `/api/leads/[id]/transferencia`: `POST` (criar convite), `PATCH` (aceitar/rejeitar), `DELETE` (cancelar)
- `GET /api/leads` modificado para incluir dados de transferência pendente em cada lead no response
- Nova coluna "Transferências Recebidas" no kanban, visível somente quando há convites pendentes para o colaborador logado
- Botão "Transferir" no drawer de detalhes do lead (substitui o seletor de responsável oculto para COLABORADOR)
- Indicador visual "Transferindo..." no card do lead de origem enquanto o convite estiver pendente

## Capabilities

### New Capabilities

- `transferencia-lead`: Convite de transferência de lead entre colaboradores do mesmo PDV — criar, aceitar, rejeitar, cancelar — com coluna dedicada no kanban para convites recebidos.

### Modified Capabilities

<!-- Nenhuma capability existente é modificada — este é um recurso novo. -->

## Impact

- **Schema Prisma**: novo model `TransferenciaLead`, migration necessária
- **API**: 3 novas rotas + modificação em 1 rota existente (`GET /api/leads`)
- **Módulo Kanban**: novos types, hook de dados atualizado, hook de derivações atualizado para separar leads transferência
- **Componentes Kanban**: novo `TransferenciaCard`, coluna extra no `KanbanBoard`, botão no `LeadDetailsTabContent`
- **Permissões**: `COLABORADOR` passará a poder criar/responder transferências; `GERENTE` e `EMPRESA` mantêm poder de transferência direta inalterado

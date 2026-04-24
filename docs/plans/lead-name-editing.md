---
plan name: lead-name-editing
plan description: Implement lead name editing
plan status: done
---

## Idea
Implementar edição do nome do lead no módulo kanban, permitindo que qualquer usuário (COLABORADOR, GERENTE, EMPRESA) edite o nome dos leads que tem acesso, com as devidas validações e controles de permissão.

## Implementation
- 1. Adicionar campo 'nome' ao schema de validação 'esquemaAtualizarLead' em src/lib/validacoes.ts
- 2. Modificar a API route PATCH /api/leads/[id] em src/app/api/leads/[id]/route.ts para permitir atualização do campo nome
- 3. Adicionar verificação de permissão para editing do nome (usuário precisa ter acesso ao lead)
- 4. Adicionar campo de input para editar nome em src/modules/kanban/components/lead-details-tab-content.tsx
- 5. Verificar outros lugares onde lead.name é exibido (kanban-card, etc) e se precisam de atualização em tempo real
- 6. Executar lint para verificar code quality

## Required Specs
<!-- SPECS_START -->
- lead-edit-spec
<!-- SPECS_END -->
---
plan name: kanban-features
plan description: Feature implementation plan
plan status: active
---

## Idea
Implement three features: 1) Dynamic period filter in /kanban, 2) Editing installments, 3) Adding Gestor/Consultor fields after lead approval

## Implementation
- Analyze current kanban filtering system to understand how to add period/date filters
- Examine installment generation and editing components to implement installment editing functionality
- Check Lead type and approval flow to add Gestor/Consultor fields after lead approval
- Implement period filter UI in kanban-header.tsx and corresponding logic in use-kanban-derivacoes.ts
- Create installment editing interface and API endpoints
- Add Gestor/Consultor fields to Lead type and modify approval process to populate these fields
- Test all implemented features thoroughly

## Required Specs
<!-- SPECS_START -->
- kanban-features
<!-- SPECS_END -->
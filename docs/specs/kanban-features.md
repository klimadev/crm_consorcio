# Spec: kanban-features

Scope: feature

# Feature: Kanban Enhancements

## Description
Implement three features for the kanban module:
1. Dynamic period filter in /kanban
2. Editing installments
3. Adding Gestor/Consultor fields after lead approval

## Requirements

### 1. Dynamic Period Filter
- Add date range filter to kanban header
- Allow filtering leads by creation/update date range
- Preserve existing filters (status, origem, pdv, etc.)
- Update kanban derivacoes to apply date filtering

### 2. Editing Installments
- Allow editing existing installments (valor, data_vencimento, etc.)
- Maintain data consistency with lead value
- Provide validation for installment edits
- Support bulk operations if needed

### 3. Gestor/Consultor Fields
- Add gestor_id and consultor_id fields to Lead type
- Populate these fields when lead is approved
- Allow EMPRESA profile to set these fields manually
- Display these fields in lead details

## Technical Details

### Database Changes
- Add gestor_id and consultor_id to leads table (nullable foreign keys to funcionarios)
- Consider adding created_at/updated_at timestamps if not present

### API Changes
- Extend lead approval endpoint to accept gestor/consultor IDs
- Create/edit installment endpoints
- Update kanban filtering to support date ranges

### UI Changes
- Add date range picker to kanban header
- Installment editing modal/form
- Gestor/Consultor selection in lead approval flow
- Display fields in lead details

## Acceptance Criteria
- [ ] Period filter appears in kanban header and functions correctly
- [ ] Installments can be edited without breaking lead data integrity
- [ ] Gestor/Consultor fields are populated on lead approval
- [ ] All existing functionality remains intact
- [ ] Proper validation and error handling implemented
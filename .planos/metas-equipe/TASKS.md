# Tasks - Implementação Metas Equipe

## Fase 1: Banco de Dados
- [ ] **TASK-001** Adicionar modelos Meta e MetaProgresso ao schema.prisma
- [ ] **TASK-002** Executar `npx prisma migrate dev --name add_metas`
- [ ] **TASK-003** Executar `npx prisma generate`

## Fase 2: Backend - Permissões e Tipos
- [ ] **TASK-004** Adicionar tipos Meta em `src/lib/tipos.ts`
- [ ] **TASK-005** Adicionar validações Zod em `src/lib/validacoes.ts`
- [ ] **TASK-006** Adicionar funções de permissão em `src/lib/permissoes.ts`

## Fase 3: Backend - API Routes
- [ ] **TASK-007** Criar GET/POST `/api/metas`
- [ ] **TASK-008** Criar PATCH/DELETE `/api/metas/[id]`
- [ ] **TASK-009** Criar GET `/api/metas/[id]/progresso`
- [ ] **TASK-010** Criar GET `/api/metas/ranking`
- [ ] **TASK-011** Criar POST `/api/metas/validar-teto`

## Fase 4: Frontend - ViewModel
- [ ] **TASK-012** Criar `src/modules/equipe/types/metas.ts` (tipos do módulo)
- [ ] **TASK-013** Criar `src/modules/equipe/hooks/use-metas-module.ts`

## Fase 5: Frontend - Componentes Shared
- [ ] **TASK-014** Criar `src/modules/equipe/components/metas/progress-ring.tsx`
- [ ] **TASK-015** Criar `src/modules/equipe/components/metas/index.ts`

## Fase 6: Frontend - Admin/Gerente
- [ ] **TASK-016** Criar `src/modules/equipe/components/metas/meta-form-dialog.tsx`
- [ ] **TASK-017** Criar `src/modules/equipe/components/metas/meta-pdv-card.tsx`
- [ ] **TASK-018** Criar `src/modules/equipe/components/metas/meta-individual-card.tsx`
- [ ] **TASK-019** Criar `src/modules/equipe/components/metas/meta-admin-panel.tsx`
- [ ] **TASK-020** Criar `src/app/(dashboard)/equipe/metas/page.tsx`

## Fase 7: Frontend - Colaborador
- [ ] **TASK-021** Criar `src/modules/equipe/components/metas/meta-colaborador-card.tsx`
- [ ] **TASK-022** Criar `src/modules/equipe/components/metas/ranking-widget.tsx`
- [ ] **TASK-023** Criar `src/app/(dashboard)/minhas-metas/page.tsx`

## Fase 8: Integração
- [ ] **TASK-024** Adicionar itens à sidebar em `src/components/sidebar-principal.tsx`
- [ ] **TASK-025** Exportar componentes em `src/modules/equipe/index.ts`
- [ ] **TASK-026** Testar fluxo Admin (criar meta global, por PDV, individual)
- [ ] **TASK-027** Testar fluxo Gerente (criar meta para seu PDV)
- [ ] **TASK-028** Testar fluxo Colaborador (ver minhas metas e ranking)

## Fase 9: Validação Final
- [ ] **TASK-029** Executar `npm run build` e verificar erros
- [ ] **TASK-030** Testar permissões (acesso indevido deve ser bloqueado)
- [ ] **TASK-031** Verificar que ranking não expõe valores R$ para colaboradores

---

## Priorização Recomendada

1. **Primeiro:** Tasks 001-003 (BD) - sem isso, nada funciona
2. **Segundo:** Tasks 004-006 (tipos e permissões) - base do backend
3. **Terceiro:** Tasks 007-011 (API) - lógica de negocio
4. **Quarto:** Tasks 012-015 (ViewModel + componentes base)
5. **Quinto:** Tasks 016-020 (Admin)
6. **Sexto:** Tasks 021-023 (Colaborador)
7. **Sétimo:** Tasks 024-031 (integração e testes)

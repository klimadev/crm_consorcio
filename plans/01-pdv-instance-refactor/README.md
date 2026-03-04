# Plano de Refatoracao - Associacao de Instancia WhatsApp por PDV

## Objetivo
Migrar a logica de instancia WhatsApp de `Lead` para `Pdv`, mover a gestao de PDVs para o modulo `Equipe`, remover o controle manual da instancia no drawer do lead e reforcar a regra de inativacao com reatribuicao no mesmo PDV.

## Resultado esperado
- Instancia WhatsApp passa a ser configurada no PDV (`Pdv.id_whatsapp_instancia`).
- Leads herdam instancia por cadeia: `Lead -> Funcionario -> Pdv -> WhatsappInstancia`.
- Modulo `Configs` deixa de ter card de PDV.
- Modulo `Equipe` ganha duas areas: `Colaboradores` e `Gestao de PDVs`.
- Inativacao de colaborador permite reatribuicao apenas para ativos no mesmo PDV.

## Escopo tecnico
- Banco/ORM: `prisma/schema.prisma` + migracao de dados.
- APIs: `/api/pdvs`, `/api/leads`, `/api/whatsapp/chat/messages` (e dependentes `send-message` e `mark-read`).
- Frontend: `src/modules/equipe`, `src/modules/configs`, `src/modules/kanban`.
- Dominio de chat: `src/lib/whatsapp-chat.ts`.

---

## Fase 1 - Modelagem e migracao de dados (Prisma)

### 1.1 Alterar schema Prisma
Arquivo: `prisma/schema.prisma`

1. Em `model Pdv`:
   - Adicionar campo opcional `id_whatsapp_instancia String?`.
   - Adicionar relacao:
     - `whatsapp_instancia WhatsappInstancia? @relation(fields: [id_whatsapp_instancia], references: [id], onDelete: SetNull)`
   - Adicionar indice:
     - `@@index([id_empresa, id_whatsapp_instancia])`

2. Em `model Lead`:
   - Remover `id_whatsapp_instancia String?`.
   - Remover relacao `whatsapp_instancia`.
   - Remover indice dependente do campo antigo (`@@index([id_empresa, id_whatsapp_instancia])`).

3. Em `model WhatsappInstancia`:
   - Remover `leads Lead[]`.
   - Adicionar `pdvs Pdv[]`.

### 1.2 Migracao de dados (backfill)
Criar migracao com script SQL/TS para transferir dados legados:

Regra de backfill por PDV:
1. Obter todos os leads com instancia definida.
2. Agrupar por `id_pdv` do funcionario do lead.
3. Escolher instancia do PDV por prioridade:
   - Mais frequente entre leads do PDV.
   - Empate: lead mais recente (`atualizado_em` mais novo).
4. Gravar em `pdv.id_whatsapp_instancia`.

Observacao importante:
- Aplicar backfill antes de remover coluna de `Lead` para nao perder historico util.

### 1.3 Validacao da fase
- `prisma generate` sem erro.
- Migracao aplica e rollback funcional em ambiente local.
- Conferencia amostral de PDVs com instancia preenchida conforme regra.

---

## Fase 2 - Refatorar resolucao de instancia no dominio de chat

### 2.1 Atualizar `src/lib/whatsapp-chat.ts`

1. Ajustar tipo `LeadComAcesso`:
   - Remover dependencia de `id_whatsapp_instancia` do lead.

2. Refatorar `resolverInstanciaDoLead(idEmpresa, leadId)`:
   - Buscar lead por empresa.
   - Navegar via funcionario -> pdv -> id_whatsapp_instancia.
   - Buscar instancia final por `id` e `id_empresa`.
   - Retornar `{ id, instanceName }` (sem mudar contrato externo).

3. Atualizar mensagens de erro de ausencia de configuracao:
   - Padrao recomendado: `Lead sem instancia WhatsApp configurada no PDV.`

### 2.2 Endpoints dependentes
Validar que continuam usando `resolverInstanciaDoLead` sem conhecer detalhes:
- `src/app/api/whatsapp/chat/messages/route.ts`
- `src/app/api/whatsapp/chat/send-message/route.ts`
- `src/app/api/whatsapp/chat/mark-read/route.ts`

### 2.3 Validacao da fase
- Chat leitura/envio/mark-read resolve instancia do PDV.
- Sem queries restantes para `lead.id_whatsapp_instancia`.

---

## Fase 3 - Refatorar APIs de Leads e PDVs

### 3.1 Leads: remover atribuicao manual de instancia

Arquivos:
- `src/app/api/leads/route.ts`
- `src/app/api/leads/[id]/route.ts`
- `src/lib/validacoes.ts`

Acoes:
1. `POST /api/leads`:
   - Remover leitura de `id_whatsapp_instancia` do payload.
   - Remover validacao/permissao associada.
   - Criar lead sem campo de instancia.

2. `PATCH /api/leads/[id]`:
   - Remover suporte a alteracao de `id_whatsapp_instancia`.

3. Validacao Zod:
   - Remover `id_whatsapp_instancia` de `esquemaCriarLead`.

### 3.2 PDVs: incluir instancia WhatsApp padrao e membros

Arquivos:
- `src/app/api/pdvs/route.ts`
- `src/app/api/pdvs/[id]/route.ts`

Acoes:
1. `GET /api/pdvs` deve retornar estrutura enriquecida:
   - `id`, `nome`, `id_whatsapp_instancia`
   - `whatsapp_instancia` (id, nome, status)
   - `funcionarios` ativos do PDV (id, nome, cargo)

2. `POST /api/pdvs`:
   - Aceitar opcional `id_whatsapp_instancia`.
   - Validar pertence a mesma empresa.

3. `PATCH /api/pdvs/[id]`:
   - Permitir atualizar `nome` e `id_whatsapp_instancia` (incluindo `null`).
   - Validar escopo de tenant.

4. `DELETE /api/pdvs/[id]` (opcional de endurecimento):
   - Bloquear exclusao se houver funcionarios vinculados.
   - Mensagem clara orientando realocacao previa.

### 3.3 Validacao da fase
- APIs respeitam `exigirSessao`, permissao e validacao Zod.
- Sem regressao de multi-tenant (`id_empresa` em todos os where relevantes).

---

## Fase 4 - Redesign da UX no modulo Equipe

### 4.1 Estrutura de pagina
Arquivo: `src/modules/equipe/page.tsx`

1. Manter header e KPIs existentes.
2. Abaixo dos KPIs, criar alternancia visual em duas areas:
   - `Colaboradores`
   - `Gestao de PDVs`

Sugestao de composicao:
- `components/equipe-tabs.tsx`
- `components/pdv-management/pdv-management-panel.tsx`
- `components/pdv-management/pdv-card.tsx`

### 4.2 Painel de Gestao de PDVs
Cada card de PDV deve conter:
1. Nome do PDV.
2. Dropdown `Instancia WhatsApp Padrao` (dados de `/api/whatsapp/instances`).
3. Lista de colaboradores ativos no PDV.

Estados de UX obrigatorios:
- Carregando (skeleton/spinner).
- Salvando instancia (botao/select desabilitado + feedback visual).
- Erro de salvamento (alerta com mensagem).

### 4.3 Hook principal da Equipe
Arquivo: `src/modules/equipe/hooks/use-equipe-module.ts`

Adicionar:
- Estado de aba ativa (`"colaboradores" | "pdvs"`).
- Carregamento de PDVs enriquecidos.
- Carregamento de instancias WhatsApp.
- Acao `atualizarInstanciaPadraoPdv(idPdv, idInstancia|null)`.

Manter:
- Fluxos de listagem, edicao e lote de colaboradores.

### 4.4 Validacao da fase
- UI mostra duas areas conforme especificacao.
- Gestao de instancia por PDV funcional e persistida via API.

---

## Fase 5 - Remover PDV de Configs

Arquivos:
- `src/modules/configs/page.tsx`
- `src/modules/configs/hooks/use-configs-module.ts`
- `src/modules/configs/types.ts`
- `src/modules/configs/components/pdv-card.tsx` (remover uso; decidir manter ou deletar)

Acoes:
1. Remover card de PDV da tela de Configs.
2. Limpar estado, fetch e handlers de PDV do hook.
3. Manter apenas estagios e mensagens de erro relacionadas.

Validacao:
- Modulo Configs sem referencias a `/api/pdvs`.

---

## Fase 6 - Kanban: remover seletor de instancia do lead

### 6.1 Drawer de detalhes
Arquivo: `src/modules/kanban/components/lead-details-drawer.tsx`

Remover:
- Dropdown `Instancia WhatsApp do lead`.
- Fetch de instancias WhatsApp no drawer.

Manter/ajustar:
- Mensagem de chat bloqueado, agora baseada em configuracao do PDV.

### 6.2 Tipos e hook do Kanban
Arquivos:
- `src/modules/kanban/types.ts`
- `src/modules/kanban/hooks/use-kanban-module.ts`

Acoes:
1. Remover `id_whatsapp_instancia` do tipo `Lead` do modulo.
2. Remover envio de `id_whatsapp_instancia` no `PATCH /api/leads/:id`.
3. Ajustar lead temporario de criacao para novo contrato.

Validacao:
- Drawer sem seletor de instancia.
- Salvar detalhes do lead sem campo legado.

---

## Fase 7 - Inativacao de colaborador com restricao de mesmo PDV

### 7.1 Backend
Arquivo: `src/app/api/funcionarios/[id]/inativar/route.ts`

Regras novas:
1. Destino deve ser ativo e da mesma empresa.
2. Destino deve ter `id_pdv` igual ao `id_pdv` do colaborador origem.
3. Se invalido, retornar erro 400 com mensagem clara.

### 7.2 Frontend (Equipe)
Arquivos:
- `src/modules/equipe/hooks/use-equipe-module.ts`
- `src/modules/equipe/components/dialogs/inativacao-dialog.tsx`

Acoes:
1. Ao abrir dialog de inativacao, filtrar destino para ativos no mesmo PDV e `id != origem`.
2. Se lista vazia, exibir aviso:
   - `Nenhum colaborador no mesmo PDV. Atribua a um gerente geral.`
3. Bloquear confirmacao enquanto nao houver destino valido.

Observacao:
- Se regra de "gerente geral" exigir excecao no backend, formalizar criterio (ex: cargo ADMINISTRADOR) e alinhar API + UI.

---

## Fase 8 - Busca de regressao e limpeza final

1. Buscar referencias legadas:
   - `id_whatsapp_instancia` aplicado a `Lead`.
2. Atualizar testes afetados.
3. Revisar contratos TS entre API e modulos.
4. Validar permissao por perfil em novos fluxos de PDV.

---

## Checklist de execucao para IA (passo a passo)

1. Atualizar Prisma schema e gerar migracao com backfill.
2. Refatorar `whatsapp-chat.ts` para resolver instancia via PDV.
3. Ajustar APIs de Leads e validacoes Zod.
4. Ajustar APIs de PDV para instancia padrao + membros.
5. Redesenhar `modules/equipe` com tabs e painel de PDVs.
6. Remover PDV de `modules/configs`.
7. Remover seletor de instancia do `LeadDetailsDrawer` e ajustar kanban hook/types.
8. Aplicar regra de inativacao por mesmo PDV (backend + dialog).
9. Rodar validacao tecnica (lint/build/testes), corrigir e repetir ate verde.

---

## Criterios de aceite

- [ ] Nenhum endpoint de lead aceita/retorna atribuicao manual de instancia por lead.
- [ ] Cada PDV pode configurar uma instancia WhatsApp padrao.
- [ ] Chat WhatsApp funciona para lead quando PDV do funcionario tem instancia.
- [ ] `Configs` nao exibe mais gestao de PDV.
- [ ] `Equipe` possui area `Gestao de PDVs` com card completo (nome, instancia, colaboradores).
- [ ] Inativacao individual so permite destino no mesmo PDV.
- [ ] Mensagem de aviso aparece quando nao ha destino no mesmo PDV.
- [ ] Lint/build/testes relevantes passam.

---

## Prompt recomendado para execucao por outro modelo

"Implemente o plano em `plans/01-pdv-instance-refactor/README.md` em fases, sem quebrar multi-tenant e seguindo padrao MVVM modular deste repo. Execute migracao Prisma com backfill de instancia por PDV, refatore APIs, atualize `modules/equipe` e `modules/kanban`, remova PDV de `modules/configs`, e finalize com lint/build/testes. Em cada fase, gere diff objetivo e valide contratos TS + regras de permissao."

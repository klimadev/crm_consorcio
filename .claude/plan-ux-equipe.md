# Plano: Melhorias de UX no Módulo Equipe

## Problemas Identificados

### Problema 1: Edição de colaborador dentro do drawer do PDV não é inline
- **Onde**: `pdv-management-panel.tsx` (linhas 528-685)
- **Fluxo atual**: Abre drawer de colaboradores do PDV → clica "Editar" → drawer troca conteúdo para formulário de edição (modo separado) → salva/cancela → volta para lista → fecha drawer
- **Problema**: O usuário precisa manualmente sair do modo de edição antes de voltar à lista. Quebra a fluidez.
- **Esperado**: Clica "Editar" → campos ficam editáveis inline na própria linha (como no card do PDV) → salva com um botão na linha

### Problema 2: GERENTE vê todos os PDVs (deveria ver só os seus)
- **Onde API**: `/api/pdvs/route.ts` linha 15 — `prisma.pdv.findMany` sem filtro de perfil
- **Onde frontend**: `use-pdv-management.ts` linha 54-67 — `listarPdvs()` sem passar id_pdv
- **Problema**: O GERENTE vê cards de todos os PDVs da empresa, mesmo estando restrito a um PDV específico
- **Esperado**: GERENTE só vê o(s) PDV(s) que gerencia; EMPRESA vê todos

### Problema 3: GERENTE não pode editar colaboradores do próprio PDV
- **Onde**: `pdv-management-panel.tsx` linha 951 — `podeGerenciarColaboradorNoDrawer` só permite edição para `podeGerenciarEmpresa || podeExecutarAcoesLote`
- **Problema**: GERENTE pode ver colaboradores mas não editar inline
- **Esperado**: GERENTE pode editar nome/email/cargo (limitado a COLABORADOR) dos colaboradores do seu PDV

### Problema 4: Estrutura de UX confusa
- Múltiplos drawers aninhados (PDV → colaboradores → edição)
- Tabs separadas dentro do drawer de edição
- Diálogos sobrepostos (senha, inativação, cadastro)
- O header mostra KPIs que podem ser confusos

---

## Fases de Implementação

### Fase 1: Edição Inline no Drawer de Colaboradores do PDV

**Arquivos**: `pdv-management-panel.tsx`, `types.ts`

**O que fazer**:
1. Substituir o modo de edição separado (linhas 528-685) por edição inline na linha do colaborador
2. Quando clicar "Editar", a linha se transforma em inputs inline (nome, email, cargo num select)
3. Botões "Salvar" e "Cancelar" aparecem na própria linha
4. Usar o `statusSalvamento` existente para feedback

**Verificação**:
- [ ] Clicar "Editar" em um colaborador mostra inputs inline na linha
- [ ] Salvar persiste e volta ao modo visual
- [ ] Cancelar descarta alterações
- [ ] Status de salvamento aparece na linha (spinner, erro)

### Fase 2: Filtro de PDVs por Perfil GERENTE

**Arquivos**: `/api/pdvs/route.ts`, `use-pdv-management.ts`, `types.ts`

**O que fazer**:
1. **Backend**: Adicionar filtro no GET `/api/pdvs` — se perfil for GERENTE, filtrar por `id_pdv` da sessão
2. **Frontend**: Passar `id_pdv` para o hook `usePdvManagement`
3. O GERENTE só vê o card do seu PDV

**Verificação**:
- [ ] GERENTE vê apenas 1 card de PDV (seu próprio)
- [ ] EMPRESA continua vendo todos
- [ ] KPIs refletem apenas os funcionários do PDV do GERENTE

### Fase 3: Permitir GERENTE Editar Colaboradores

**Arquivos**: `pdv-management-panel.tsx`, `api/funcionarios/[id]/route.ts`

**O que fazer**:
1. **Frontend**: `podeGerenciarColaboradorNoDrawer` incluir GERENTE do próprio PDV
2. **Backend**: API de edição de funcionário (`PATCH /api/funcionarios/[id]`) já permite GERENTE editar colaborador no próprio PDV — verificar e garantir

**Verificação**:
- [ ] GERENTE vê botão "Editar" nos colaboradores do seu PDV
- [ ] GERENTE pode salvar alterações (nome, email, cargo → só COLABORADOR)
- [ ] GERENTE **não** vê botão "Editar" em colaboradores de outros PDVs

### Fase 4: Simplificar Estrutura de Navegação

**Arquivos**: `page.tsx`, `equipe-header.tsx`, `pdv-management-panel.tsx`

**O que fazer**:
1. Clarificar o header: mostrar qual PDV está selecionado quando GERENTE
2. Simplificar o fluxo: do card do PDV vai direto pra lista de colaboradores (sem tantos drawers aninhados)
3. Separar responsabilidades: lista de funcionários principal vs PDV management

**Verificação**:
- [ ] Header mostra contexto claro (qual PDV, perfil)
- [ ] Navegação entre PDVs é óbvia
- [ ] Drawers não aninham mais de 1 nível

---

## Anti-Patterns a Evitar

- ❌ Não criar estado global duplicado — usar o vm (view model) existente
- ❌ Não quebrar a API existente — adicionar filtro opcional mantendo compatibilidade
- ❌ Não remover permissões de EMPRESA — só adicionar permissões para GERENTE
- ❌ Não recriar componentes do zero — modificar os existentes (pdv-management-panel, drawer)
- ❌ Não misturar concerns de edição inline com batch actions

## Padrões Existentes a Seguir

- **Inline editing**: Já existe no PDV card (linhas 389-413 de `pdv-management-panel.tsx`) — seguir o mesmo padrão de inputs + botões salvar/cancelar
- **View model pattern**: Toda lógica de estado centralizada no hook `useEquipeModule`
- **API pattern**: `fetch` → `lerJsonSeguro` → `ResultadoApi<T>` → `{ ok, dados/erro }`
- **Toast feedback**: `addToast` para sucesso/erro
- **Sheet component**: `@/components/ui/sheet` para drawers

## Permissionamento Atual (Extraído do Código)

| Ação | EMPRESA | GERENTE | COLABORADOR |
|------|---------|---------|-------------|
| Ver equipe | ✅ | ✅ (só seu PDV) | ❌ |
| Adicionar funcionário | ✅ | ✅ (só COLABORADOR no seu PDV) | ❌ |
| Editar funcionário | ✅ | ✅ (só COLABORADOR) | ❌ |
| Inativar funcionário | ✅ | ✅ (só COLABORADOR) | ❌ |
| Ações em lote | ✅ | ✅ (limitado) | ❌ |
| Gerenciar PDVs | ✅ | ❌ | ❌ |
| Login como | ✅ | ❌ | ❌ |

## Fluxo de Navegação Desejado (Pós-Fix)

```
[Header: KPIs + Contexto do PDV]
  ├── [Cards de PDV] (GERENTE vê 1, EMPRESA vê N)
  │     └── Clique → Drawer "Colaboradores do PDV"
  │           ├── Lista de colaboradores com inline edit
  │           ├── Busca + Ordenação + Filtros
  │           ├── Adicionar novo (expansível)
  │           └── Ações em lote (se permissionado)
  └── [Tabela principal de funcionários] (apenas EMPRESA)
```


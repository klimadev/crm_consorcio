# Spec: lead-edit-spec

Scope: feature

# Especificação: Edição do Nome do Lead no Kanban

## Objetivo
Permitir a edição do nome do lead após sua criação no módulo kanban, mantendo consistência e controles de permissão.

## Arquivos a Modificar

### 1. Validação (`src/lib/validacoes.ts`)
**Local:** Linha ~242 (após `esquemaAtualizarLead`)
```typescript
// Adicionar campo nome
nome: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres.").max(200, "Nome muito longo.").optional(),
```

### 2. API Route (`src/app/api/leads/[id]/route.ts`)
**Local:** Linha ~181 (no `prisma.lead.update`)
```typescript
// Adicionar no data do update
nome: dadosValidados.nome,
```
**Nota:** A verificação de permissão já existe via `whereLeadsPorPerfil` - o usuário já só consegue editar leads que tem acesso.

### 3. Tipo API (`src/lib/api/kanban.ts`)
**Local:** Linha ~31-38 (PayloadAtualizarLeadKanban)
```typescript
// Adicionar ao tipo
nome?: string;
```

### 4. Hook (`src/modules/kanban/hooks/use-kanban-detalhes-lead.ts`)
**Local:** Linha ~102-109 (chamada atualizarLeadKanban)
```typescript
// Adicionar no payload
nome: lead.nome,
```
**Local:** Linha ~157-163 (removerDocumento)
```typescript
// Também adicionar no payload
nome: leadSelecionado.nome,
```

### 5. UI (`src/modules/kanban/components/lead-details-tab-content.tsx`)
**Local:** Sugestão - Linha ~208 (antes do campo telefone)
```tsx
<div className="space-y-2">
  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
    <User className="h-4 w-4 text-success" />
    Nome
  </label>
  <Input
    className="h-11 rounded-xl"
    value={leadSelecionado.nome}
    onChange={(e) => onMudarLead({ ...leadSelecionado, nome: e.target.value })}
  />
</div>
```
**Nota:** O campo deve ser editável para todos os perfis (COLABORADOR, GERENTE, EMPRESA).

## Regras de Negócio

1. **Permissão:** Qualquer usuário com acesso ao lead pode editar o nome
   - COLABORADOR: apenas seus próprios leads
   - GERENTE: todos os leads do seu PDV
   - EMPRESA: qualquer lead

2. **Validação:**
   - Mínimo: 2 caracteres
   - Máximo: 200 caracteres
   - Trim nos espaços extras

3. **Consistência:**
   - A atualização é refletida automaticamente via auto-save (1.8s)
   - O lead é atualizado em toda a lista de leads do kanban
   - O drawer de detalhes mostra o nome atualizado imediatamente

## Fluxo de Execução

1. Adicionar campo `nome` em `src/lib/validacoes.ts` schema
2. Modificar API route PATCH para incluir nome no update
3. Adicionar campo `nome` ao tipo PayloadAtualizarLeadKanban
4. Adicionar `nome` no payload das chamadas em use-kanban-detalhes-lead.ts
5. Adicionar InputField para nome em lead-details-tab-content.tsx
6. Executar `pnpm lint` para validação
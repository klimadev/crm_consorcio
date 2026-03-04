# Plano de Correção - Bugs de Lógica de Negócio CRM Consórcio

## Visão Geral

Este documento detalha a correção de **11 bugs de lógica de negócio** identificados no CRM, separados em 3 fases de implementação.

### Perfis do Sistema
- **EMPRESA**: Administrador (acesso total)
- **GERENTE**: Gestão de um PDV específico
- **COLABORADOR**: Vendedor (acesso restrito ao próprio)

### Regra de Negócio Fundamental
> **GERENTE deve ver e operar apenas sobre dados do seu PDV**, com exceção de poder adicionar COLABORADORES ao seu próprio PDV.

---

## Fase 1: Backend Crítico (Urgente)

### Bug #1: Inativação de Funcionários Sem Restrição de PDV

**Arquivo**: `src/lib/permissoes.ts`  
**Função**: `podeInativarComReatribuicao()` (linhas 45-47)

#### Problema
```typescript
// ❌ ATUAL:
export function podeInativarComReatribuicao(sessao: SessaoToken) {
  return sessao.perfil === "EMPRESA" || sessao.perfil === "GERENTE";
}
```
Retorna `true` para GERENTE sem verificar se o funcionário pertence ao PDV do gerente.

#### Correção
```typescript
// ✅ CORRIGIDO:
export async function podeInativarComReatribuicao(sessao: SessaoToken) {
  // EMPRESA pode inativar qualquer funcionário
  if (sessao.perfil === "EMPRESA") {
    return true;
  }
  // GERENTE pode inativar apenas funcionários do próprio PDV
  if (sessao.perfil === "GERENTE" && sessao.id_pdv) {
    return true;
  }
  return false;
}
```

**Também necessário**: Modificar `src/app/api/funcionarios/[id]/inativar/route.ts` para verificar se o funcionário a ser inativado pertence ao PDV do gerente:

```typescript
// Adicionar na linha ~39, após buscar funcionárioOrigem:
if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
  if (funcionarioOrigem.id_pdv !== auth.sessao.id_pdv) {
    return NextResponse.json(
      { erro: "Você só pode inativar colaboradores do seu PDV." },
      { status: 403 }
    );
  }
}
```

---

### Bug #2: Atualização PATCH de Funcionários Sem Restrição de PDV

**Arquivo**: `src/lib/permissoes.ts`  
**Função**: `podeEditarEquipe()` (linhas 41-43)

#### Problema
```typescript
// ❌ ATUAL:
export function podeEditarEquipe(sessao: SessaoToken) {
  return sessao.perfil === "EMPRESA" || sessao.perfil === "GERENTE";
}
```
GERENTE pode editar qualquer funcionário da empresa.

#### Correção
```typescript
// ✅ CORRIGIDO:
export function podeEditarEquipe(sessao: SessaoToken) {
  // EMPRESA pode editar qualquer funcionário
  if (sessao.perfil === "EMPRESA") {
    return true;
  }
  // GERENTE pode editar (mas a API deve validar o PDV)
  if (sessao.perfil === "GERENTE" && sessao.id_pdv) {
    return true;
  }
  return false;
}
```

**Também necessário**: Modificar `src/app/api/funcionarios/[id]/route.ts` para verificar PDV:

```typescript
// Adicionar após buscar funcionárioAtual (~linha 45):
if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
  if (funcionarioAtual.id_pdv !== auth.sessao.id_pdv) {
    return NextResponse.json(
      { erro: "Você só pode editar colaboradores do seu PDV." },
      { status: 403 }
    );
  }
}
```

---

### Bug #3: Mover Leads Sem Restrição de PDV para GERENTE

**Arquivo**: `src/app/api/leads/[id]/mover/route.ts`

#### Problema
Linhas 30-46 verificam apenas se é COLABORADOR e responsável, não verificam PDV do GERENTE.

#### Correção
Adicionar verificação de PDV após a busca do lead:

```typescript
// Após linha ~46, adicionar:
if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
  // Buscar o funcionário responsável para verificar se é do mesmo PDV
  const leadComFuncionario = await prisma.lead.findFirst({
    where: { id, id_empresa: auth.sessao.id_empresa },
    include: { funcionario: { select: { id_pdv: true } } }
  });
  
  if (leadComFuncionario?.funcionario.id_pdv !== auth.sessao.id_pdv) {
    return NextResponse.json(
      { erro: "Você só pode mover leads do seu PDV." },
      { status: 403 }
    );
  }
}
```

---

### Bug #4: Atualização (PATCH) de Leads Sem Restrição de PDV

**Arquivo**: `src/app/api/leads/[id]/route.ts`  
**Método**: PATCH (linhas 25-37)

#### Problema
Verifica apenas COLABORADOR e responsável, não valida PDV para GERENTE.

#### Correção
```typescript
// Substituir linhas 25-37:

const lead = await prisma.lead.findFirst({
  where: {
    id,
    id_empresa: auth.sessao.id_empresa,
    ...(auth.sessao.perfil === "COLABORADOR"
      ? { id_funcionario: auth.sessao.id_usuario }
      : auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv
        ? {} // GERENTE pode ver todos do PDV, validado abaixo
        : {}),
  },
  include: { funcionario: { select: { id_pdv: true } } }
});

// Adicionar validação de PDV para GERENTE:
if (!lead) {
  return NextResponse.json({ erro: "Lead nao encontrado." }, { status: 404 });
}

if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
  if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
    return NextResponse.json(
      { erro: "Você só pode editar leads do seu PDV." },
      { status: 403 }
    );
  }
}
```

---

### Bug #5: Exclusão (DELETE) de Leads Sem Restrição de PDV

**Arquivo**: `src/app/api/leads/[id]/route.ts`  
**Método**: DELETE (linhas 61-73)

#### Correção
Aplicar mesma lógica do Bug #4:

```typescript
// Similar ao PATCH, adicionar validação:
// Buscar lead com include de funcionário, depois validar:
if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
  if (lead.funcionario.id_pdv !== auth.sessao.id_pdv) {
    return NextResponse.json(
      { erro: "Você só pode excluir leads do seu PDV." },
      { status: 403 }
    );
  }
}
```

---

### Bug #6: Pendências Sem Filtro de PDV para GERENTE

**Arquivo**: `src/app/api/pendencias/route.ts`  
**Função**: GET (linhas 12-15)

#### Problema
```typescript
// ❌ ATUAL:
const pendencias = await detectarPendenciasDinamicas(
  auth.sessao.id_empresa,
  auth.sessao.perfil === "COLABORADOR" ? auth.sessao.id_usuario : undefined
);
// ❌ Se for GERENTE, passa undefined = vê tudo da empresa
```

#### Correção
```typescript
// ✅ CORRIGIDO:
async function whereLeadsPorPerfil(sessao: SessaoToken) {
  if (sessao.perfil === "COLABORADOR") {
    return { id_funcionario: sessao.id_usuario };
  }
  
  if (sessao.perfil === "GERENTE" && sessao.id_pdv) {
    // Buscar IDs dos funcionários do PDV do gerente
    const funcionariosDoPdv = await prisma.funcionario.findMany({
      where: { id_pdv: sessao.id_pdv },
      select: { id: true }
    });
    return { id_funcionario: { in: funcionariosDoPdv.map(f => f.id) } };
  }
  
  // EMPRESA vê tudo
  return {};
}

const whereLeads = await whereLeadsPorPerfil(auth.sessao);
const pendencias = await detectarPendenciasDinamicas(
  auth.sessao.id_empresa,
  auth.sessao.perfil === "COLABORADOR" ? auth.sessao.id_usuario : undefined,
  whereLeads // parâmetro adicional para filtrar por PDV
);
```

**Também necessário**: Modificar `src/lib/pendencias-dinamicas.ts`:

```typescript
// Alterar assinatura da função:
export async function detectarPendenciasDinamicas(
  idEmpresa: string,
  idFuncionario?: string,
  whereAdicional?: { id_funcionario?: { in: string[] } }
): Promise<PendenciaDinamica[]> {
  
  const whereLead: { id_empresa: string; id_funcionario?: string; id_funcionario?: { in: string[] } } = 
    { id_empresa: idEmpresa };
  
  if (idFuncionario) {
    whereLead.id_funcionario = idFuncionario;
  }
  
  if (whereAdicional?.id_funcionario) {
    whereLead.id_funcionario = whereAdicional.id_funcionario;
  }
  // ... resto do código
}
```

---

## Fase 2: Frontend + Backend (Importante)

### Bug #7: Lista de Funcionários na API de Leads Não Filtrada por PDV

**Arquivo**: `src/app/api/leads/route.ts`  
**Método**: GET (linhas 24-29)

#### Problema
Retorna TODOS os funcionários da empresa, não filtra por PDV.

#### Correção
```typescript
// Modificar a busca de funcionários na rota GET /api/leads:

// 1. Se COLABORADOR: retorna apenas ele mesmo
// 2. Se GERENTE: retorna apenas funcionários do seu PDV
// 3. Se EMPRESA: retorna todos

let whereFuncionarios = { id_empresa: auth.sessao.id_empresa, ativo: true };

if (auth.sessao.perfil === "GERENTE" && auth.sessao.id_pdv) {
  whereFuncionarios = {
    ...whereFuncionarios,
    id_pdv: auth.sessao.id_pdv
  };
}

const funcionarios = await prisma.funcionario.findMany({
  where: whereFuncionarios,
  select: { id: true, nome: true },
  orderBy: { nome: "asc" },
});
```

---

### Bug #8: Frontend Kanban - Criar Lead Permite Qualquer Funcionário

**Arquivo**: `src/modules/kanban/components/kanban-header.tsx`  
**Componente**: Dropdown de seleção de funcionário (linha 305)

#### Problema
O componente verifica `perfil !== "COLABORADOR"` mas não bloqueia GERENTE de selecionar funcionários de outros PDVs.

#### Correção
O frontend já deve receber a lista filtrada de funcionários da API (Bug #7). A correção principal é no backend.

Opcionalmente, adicionar validação adicional no frontend:

```typescript
// No hook use-kanban-module.ts, adicionar prop id_pdv e filtrar:
const funcionariosDoPdv = useMemo(() => {
  if (perfil === "GERENTE" && id_pdv) {
    // A API já deve retornar apenas funcionários do PDV
    return funcionarios;
  }
  return funcionarios;
}, [funcionarios, perfil, id_pdv]);
```

---

## Fase 3: Refinamento

### Bug #9: Variável Redundante no Frontend Equipe

**Arquivo**: `src/modules/equipe/hooks/use-equipe-module.ts`  
**Linha**: 156

#### Problema
```typescript
const podeAdicionarFuncionario = perfil === "EMPRESA" || perfil === "GERENTE";
```
Variável definida mas nunca utilizada.

#### Análise
Na verdade, esta variável **deveria** ser usada para controlar a visibilidade do botão "Adicionar Colaborador", mas foi substituída pela função `abrirDialogNovoFuncionario` que já faz essa lógica internamente.

#### Correção (Opcional)
Remover a variável se não for usada, ou documentar que foi substituída pela lógica de `abrirDialogNovoFuncionario`.

---

## Checklist de Testes

### Para cada bug corrigido, testar:

| Cenário | Resultado Esperado |
|---------|-------------------|
| Login como EMPRESA | Acesso total a todos os dados |
| Login como GERENTE | Apenas dados do seu PDV |
| Login como COLABORADOR | Apenas seus próprios leads |

### Testes Específicos:

1. **Inativação**: GERENTE tenta inativar funcionário de outro PDV → Erro "Sem permissão"
2. **Edição**: GERENTE tenta editar funcionário de outro PDV → Erro "Sem permissão"  
3. **Mover Lead**: GERENTE tenta mover lead de outro PDV → Erro "Sem permissão"
4. **Editar Lead**: GERENTE tenta editar lead de outro PDV → Erro "Sem permissão"
5. **Excluir Lead**: GERENTE tenta excluir lead de outro PDV → Erro "Sem permissão"
6. **Pendências**: GERENTE visualiza apenas pendências do seu PDV
7. **Funcionários (Kanban)**: GERENTE vê apenas funcionários do seu PDV ao criar lead
8. **Criar Lead**: GERENTE só pode atribuir a funcionários do seu PDV

---

## Observações Importantes

### Funções de Permissão em `src/lib/permissoes.ts`

O arquivo contém todas as funções de permissão centralizadas:

```typescript
// Funções existentes:
podeGerenciarEmpresa(sessao)         // → EMPRESA
podeVerEquipe(sessao)                // → EMPRESA | GERENTE
podeEditarEquipe(sessao)             // → EMPRESA | GERENTE (corrigir)
podeInativarComReatribuicao(sessao)  // → EMPRESA | GERENTE (corrigir)
podeExecutarAcoesEmLote(sessao)      // → EMPRESA
whereLeadsPorPerfil(sessao)          // → Filtro correto por perfil

// Função nova necessária:
podeAcessarLead(lead, sessao)        // → Valida acesso por PDV
```

### Padrão de Validação de PDV

Para GERENTE, sempre validar:
```typescript
if (sessao.perfil === "GERENTE" && sessao.id_pdv) {
  if (dado.id_pdv !== sessao.id_pdv) {
    return respostaSemPermissao();
  }
}
```

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/permissoes.ts` | Funções `podeInativarComReatribuicao`, `podeEditarEquipe` |
| `src/lib/pendencias-dinamicas.ts` | Parâmetro adicional para filtro de PDV |
| `src/app/api/funcionarios/[id]/inativar/route.ts` | Validação de PDV |
| `src/app/api/funcionarios/[id]/route.ts` | Validação de PDV |
| `src/app/api/leads/[id]/route.ts` | Validação de PDV em PATCH e DELETE |
| `src/app/api/leads/[id]/mover/route.ts` | Validação de PDV |
| `src/app/api/pendencias/route.ts` | Filtro de PDV para GERENTE |
| `src/app/api/leads/route.ts` | Filtrar lista de funcionários por PDV |

---

*Documento gerado automaticamente para correção dos bugs de lógica de negócio do CRM Consórcio.*

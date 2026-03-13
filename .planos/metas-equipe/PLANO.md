# Plano de Implementação: Módulo de Metas para Equipe

## Visão Geral

Este documento detalha o plano de implementação para adicionar o sistema de metas ao módulo Equipe do CRM Consórcio. O sistema permitirá que Admin/Gerente definam metas (globais, por PDV e individuais) e que colaboradores acompanhem seu progresso de forma motivacional.

**Última atualização:** 2026-03-13  
**Status:** Pronto para Implementação

---

## 1. Estrutura de Arquivos

### 1.1 Arquivos a Criar

```
src/
├── app/
│   └── api/
│       └── metas/
│           ├── route.ts                    # GET (listar), POST (criar)
│           └── [id]/
│               ├── route.ts                # PATCH (editar), DELETE (desativar)
│               └── progresso/
│                   └── route.ts            # GET (calcular progresso)
├── modules/
│   └── equipe/
│       ├── hooks/
│       │   └── use-metas-module.ts         # ViewModel compartilhado
│       └── components/
│           └── metas/
│               ├── index.ts                # Exports
│               ├── metas-header.tsx        # Cabeçalho com abas
│               ├── meta-admin-panel.tsx    # Painel Admin/Gerente
│               ├── meta-colaborador-card.tsx # Card motivacional
│               ├── meta-form-dialog.tsx    # Criar/editar meta
│               ├── ranking-widget.tsx      # Ranking por %
│               ├── meta-pdv-card.tsx       # Card de meta por PDV
│               ├── meta-individual-card.tsx # Card de meta individual
│               └── progress-ring.tsx       # Componente visual
├── app/(dashboard)/
│   ├── equipe/
│   │   └── metas/
│   │       └── page.tsx                    # Página Admin/Gerente
│   └── minhas-metas/
│       └── page.tsx                        # Página Colaborador
```

### 1.2 Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `prisma/schema.prisma` | Adicionar modelos Meta e MetaProgresso |
| `src/lib/permissoes.ts` | Adicionar funções de permissão para metas |
| `src/lib/tipos.ts` | Adicionar tipos relacionados a metas |
| `src/lib/validacoes.ts` | Adicionar schema Zod para validação |
| `src/components/sidebar-principal.tsx` | Adicionar itens de menu |
| `src/app/(dashboard)/layout.tsx` | (se necessário) |
| `src/modules/equipe/index.ts` | Exports dos novos componentes |

---

## 2. Banco de Dados

### 2.1 Novos Modelos Prisma

```prisma
// prisma/schema.prisma (adicionar após model Parcela)

model Meta {
  id              String    @id @default(uuid())
  id_empresa      String
  tipo            String    // "GLOBAL" | "PDV" | "INDIVIDUAL"
  tipo_meta       String    // "VALOR" | "VOLUME"
  alvo            Float     // valor R$ ou quantidade
  periodo         String    // "MENSAIS" | "TRIMESTRAL" | "ANUAL"
  data_inicio     DateTime
  data_fim        DateTime
  ativo           Boolean   @default(true)
  criado_em       DateTime  @default(now())
  
  // Relacionamentos
  id_pdv          String?
  id_funcionario String?
  
  pdv             Pdv?      @relation(fields: [id_pdv], references: [id])
  funcionario     Funcionario? @relation(fields: [id_funcionario], references: [id])
  empresa         Empresa   @relation(fields: [id_empresa], references: [id])
  
  @@index([id_empresa, tipo, ativo])
  @@index([id_pdv])
  @@index([id_funcionario])
}

model MetaProgresso {
  id              String    @id @default(uuid())
  id_meta         String
  id_empresa      String
  periodo         String    // "2026-03" (ano-mês)
  realizado       Float
  atualizado_em   DateTime  @default(now())
  
  meta            Meta      @relation(fields: [id_meta], references: [id], onDelete: Cascade)
  
  @@unique([id_meta, periodo])
  @@index([id_empresa, periodo])
}
```

### 2.2 Script de Migração

```bash
# Executar após adicionar modelos
npx prisma migrate dev --name add_metas
```

---

## 3. Permissões (RBAC)

### 3.1 Funções em `src/lib/permissoes.ts`

```typescript
// Utilitário base
function isAdmin(sessao: SessaoToken) {
  return sessao.perfil === "EMPRESA" || sessao.perfil === "ADMINISTRADOR";
}

// Novas funções
export function podeDefinirMetaGlobal(sessao: SessaoToken) {
  return isAdmin(sessao);
}

export function podeGerenciarMetaDoPdv(sessao: SessaoToken, idPdvAlvo: string) {
  if (isAdmin(sessao)) return true;
  return sessao.perfil === "GERENTE" && sessao.id_pdv === idPdvAlvo;
}

export function podeGerenciarMetaIndividual(sessao: SessaoToken, idFuncionarioAlvo: string) {
  if (isAdmin(sessao)) return true;
  
  if (sessao.perfil === "GERENTE" && sessao.id_pdv) {
    const func = await prisma.funcionario.findFirst({
      where: { id: idFuncionarioAlvo, id_pdv: sessao.id_pdv }
    });
    return func !== null;
  }
  
  return sessao.perfil === "COLABORADOR" && sessao.id_usuario === idFuncionarioAlvo;
}

export function podeVerMetaDeOutros(sessao: SessaoToken) {
  return sessao.perfil !== "COLABORADOR";
}

export function podeVerValoresAbsolutos(sessao: SessaoToken) {
  return isAdmin(sessao) || sessao.perfil === "GERENTE";
}
```

### 3.2 Matriz de Permissões

| Ação | EMPRESA/ADMINISTRADOR | GERENTE | COLABORADOR |
|------|----------------------|---------|-------------|
| Criar meta GLOBAL | ✅ | ❌ | ❌ |
| Criar meta PDV | ✅ (qualquer) | ✅ (próprio) | ❌ |
| Criar meta individual | ✅ (qualquer) | ✅ (seu PDV) | ❌ |
| Ver ranking (%meta) | ✅ | ✅ | ✅ |
| Ver valores R$ absolutos | ✅ | ✅ | ❌ |
| Ver metas de outros | ✅ | ✅ (seu PDV) | ❌ |

---

## 4. Tipos e Validações

### 4.1 Tipos em `src/lib/tipos.ts`

```typescript
// Adicionar
export type TipoMeta = "GLOBAL" | "PDV" | "INDIVIDUAL";
export type TipoMetaValor = "VALOR" | "VOLUME";
export type PeriodoMeta = "MENSAIS" | "TRIMESTRAL" | "ANUAL";

export type Meta = {
  id: string;
  tipo: TipoMeta;
  tipo_meta: TipoMetaValor;
  alvo: number;
  periodo: PeriodoMeta;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  id_pdv?: string | null;
  id_funcionario?: string | null;
  pdv?: { id: string; nome: string } | null;
  funcionario?: { id: string; nome: string } | null;
};

export type MetaProgresso = {
  percentual: number;
  realizado: number;
  meta: number;
  periodo: string;
};

export type RankingItem = {
  id: string;
  nome: string;
  percentual: number;
  posicao: number;
};
```

### 4.2 Validações Zod em `src/lib/validacoes.ts`

```typescript
export const MetaPayload = z.object({
  tipo: z.enum(["GLOBAL", "PDV", "INDIVIDUAL"]),
  tipo_meta: z.enum(["VALOR", "VOLUME"]),
  alvo: z.number().positive(),
  periodo: z.enum(["MENSAIS", "TRIMESTRAL", "ANUAL"]),
  data_inicio: z.string().datetime(),
  data_fim: z.string().datetime(),
  id_pdv: z.string().uuid().optional(),
  id_funcionario: z.string().uuid().optional(),
}).refine(
  (dados) => {
    if (dados.tipo === "PDV" && !dados.id_pdv) return false;
    if (dados.tipo === "INDIVIDUAL" && !dados.id_funcionario) return false;
    if (dados.tipo === "GLOBAL" && (dados.id_pdv || dados.id_funcionario)) return false;
    return true;
  },
  { message: "tipo e escopo incompatíveis" }
);

export const MetaUpdatePayload = MetaPayload.partial();
```

---

## 5. API Routes

### 5.1 GET /api/metas

**Query Params:**
- `tipo` (opcional): GLOBAL | PDV | INDIVIDUAL
- `id_pdv` (opcional): filtrar por PDV
- `id_funcionario` (opcional): filtrar por colaborador
- `ativo` (opcional): true | false

**Resposta:**
```json
{
  "metas": [
    {
      "id": "uuid",
      "tipo": "GLOBAL",
      "tipo_meta": "VALOR",
      "alvo": 1000000,
      "periodo": "MENSAIS",
      "data_inicio": "2026-03-01",
      "data_fim": "2026-03-31",
      "ativo": true
    }
  ],
  "tetos": {
    "global_usado": 500000,
    "pdv_disponivel": { "pdv-1": 200000 }
  }
}
```

### 5.2 POST /api/metas

**Body:**
```json
{
  "tipo": "INDIVIDUAL",
  "tipo_meta": "VALOR",
  "alvo": 50000,
  "periodo": "MENSAIS",
  "data_inicio": "2026-03-01",
  "data_fim": "2026-03-31",
  "id_funcionario": "uuid-colaborador"
}
```

**Validações:**
1. Verificar permissão via `podeGerenciarMetaIndividual`
2. Se GLOBAL: verificar se não existe outro GLOBAL ativa
3. Se PDV: verificar se não ultrapassa GLOBAL
4. Se INDIVIDUAL: verificar se não ultrapassa meta do PDV

### 5.3 GET /api/metas/[id]/progresso

**Resposta:**
```json
{
  "id_meta": "uuid",
  "periodo": "2026-03",
  "realizado": 35000,
  "meta": 50000,
  "percentual": 70,
  "dias_restantes": 15
}
```

### 5.4 GET /api/metas/ranking

**Query Params:**
- `periodo`: 2026-03
- `id_pdv`: (opcional) filtrar por PDV

**Resposta:**
```json
{
  "ranking": [
    { "id": "uuid", "nome": "João", "percentual": 95, "posicao": 1 },
    { "id": "uuid", "nome": "Maria", "percentual": 89, "posicao": 2 },
    { "id": "uuid", "nome": "Você", "percentual": 78, "posicao": 3 },
    { "id": "uuid", "nome": "Carlos", "percentual": 65, "posicao": 4 },
    { "id": "uuid", "nome": "Ana", "percentual": 52, "posicao": 5 }
  ],
  "media_equipe": 76,
  "total_participantes": 12
}
```

**⚠️ IMPORTANTE:** Este endpoint NUNCA retorna valores absolutos (R$), apenas percentuais.

---

## 6. ViewModel

### 6.1 Hook use-metas-module.ts

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Meta, MetaProgresso, RankingItem } from "./types";

export type Props = {
  perfil: "EMPRESA" | "GERENTE" | "COLABORADOR";
  id_pdv?: string | null;
  id_usuario?: string;
};

export type UseMetasModuleReturn = {
  // Dados
  metas: Meta[];
  minhaMeta: Meta | null;
  progresso: MetaProgresso | null;
  ranking: RankingItem[];
  mediaEquipe: number;
  
  // Estados
  carregando: boolean;
  erro: string | null;
  
  // Ações (disponíveis conforme perfil)
  podeCriarGlobal: boolean;
  podeCriarMetaPdv: boolean;
  podeCriarMetaIndividual: boolean;
  podeVerValoresAbsolutos: boolean;
  
  // Callbacks
  criarMeta: (dados: MetaPayload) => Promise<boolean>;
  editarMeta: (id: string, dados: MetaPayload) => Promise<boolean>;
  desativarMeta: (id: string) => Promise<boolean>;
  recarregar: () => void;
};

export function useMetasModule({ perfil, id_pdv, id_usuario }: Props) {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [minhaMeta, setMinhaMeta] = useState<Meta | null>(null);
  const [progresso, setProgresso] = useState<MetaProgresso | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [mediaEquipe, setMediaEquipe] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  
  // Carregar dados baseado no perfil
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      
      if (perfil === "COLABORADOR" && id_usuario) {
        // Buscar apenas meta do colaborador
        const resposta = await fetch(`/api/metas?id_funcionario=${id_usuario}&ativo=true`);
        const json = await resposta.json();
        setMinhaMeta(json.metas?.[0] || null);
        
        if (json.metas?.[0]) {
          const progRes = await fetch(`/api/metas/${json.metas[0].id}/progresso`);
          const progJson = await progRes.json();
          setProgresso(progJson);
        }
        
        const rankRes = await fetch(`/api/metas/ranking?id_pdv=${id_pdv}`);
        const rankJson = await rankRes.json();
        setRanking(rankJson.ranking || []);
        setMediaEquipe(rankJson.media_equipe || 0);
      } else {
        // Admin/Gerente: buscar todas as metas
        const resposta = await fetch("/api/metas");
        const json = await resposta.json();
        setMetas(json.metas || []);
      }
      
      setCarregando(false);
    }
    
    carregar();
  }, [perfil, id_pdv, id_usuario]);
  
  // Permissões
  const isAdmin = perfil === "EMPRESA" || perfil === "ADMINISTRADOR";
  
  return {
    metas,
    minhaMeta,
    progresso,
    ranking,
    mediaEquipe,
    carregando,
    erro,
    podeCriarGlobal: isAdmin,
    podeCriarMetaPdv: isAdmin || perfil === "GERENTE",
    podeCriarMetaIndividual: isAdmin || perfil === "GERENTE",
    podeVerValoresAbsolutos: isAdmin || perfil === "GERENTE",
    criarMeta: async () => {},
    editarMeta: async () => {},
    desativarMeta: async () => {},
    recarregar: () => {},
  };
}
```

---

## 7. Componentes UI

### 7.1 Estrutura de Componentes

```
components/metas/
├── index.ts                      # Exports
├── metas-header.tsx              # Cabeçalho com abas
├── meta-admin-panel.tsx          # Painel Admin/Gerente
├── meta-colaborador-card.tsx     # Card motivacional
├── meta-form-dialog.tsx          # Dialog criar/editar
├── ranking-widget.tsx           # Widget ranking
├── meta-pdv-card.tsx            # Card meta PDV
├── meta-individual-card.tsx     # Card meta individual
└── progress-ring.tsx            # Anel de progresso
```

### 7.2 Card Colaborador (Gamificação)

```
┌─────────────────────────────────────────────┐
│  🎯 SUA META DE MARÇO/2026                 │
│                                             │
│         ┌──────────────┐                    │
│         │     78%      │  🏆 Meta Batida   │
│         │   ████████   │  quando ≥100%    │
│         └──────────────┘                    │
│                                             │
│  Faltam R$ 4.500 para meta                  │
│                                             │
│  ┌─ RANKING DA EQUIPE ───────────────────┐ │
│  │  1º ⭐ João - 95%                      │ │
│  │  2º ⭐ Maria - 89%                      │ │
│  │  3º Você - 78%                          │ │
│  │  4º Carlos - 65%                        │ │
│  │  5º Ana - 52%                          │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  Média: 76%  │  Você: 78%  │  Faltam: 15d │
└─────────────────────────────────────────────┘
```

### 7.3 Badges de Conquista

| Badge | Condição | Cor |
|-------|----------|-----|
| 🏆 Meta Batida | ≥ 100% | emerald |
| 🔥 Em Chamas | ≥ 80% + crescimento | orange |
| 🎯 No Caminho | 60-79% | blue |
| ⚡ Quase Lá | 40-59% | amber |
| 💪 Força! | < 40% | slate |

---

## 8. Performance

### 8.1 Estratégia de Cálculo

```typescript
// src/lib/api/metas/calculo-progresso.ts

export async function calcularProgressoMeta(
  idMeta: string, 
  periodo: string
): Promise<MetaProgresso> {
  const meta = await prisma.meta.findUnique({ where: { id: idMeta } });
  
  // Usar índices existentes em Parcela
  const resultado = await prisma.parcela.aggregate({
    where: {
      id_empresa: meta.id_empresa,
      status: "PAGO",
      data_pagamento: { 
        gte: meta.data_inicio, 
        lte: meta.data_fim 
      },
      // Filtrar por escopo
      ...(meta.id_funcionario && { 
        lead: { id_funcionario: meta.id_funcionario } 
      }),
      ...(meta.id_pdv && { 
        lead: { funcionario: { id_pdv: meta.id_pdv } } 
      }),
    },
    _sum: { valor: true },
  });
  
  const realizado = resultado._sum.valor ?? 0;
  
  return {
    id_meta: idMeta,
    periodo,
    realizado,
    meta: meta.alvo,
    percentual: (realizado / meta.alvo) * 100,
  };
}
```

### 8.2 Cache

- **Dashboard Admin:** Cache em memória com TTL 1min
- **Progresso Individual:** Calcular on-demand (leve)
- **Ranking:** Cache 30s (pode ter alta frequência)

---

## 9. Sidebar

### 9.1 Novos Itens

```typescript
// src/components/sidebar-principal.tsx

const secoes = [
  {
    titulo: "Equipe",
    itens: [
      { href: "/equipe", icone: Users, label: "Team" },
      { href: "/equipe/metas", icone: Target, label: "Metas", 
        perfil: ["EMPRESA", "ADMINISTRADOR", "GERENTE"] },
      { href: "/minhas-metas", icone: TrendingUp, label: "Minhas Metas",
        perfil: ["COLABORADOR"] },
    ],
  },
];
```

---

## 10. Validações de Negócio

### 10.1 Teto Automático

```
Meta Global: R$ 1.000.000
├─ PDV Centro: R$ 300.000 (usado)
├─ PDV Norte: R$ 200.000 (usado)
└─ Disponível: R$ 500.000

Meta PDV Centro: R$ 300.000
├─ João: R$ 80.000 (usado)
├─ Maria: R$ 70.000 (usado)
└─ Disponível: R$ 150.000
```

### 10.2 Regras de Validação

1. **Uma GLOBAL ativa por vez** - ao ativar nova, desativar anteriores
2. **Meta PDV ≤ Meta Global** - se não há GLOBAL, pode criar qualquer valor
3. **Meta Individual ≤ Meta PDV** - se não há PDV, pode criar qualquer valor
4. **Período não pode overlap** - validar datas para mesmo tipo

---

## 11. Tasks de Implementação

### Fase 1: Banco de Dados (1 task)
- [ ] Adicionar modelos Meta e MetaProgresso ao schema.prisma
- [ ] Executar migration

### Fase 2: Backend (2 tasks)
- [ ] Criar API Routes (GET, POST, PATCH, DELETE)
- [ ] Implementar validações de teto e permissões
- [ ] Implementar cálculo de progresso
- [ ] Implementar endpoint de ranking

### Fase 3: Frontend - ViewModel (1 task)
- [ ] Criar use-metas-module.ts

### Fase 4: Frontend - Admin/Gerente (2 tasks)
- [ ] Criar componentes de admin panel
- [ ] Criar página /equipe/metas

### Fase 5: Frontend - Colaborador (2 tasks)
- [ ] Criar card motivacional
- [ ] Criar ranking widget
- [ ] Criar página /minhas-metas

### Fase 6: Integração (1 task)
- [ ] Adicionar itens à sidebar
- [ ] Testar fluxos completos

---

## 12. Tips e Gotchas

### 12.1 Pontos de Atenção

1. **ADMINISTRADOR = EMPRESA**: Sempre usar helper `isAdmin()` 
2. **Ranking seguro**: NUNCA retornar valores R$ para COLABORADOR
3. **Validação de teto**: Fazer no backend, não confiar apenas no frontend
4. **Performance**: Usar agregações Prisma, não iterar registros
5. **Índices**: Verificar se índices cobrem queries mais comuns

### 12.2 Padrões a Seguir

- **Padrão MVVM**: hooks retornam ViewModel, componentes são "burros"
- **Tipagem estrita**: Todos os tipos em types.ts
- **Validação Zod**: Sempre validar payloads de API
- **Feedback visual**: Usar loaders e toasts conforme projeto

---

## 13. Referências

- Módulo Equipe existente: `src/modules/equipe/`
- Módulo Recebimentos (referência): `src/modules/recebimentos/`
- Permissões: `src/lib/permissoes.ts`
- Tipos globais: `src/lib/tipos.ts`
- Validações: `src/lib/validacoes.ts`

---

## 14. Checklist Final

- [ ] Schema Prisma criado
- [ ] Migration executada
- [ ] API Routes implementadas
- [ ] Validações de teto funcionando
- [ ] ViewModel criado
- [ ] Componentes Admin prontos
- [ ] Componentes Colaborador prontos
- [ ] Sidebar atualizada
- [ ] Testes de integração
- [ ] Build passando

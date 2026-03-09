# Atribuição Automática de Leads - Feature Specification

## Visão Geral

Este documento detalha a funcionalidade de **Atribuição Automática de Leads** para o CRM de Consórcios. A feature permite distribuir leads automaticamente entre vendedores baseado em regras configuráveis, eliminando a distribuição manual e garantindo equilíbrio, justiça e eficiência no atendimento.

---

## Índice

1. [Conceitos Fundamentais](#1-conceitos-fundamentais)
2. [Tipos de Atribuição](#2-tipos-de-atribuição)
3. [Experiência do Usuário](#3-experiência-do-usuário)
4. [Arquitetura Técnica](#4-arquitetura-técnica)
5. [Lógica "Nos Bastidores"](#5-lógica-nos-bastidores)
6. [Casos de Borda](#6-casos-de-borda)
7. [Métricas de Sucesso](#7-métricas-de-sucesso)
8. [Benefícios Práticos](#8-benefícios-práticos)

---

## 1. Conceitos Fundamentais

### 1.1 Definições

| Termo | Definição |
|-------|-----------|
| **Lead** | Potencial cliente em potencial de compra de consórcio |
| **Atribuição** | Ato de associar um lead a um vendedor responsável |
| **Fila de Espera** | Pool de leads aguardando distribuição |
| **Vendedor Elegível** | Vendedor que pode receber novos leads |
| **Regra de Atribuição** | Lógica configurada para distribuir leads |

### 1.2 Perfis de Acesso

| Funcionalidade | ADMIN/EMPRESA | GERENTE | COLABORADOR |
|----------------|---------------|---------|-------------|
| Configurar regras globais | ✅ | ❌ | ❌ |
| Configurar regras por PDV | ✅ | ✅ (seu PDV) | ❌ |
| Distribuição manual | ✅ | ✅ | ❌ |
| Ver fila de atribuição | ✅ | ✅ | ✅ (próprio) |
| Aceitar/rejeitar lead | ❌ | ❌ | ✅ |

### 1.3 Fluxo Simplificado

```
┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Lead     │───▶│ Fila de     │───▶│ Motor de     │───▶│ Lead        │
│ Novo     │    │ Aguardando  │    │ Atribuição   │    │ Atribuído   │
│ (entra)  │    │ (pool)      │    │ (regras)     │    │ ao vendedor │
└──────────┘    └─────────────┘    └──────────────┘    └─────────────┘
     │                                         │
     │         "Nos Bastidores"                │
     ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  • Valida regras de negocio                                        │
│  • Calcula scores e rankings                                       │
│  • Aplica pesos e limites                                         │
│  • Registra histórico de atribuição                                │
│  • Envia notificações                                             │
│  • Cria auditoria completa                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tipos de Atribuição

### 2.1 Round Robin (Distribuição Igualitária)

**Conceito:** Cada vendedor recebe leads alternadamente, garantindo distribuição equilibrada.

**Quando usar:**
- Equipe pequena ou média
- Todos vendedores com performance similar
- Empresa quer justiça absoluta na distribuição

**Exemplo Prático:**
```
Cenário: 3 vendedores, 6 leads novos

Ordem de chegada:
Lead 1 → João
Lead 2 → Maria  
Lead 3 → Pedro
Lead 4 → João
Lead 5 → Maria
Lead 6 → Pedro

Resultado: Cada um recebe 2 leads
```

### 2.2 Por Performance (Inteligente)

**Conceito:** Melhores vendedores recebem mais leads baseado em métricas de desempenho.

**Quando usar:**
- Equipe com diferentes níveis de performance
- Empresa quer maximizar conversão
- Já existe baseline de performance

**Métricas disponíveis:**

| Métrica | Descrição | Peso Padrão |
|---------|-----------|-------------|
| Taxa de Conversão 30d | % leads fechados em 30 dias | 40% |
| Taxa de Conversão 60d | % leads fechados em 60 dias | 30% |
| Volume de Vendas | Valor total vendido no período | 20% |
| Tempo Médio de Resposta | Minutos até primeiro contato | 10% |

**Exemplo Prático:**
```
Cenário: 3 vendedores, 10 leads novos

Ranking por Performance:
┌─────────────────┬────────────┬────────┬─────────┐
│ Vendedor        │ Conversão  │ Score  │ % Leads │
├─────────────────┼────────────┼────────┼─────────┤
│ João (1º)      │ 35%        │ 100    │ 40%     │
│ Maria (2º)     │ 28%        │ 80     │ 30%     │
│ Pedro (3º)     │ 20%        │ 57     │ 30%     │
└─────────────────┴────────────┴────────┴─────────┘

Distribuição de 10 leads:
João: 4 leads
Maria: 3 leads  
Pedro: 3 leads

Regra aplicada: 40/30/30%
```

### 2.3 Por Especialidade

**Conceito:** Leads são direcionados baseado no tipo de consórcio/interesse.

**Quando usar:**
- Vendedores especializados em diferentes produtos
- Empresa oferece diversos tipos de consórcio
- Produtos requerem conhecimentos específicos

**Mapeamento de Especialidades:**
```
┌─────────────────┬──────────────────────────────────────────┐
│ Vendedor        │ Especialidades                           │
├─────────────────┼──────────────────────────────────────────┤
│ João            │ Carro, Moto                             │
│ Maria           │ Imóvel, Comercial                       │
│ Pedro           │ Carro, Imóvel                           │
│ Ana             │ Todos os tipos (catch-all)              │
└─────────────────┴──────────────────────────────────────────┘
```

**Exemplo Prático:**
```
Lead进来:
- Carlos: interesse em consórcio CARRO → João ou Pedro
- Silvia: interesse em consórcio IMÓVEL → Maria
- José: interesse em consórcio MOTO → João

Regra: Priorizar especialista > Se ocupado > Catch-all
```

### 2.4 Por Disponibilidade (Horário)

**Conceito:** Leads são atribuídos ao vendedor que está online/disponível no momento.

**Quando usar:**
- Trabalho híbrido ou remoto
- Diferentes horários de trabalho
- Equipe com escala

**Estados de Disponibilidade:**

| Estado | Ícone | Descrição |
|--------|-------|-----------|
| Online/Disponível | 🟢 | Ativo agora, pode receber leads |
| Ocupado | 🟡 | Em ligação/reunião |
| Offline | 🔴 | Não está trabalhando |
| Não definido | ⚪ | Sem status (considerar offline) |

**Exemplo Prático:**
```
14:00 - Chegam 3 leads simultâneos

Situação:
- João: 🟢 Online
- Maria: 🔴 Offline (folga)
- Pedro: 🟡 Ocupado (em ligação)

Resultado: João recebe os 3 leads
```

### 2.5 Híbrida (Combinação)

**Conceito:** Combina múltiplas regras com pesos.

**Exemplo de Configuração:**
```
Regra: "Performance + Disponibilidade"

Peso 60%: Por Performance (ranking)
Peso 30%: Por Disponibilidade  
Peso 10%: Round Robin (desempate)

Cálculo:
1. Filtrar apenas disponíveis (70% ficam elegíveis)
2. Aplicar peso de performance (rankings)
3. Se empatado → round robin
```

---

## 3. Experiência do Usuário

### 3.1 Admin - Central de Configuração

#### Dashboard Principal

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 ATRIBUIÇÃO AUTOMÁTICA                      [Ativo 🟢]       │
├─────────────────────────────────────────────────────────────────┤
│  REGRAS ATIVAS                                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ [✓] Round Robin - Distribuição Igualitária [Editar]     │ │
│  │    Aplicável: Todos os PDVs                              │ │
│  │    Leads hoje: 45 | Distribuídos: 42 | Pendentes: 3    │ │
│  └───────────────────────────────────────────────────────────┘ │
│  [+ Adicionar Nova Regra]                                    │
│  📊 ESTATÍSTICAS DE HOJE                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 45 Leads │ │ 12 Conv  │ │ 8min     │ │ 92%      │        │
│  │recebidos │ │ 30d      │ │ Tempo méd│ │ < 5min   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

#### Configuração de Regra

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 CONFIGURAR REGRA: ROUND ROBIN                             │
├─────────────────────────────────────────────────────────────────┤
│  Nome da Regra:                                               │
│  [Distribuição Igualitária - Matriz]                          │
│                                                                 │
│  Tipo de Atribuição:                                          │
│  (•) Round Robin - Distribuição exatamente igual              │
│  ( ) Por Performance - Melhores recebem mais                  │
│  ( ) Por Especialidade - Por tipo de consórcio                │
│  ( ) Por Disponibilidade - Quem está online                  │
│  ( ) Híbrida - Combinação de regras                           │
│                                                                 │
│  Aplicar em:                                                   │
│  [✓] Matriz  [✓] Filial Centro  [ ] Filial Norte              │
│                                                                 │
│  CONDIÇÕES DE ATIVAÇÃO                                        │
│  [✓] Novo lead entra no sistema                               │
│  [✓] Lead reativado (retorna após X dias inativo)            │
│      Dias inativo: [30 ▼]                                      │
│  [✓] Redistribuir leads órfãos (vendedor inativado)           │
│                                                                 │
│  LIMITAÇÕES E EXCEÇÕES                                        │
│  [✓] Limite máximo de leads em aberto por vendedor            │
│      Máximo: [50] leads                                       │
│  [✓] Diferença máxima entre vendedores                       │
│      Diferença: [15] leads                                   │
│  [✓] Priorizar vendedor com menor tempo de resposta          │
│  [✓] Não distribuir para vendedores de ferias/licença        │
└─────────────────────────────────────────────────────────────────┘
```

#### Monitoramento em Tempo Real

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 MONITORAMENTO EM TEMPO REAL               [Ao vivo 🟢]       │
├─────────────────────────────────────────────────────────────────┤
│  FILA DE ATRIBUIÇÃO                          [Atualizar]        │
│  Aguardando: 3 leads                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ # │ Nome        │ Valor   │ Entrada │ Tempo Espera       │ │
│  ├───┼─────────────┼─────────┼─────────┼───────────────────┤ │
│  │ 1 │ Carlos M.   │ R$ 80K  │ 14:32   │ ⏱️ 3min            │ │
│  │ 2 │ Ana Paula   │ R$ 120K │ 14:28   │ ⏱️ 7min            │ │
│  │ 3 │ Roberto S.  │ R$ 45K  │ 14:15   │ ⏱️ 20min ⚠️        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  DISTRIBUIÇÃO RECENTE                                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Horário │ Lead         │ Para          │ Regra           │ │
│  ├─────────┼──────────────┼───────────────┼─────────────────┤ │
│  │ 14:30   │ João Pedro   │ Maria Santos  │ Round Robin     │ │
│  │ 14:25   │ Silvia Costa  │ João Silva   │ Round Robin     │ │
│  │ 14:20   │ Marcos Alves  │ Pedro Costa  │ Performance (1º)│ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  CARGA POR VENDEDOR                                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Vendedor     │ Em Aberto │ Hoje │ Média/Dia │ Status      │ │
│  ├──────────────┼───────────┼───────┼───────────┼────────────┤ │
│  │ João Silva   │    45    │  4   │    4.2    │ ⚠️ Próximo  │ │
│  │ Maria Santos │    38    │  3   │    3.8    │ OK          │ │
│  │ Pedro Costa  │    42    │  3   │    3.5    │ OK          │ │
│  │ Ana Paula    │    35    │  3   │    3.2    │ OK          │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Gerente - Configuração do PDV

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 ATRIBUIÇÃO - Filial Centro                 [Editar Regras]   │
├─────────────────────────────────────────────────────────────────┤
│  Regra Atual:                                                  │
│  [✓] Round Robin com Limite                                   │
│      Máximo 50 leads/vendedor                                 │
│      Diferença máxima: 15 leads                               │
│                                                                 │
│  DISTRIBUIÇÃO DE HOJE                                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Vendedor    │ Recebidos │ Em Aberto │ Tempo Méd Resp    │ │
│  │ João Silva  │     4    │    45     │ 8 min            │ │
│  │ Maria Santos│     3    │    38     │ 12 min           │ │
│  │ Pedro Costa │     3    │    42     │ 15 min           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  AÇÕES RÁPIDAS                                                │
│  [🔄 Redistribuir Leads Inativos]  (Leads sem contato 7+ dias) │
│  [⚖️ Equilibrar Carga Manualmente]                            │
│  [📋 Ver Fila de Espera]                                      │
│  [⏸️ Pausar Atribuição Temporariamente]                       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Colaborador - Minha Fila de Leads

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 MINHA FILA DE LEADS                     [🎯 12 em aberto]  │
├─────────────────────────────────────────────────────────────────┤
│  URGENTES (precisam de contato agora)                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ⚠️ Carlos M. - 12 dias sem contato                       │ │
│  │    📱 (11) 99999-8888  |  💰 R$ 80.000  |  🚗 Carro   │ │
│  │    [📞 Ligar] [💬 WhatsApp] [⏭️ Passar]                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  RECEBIDOS HOJE (3 novos)                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🆕 Marcos Alves - há 15 minutos                           │ │
│  │    📱 (11) 97777-6666  |  💰 R$ 60.000  |  🏠 Imóvel  │ │
│  │    [📞 Ligar] [💬 WhatsApp] [⏭️ Passar]                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  LEGENDA: 🆕 Novo | ⚠️ Urgente | ⏰ Atrasado | ✅ Em dia       │
└─────────────────────────────────────────────────────────────────┘
```

#### Ao Passar Lead Adiante

```
┌─────────────────────────────────────────────────────────────────┐
│  ⏭️ PASSAR LEAD PARA OUTRO VENDEDOR                           │
├─────────────────────────────────────────────────────────────────┤
│  Lead: Bruno Liu                                              │
│  Valor: R$ 45.000 | Moto                                       │
│                                                                 │
│  Motivo:                                                       │
│  ( ) Já tenho muitos leads (45 em aberto)                     │
│  ( ) Cliente não atende/indisponível                          │
│  ( ) Não tenho experiência com esse tipo de consórcio         │
│  (•) Outro motivo: [Lead qualificado para Imóvel, não Moto]   │
│                                                                 │
│  Destino:                                                     │
│  (•) Regra automática (Round Robin)                          │
│  ( ) Escolher vendedor específico                             │
│     Maria Santos (especialista Imóvel) ← Recomendado           │
│                                                                 │
│  ⚠️ Você pode passar até 5 leads por dia. Hoje: 1/5            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Arquitetura Técnica

### 4.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Admin      │  │ Gerente     │  │Colaborador │  │ Kanban     │   │
│  │ Dashboard  │  │ Config     │  │ Minha Fila │  │ (integração)│  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
└─────────┼────────────────┼────────────────┼────────────────┼──────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Next.js Route Handlers)              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │ POST /api/leads     │  │ GET /api/atribuicao│  │ PATCH /api/   │  │
│  │ (criar lead)       │  │ /fila               │  │ atribuicao/   │  │
│  │                     │  │                     │  │ redistribuir  │  │
│  └──────────┬──────────┘  └──────────┬─────────┘  └───────┬────────┘  │
│             │                        │                    │            │
│  ┌──────────┴────────────────────────┴─────────────────────┴─────────┐  │
│  │                    MOTOR DE ATRIBUIÇÃO                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │  │
│  │  │ RoundRobin   │  │ Performance  │  │ Especialidad │        │  │
│  │  │ Allocator    │  │ Allocator    │  │ e Allocator  │        │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE DADOS (Prisma)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Lead        │  │ Funcionario │  │ Atribuicao  │  │ Regra       │   │
│  │ (existente)│  │ (existente) │  │ Log (nova)  │  │ Config (nova)│  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Schema do Banco de Dados

```prisma
// Novas tabelas para Atribuição Automática

model RegraAtribuicao {
  id                  String    @id @default(uuid())
  id_empresa          String
  id_pdv              String?   // null = global
  
  nome                String
  tipo                String    // ROUND_ROBIN, PERFORMANCE, ESPECIALIDADE, DISPONIBILIDADE, HIBRIDA
  
  ativo               Boolean   @default(true)
  prioridade           Int       @default(1) // maior = executada primeiro
  
  // Configurações específicas
  config_json         String?   // JSON com configurações específicas
  
  // Condições de ativação
  aplicar_novo_lead   Boolean   @default(true)
  aplicar_reativacao  Boolean   @default(false)
  aplicar_redistribuicao Boolean @default(false)
  
  // Limites
  limite_maximo_leads Int       @default(50)
  diferenca_maxima    Int       @default(15)
  
  // Timestamps
  criado_em           DateTime  @default(now())
  atualizado_em       DateTime  @updatedAt
  deletado_em         DateTime?
  
  @@index([id_empresa, ativo])
  @@index([id_empresa, id_pdv])
}

model AtribuicaoLog {
  id                  String    @id @default(uuid())
  id_empresa          String
  id_lead             String
  id_vendedor_origem  String?   // pode ser null se vier da fila
  id_vendedor_destino String
  
  regra_aplicada      String
  tipo_atribuicao     String    // AUTOMATICA, MANUAL, REATIVACAO, INATIVACAO
  
  // Contexto
  posicao_ranking     Int?      // se for por performance
  score               Float?     // score calculado
  motivo              String?    // se rejeição, qual motivo
  
  // Timing
  timestamp           DateTime  @default(now())
  
  @@unique([id_empresa, id_lead, timestamp])
  @@index([id_empresa, id_lead])
  @@index([id_vendedor_destino])
  @@index([timestamp])
}

model VendedorMetrica {
  id                  String    @id @default(uuid())
  id_empresa          String
  id_vendedor         String
  
  // Métricas calculadas
  taxa_conversao_30d  Float     @default(0)
  taxa_conversao_60d  Float     @default(0)
  volume_vendas_30d   Float     @default(0)
  volume_vendas_60d   Float     @default(0)
  tempo_medio_resposta Float   @default(0)
  
  // Para ordenação
  score_performance   Float     @default(0)
  
  // Contadores
  leads_recebidos     Int       @default(0)
  leads_em_aberto     Int       @default(0)
  
  // Estado
  disponivel          Boolean   @default(true)
  ferias_inicio       DateTime?
  ferias_fim          DateTime?
  
  // Timestamps
  calculado_em        DateTime  @default(now())
  
  @@unique([id_empresa, id_vendedor])
  @@index([id_empresa, score_performance])
}

model FilaEspera {
  id                  String    @id @default(uuid())
  id_empresa          String
  id_lead             String
  
  posicao             Int       // ordem na fila
  motivo              String?   // motivo de estar na fila
  
  // Contexto
  valor_lead          Float?
  tipo_consorcio      String?
  origem              String?
  
  // Timing
  entrou_na_fila      DateTime  @default(now())
  ultimo_retry        DateTime?
  
  @@unique([id_empresa, id_lead])
  @@index([id_empresa, posicao])
}

model VendedorEspecialidade {
  id                  String    @id @default(uuid())
  id_empresa          String
  id_vendedor         String
  tipo_consorcio      String    // CARRO, MOTO, IMOVEL, COMERCIAL
  
  @@unique([id_empresa, id_vendedor, tipo_consorcio])
}
```

### 4.3 APIs Necessárias

| Endpoint | Método | Descrição |
|----------|--------|------------|
| `/api/atribuicao/regras` | GET | Listar regras de atribuição |
| `/api/atribuicao/regras` | POST | Criar nova regra |
| `/api/atribuicao/regras/[id]` | PATCH | Editar regra |
| `/api/atribuicao/regras/[id]` | DELETE | Deletar regra |
| `/api/atribuicao/fila` | GET | Ver fila de espera |
| `/api/atribuicao/fila` | POST | Forçar distribuição |
| `/api/atribuicao/metricas` | GET | Ver métricas de performance |
| `/api/atribuicao/metricas/recalcular` | POST | Recalcular scores |
| `/api/atribuicao/distribuir` | POST | Distribuir lead específico |
| `/api/atribuicao/redistribuir` | POST | Redistribuir inativos |
| `/api/atribuicao/historico` | GET | Ver histórico de atribuições |

---

## 5. Lógica "Nos Bastidores"

### 5.1 Fluxo Completo de Atribuição

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. EVENTO DISPARADOR                                                │
│    (Novo lead, reativação, inativação, redistribuição)            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. COLETA DE CONTEXTO                                              │
│    • Dados do lead (valor, tipo, origem)                           │
│    • PDV do lead                                                   │
│    • Horário atual                                                 │
│    • Configurações de atribuição do PDV                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. FILTRAGEM DE ELEGÍVEIS                                          │
│                                                                     │
│   Vendedores Ativos? ──▶ Sim ──┐                                  │
│        │                         │                                  │
│       Não                        ▼                                  │
│        │                ┌───────────────┐                          │
│        │                │ Estão Online? │                          │
│        │                │    │          │                          │
│        │                │ Sim│   Não    │                          │
│        │                │    │    │     │                          │
│        │                ▼    │    ▼     │                          │
│        │              FILA │FILAESPERA │                          │
│        │                   │           │                          │
│        └───────────────────┴───────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. APLICAR REGRA DE ATRIBUIÇÃO                                     │
│                                                                     │
│   SE Round Robin:                                                  │
│     1. Ordenar por última atribuição (mais antigo primeiro)       │
│     2. Próximo da fila                                            │
│                                                                     │
│   SE Por Performance:                                               │
│     1. Calcular scores (conforme métricas configuradas)           │
│     2. Ranking dinâmico                                            │
│     3. Aplicar pesos (1º=40%, 2º=30%, etc)                        │
│     4. Verificar limites                                           │
│                                                                     │
│   SE Por Especialidade:                                            │
│     1. Identificar tipo do lead                                    │
│     2. Buscar especialistas nesse tipo                            │
│     3. Se não achou → catch-all                                   │
│     4. Aplicar secondary rule                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. VERIFICAR LIMITAÇÕES                                            │
│                                                                     │
│   Limite máximo atingido? ──▶ Sim ──▶ Pular para próximo           │
│        │                                    │                      │
│       Não                                   ▼                      │
│        │                          ┌─────────────────┐              │
│        │                          │ Diferença máx  │              │
│        │                          │ atingida?       │              │
│        │                          │    │            │              │
│        │                          │ Sim│  Não      │              │
│        │                          │    │   │        │              │
│        │                          ▼    │   ▼        │              │
│        │                    FILAESPERA │ATRIBUIR    │              │
│        │                             │             │              │
└─────────────────────────────────────┴─────────────┘              │
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. EXECUTAR ATRIBUIÇÃO                                             │
│    • Atualizar id_funcionario no Lead                              │
│    • Criar registro de auditoria                                   │
│    • Criar evento de atribuição                                    │
│    • Atualizar contador de distribuição                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. NOTIFICAR                                                        │
│                                                                     │
│   VENDEDOR:                                                        │
│   • Push notification (se ativo)                                   │
│   • Toast no sistema                                               │
│   • Badge na sidebar                                               │
│                                                                     │
│   GERENTE (se configurado):                                        │
│   • Notificação de novo lead na equipe                            │
│                                                                     │
│   ADMIN (se configurado):                                          │
│   • Alerta de atribuição crítica                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. REGISTRAR LOG                                                   │
│    • Timestamp                                                     │
│    • ID do lead                                                   │
│    • ID do vendedor destino                                        │
│    • Regra aplicada                                               │
│    • Score/posición no ranking                                     │
│    • Motivo (se passou limite, etc)                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Pseudocódigo dos Algoritmos

#### Round Robin

```typescript
class RoundRobinAllocator {
  async allocate(lead: Lead, vendedores: Vendedor[]): Promise<Vendedor> {
    // 1. Filtrar válidos (ativos, não férias, limite não atingido)
    const elegiveis = vendedores.filter(v => this.isElegivel(v));
    
    if (elegiveis.length === 0) {
      throw new Error('Nenhum vendedor elegível');
    }
    
    // 2. Obter última ordem de distribuição
    const ultimaAtribuicao = await this.getUltimaAtribuicao();
    
    // 3. Ordenar circularmente
    const indiceProximo = (ultimaAtribuicao.indice + 1) % elegiveis.length;
    
    // 4. Retornar próximo
    return elegiveis[indiceProximo];
  }
  
  isElegivel(vendedor: Vendedor): boolean {
    return vendedor.ativo 
      && !vendedor.ferias 
      && vendedor.leads_em_aberto < this.limite_maximo;
  }
}
```

#### Por Performance

```typescript
class PerformanceAllocator {
  async calculateScores(vendedores: Vendedor[], metricas: MetricaConfig[]) {
    const scores = await Promise.all(vendedores.map(async (v) => {
      let score = 0;
      
      for (const metrica of metricas) {
        const valor = await this.getMetricaValue(v, metrica);
        const normalized = this.normalize(valor, metrica.peso);
        score += normalized * metrica.peso;
      }
      
      return { vendedor: v, score };
    }));
    
    // Ordenar por score (maior primeiro)
    return scores.sort((a, b) => b.score - a.score);
  }
  
  async allocate(lead: Lead, ranking: RankedVendedor[]): Promise<Vendedor> {
    for (const item of ranking) {
      if (this.withinLimits(item.vendedor)) {
        // Verificar diferença máxima
        const diff = this.getDiferencaMaxima(item.vendedor, ranking);
        if (diff <= this.diferenca_maxima) {
          return item.vendedor;
        }
      }
    }
    
    // Se todos atingiram limite, colocar em fila
    throw new Error('FilaCheiaException');
  }
}
```

---

## 6. Casos de Borda

| Cenário | Problema | Solução | Notificação |
|---------|----------|---------|-------------|
| Todos vendedores atingem limite | Ninguém pode receber | Colocar em fila de espera | Alertar gerente + admin |
| Único vendedor disponível | Sem balanceamento | Atribuir todos (com warning) | Alertar desbalanceamento |
| Vendedor sai durante atribuição | Conflito | Rollback + redistribuir | Registrar log de falha |
| Lead alta prioridade (R$ 500K+) | Lead valioso precisa de melhor | Regra especial: melhor vendedor | Notificação VIP |
| Redistribuição pós-inativação | Vendedor saiu, tinha leads | Redistribuir via regra | Notificar origem e destino |
| Conflito manual vs automático | Atribuição dupla | Manual sobrescreve automático | Registrar sobrescrita |
| Vendedor de férias | Não deve receber | Excluir automaticamente | N/A |
| Timezone diferente | Lead de fuso diferente | Configurável | N/A |

---

## 7. Métricas de Sucesso

### 7.1 Velocidade

| Métrica | Meta | Típico |
|---------|------|--------|
| Tempo médio entrada → atribuição | < 30 seg | 5-15 seg |
| Tempo médio atribuição → primeiro contato | < 10 min | 8-15 min |

### 7.2 Equilíbrio

| Métrica | Meta | Típico |
|---------|------|--------|
| Diferença média de leads entre vendedores | < 10% | 5-8% |
| % vendedores dentro do limite | 100% | 95-100% |

### 7.3 Eficiência

| Métrica | Meta | Típico |
|---------|------|--------|
| Taxa de conversão (automático vs manual) | Automático > | +5-10% |
| Taxa de reassignação | < 5% | 2-4% |

### 7.4 Satisfação

| Métrica | Meta | Típico |
|---------|------|--------|
| % leads aceitos sem rejeição | > 95% | 90-96% |
| Reclamações de distribuição | 0 | ~0 |

---

## 8. Benefícios Práticos

### 8.1 Cenários Reais

#### Cenário 1: Empresa Crescendo
```
ANTES (sem atribuição automática):
- Vendedor favorito recebia todos os leads
- Outros desmotivados
- Cliente mal-atendido por overload

DEPOIS (com atribuição automática):
- Todos recebem igual (Round Robin)
- Equipe motivada
- Leads bem-atendidos
- Conversão sobe 15%
```

#### Cenário 2: Vendedores com Performance Diferente
```
ANTES:
- Novo vendedor recebia igual ao experiente
- Experiente sobrecarregado
- Novo não aprendia por falta de volume

DEPOIS (Por Performance):
- Melhor vendedor: 40% dos leads
- Bom vendedor: 30% dos leads
- Novo vendedor: 30% dos leads
- Resultado: Melhor conversão geral
```

#### Cenário 3: Especialistas
```
Situação: João é guru de imóvel, Maria é experta em carro

DEPOIS (Por Especialidade):
- Lead interesse IMÓVEL → João (优先)
- Lead interesse CARRO → Maria (优先)
- Resultado: Taxa de conversão +25% por specialize
```

#### Cenário 4: Trabalho Híbrido
```
Situação: Equipe trabalha em casa e escritório

DEPOIS (Por Disponibilidade):
- Quem está online recebe
- Quem está offline não recebe
- Lead sempre atendido rapidamente
- Tempo médio de primeira resposta: 8 min
```

### 8.2 ROI Esperado

| Benefício | Impacto |
|-----------|---------|
| Aumento taxa de conversão | +10-20% |
| Redução tempo primeiro contato | -50% |
| Satisfação da equipe | +30% |
| Redução trabalho administrativo | -40% |
| Melhoria distribuição de leads | +25% |

---

## 9. Próximos Passos

Para implementar esta feature, seguir:

1. **Schema do Banco** - Criar tabelas `RegraAtribuicao`, `AtribuicaoLog`, `VendedorMetrica`, `FilaEspera`, `VendedorEspecialidade`

2. **Motor de Atribuição** - Implementar classes `RoundRobinAllocator`, `PerformanceAllocator`, `EspecialidadeAllocator`, `DisponibilidadeAllocator`

3. **APIs** - Criar endpoints para CRUD de regras, fila, métricas e distribuição

4. **Frontend Admin** - Dashboard de configuração e monitoramento

5. **Frontend Gerente** - Configurações do PDV e ações de redistribuição

6. **Frontend Colaborador** - Minha fila de leads e notificação de novos

7. **Job de Recalculo** - Cron job diário para atualizar scores de performance

8. **Job de Verificação** - Cron job para verificar fila de espera

---

## 10. Histórico de Versões

| Versão | Data | Descrição |
|--------|------|------------|
| 1.0.0 | 2026-03-09 | Versão inicial do documento |

---

*Documento gerado para o projeto MC CRM Consórcio*

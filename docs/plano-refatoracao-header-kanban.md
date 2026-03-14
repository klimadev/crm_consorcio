# Plano de Refatoração UI/UX - Header do Kanban

## 📊 Análise: Por Que o Header Está Confuso

### Problemas Identificados

#### 1. **Sobrecarga Cognitiva (Excesso de Controles)**
O header possui **10+ elementos interativos** competing for attention:
- Campo de busca
- Dropdown de ordenação
- Filter de PDV
- Filter de Origem
- Filters de Pendências (status + gravidade = 2 dropdowns)
- Botão "Foco Pendências"
- Toggle de Notificações
- Botão "Novo Lead"
- Botão "Sincronizar WhatsApp"
- Botão "Redistribuir em Atendimento"

**Impacto**: Usuários não sabem onde olhar primeiro.

---

#### 2. **Linguagem Visual Inconsistente**
- ❌ Emojis misturados com ícones Lucide (`📢💬✏️`)
- ❌ Alguns botões têm ícones, outros não
- ❌ Cores aplicadas sem padrão claro

---

#### 3. **Hierarquia de Informação Pobrem**
O subtitle tenta mostrar **demais informações** de uma vez:
- Total de leads
- Estatísticas de origem (📢12 💬89 ✏️49)
- Pendências críticas

**Problema**: Usuário não sabe o que é prioritário.

---

#### 4. **Terminologia Técnica Sem Explicação**
| Termo | Problema |
|-------|----------|
| `PDV` | Sigla não explicada |
| `ANUNCIO_CTWA`, `SINCRONIZACAO_WHATSAPP`, `MANUAL` | Códigos internos visíveis |
| `Redistribuir em Atendimento` | Muito técnico |
| `Foco Pendências` | Vago |

---

#### 5. **Filters Espalhados**
- O filter de **Origem** está longe dos outros filtros
- Os filtros de **Pendências** (status + gravidade) estão agrupados separadamente
- Não existe uma "zona de filtros" clara

---

#### 6. **Aglomeração de Botões de Ação**
- Múltiplos botões de ação sem agrupamento claro
- "Redistribuir em Atendimento" deveria ser uma ação secundária/escondida

---

#### 7. **Falta de Contexto**
- Sem tooltips explicando funcionalidades
- Estatísticas de origem no subtitle podem não ser claras

---

## 🎯 Proposta de Solução

### Estrutura Proposta (3 Zonas)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ZONA 1: TÍTULO + INFO                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Leads • 150 ativos   │   📢12 Anúncios  │  💬89 WhatsApp       │  │
│  │  🔥 5 pendências críticas                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  ZONA 2: FILTROS (AGRUPADOS)                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  🔍 Buscar  │  Ordenar: ▼  │  Origem: ▼  │  Pendências: ▼      │  │
│  │  (se ativo) ✕                                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│  ZONA 3: AÇÕES (Separadas por prioridade)                             │
│  ┌────────────────────────────────────────┐  ┌─────────────────────┐  │
│  │  🔔  │  ⚡ Novo Lead                   │  │  ⋮ Mais ações      │  │
│  │                                                  │  └─────────────────────┘  │
│  └────────────────────────────────────────┘                             │
│  (Secundárias em menu dropdown)                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Alterações Específicas

#### A. **Simplificar Subtitle**
- **Agora**: `"Leads: 150 📢12 💬89 ✏️49 • 5 críticas"`
- **Proposto**: `"150 leads ativos • 5 pendências críticas"`
- Origem statsmove para um badge/tooltip ou totalmente removido do header

#### B. **Agrupar Todos os Filtros em Uma Linha**
- Unificar: busca + ordenação + origem + pendências
- Adicionar separadores visuais sutis entre filtros
- Mostrar "Filtros ativos" com botão de limpar UNIFICADO

#### C. **Renomear Terminologia Técnica**
| Antes | Depois |
|-------|--------|
| `PDV` | `Loja` |
| `Origem` | `Como chegou` |
| `Foco Pendências` | `Apenas urgências` |
| `Redistribuir em Atendimento` | Mover para menu "Mais ações" |

#### D. **Usar Apenas Ícones Lucide (Sem Emojis)**
- Substituir `📢` → `<Megaphone />`
- Substituir `💬` → `<MessageCircle />`
- Substituir `✏️` → `<PenLine />`

#### E. **Ações em Menu Dropdown**
Mover ações menos frequentes para menu "Mais ações" (⋮):
- Sincronizar WhatsApp
- Redistribuir em Atendimento
- (future: exportar, etc.)

#### F. **Badges Visuais Mais Claros**
- Usar badges com cores e texto claro
- Ex: `bg-purple-100 text-purple-700` para Anúncios

---

## 📝 Checklist de Implementação

- [ ] 1. Renomear labels técnicos no código (`Origem` → `Como chegou`, `PDV` → `Loja`)
- [ ] 2. Simplificar subtitle (remover emojis, colocar origem stats em outro lugar)
- [ ] 3. Criar componente `FilterBar` agrupando todos os filtros
- [ ] 4. Criar menu `Mais ações` para ações secundárias
- [ ] 5. Substituir todos os emojis por ícones Lucide consistentes
- [ ] 6. Adicionar tooltips explicativos
- [ ] 7. Verificar build

---

## 📁 Arquivos a Modificar

1. `src/modules/kanban/components/kanban-header.tsx` - Main refactoring
2. `src/modules/kanban/types.ts` - Possibly update labels/types
3. `src/modules/kanban/hooks/use-kanban-derivacoes.ts` - If filter logic changes

---

## ✅ Resultado Esperado

- Header mais **fácil de entender** em 3 segundos
- **Terminologia amigável** para usuários não-técnicos
- **Fluxo visual claro**: info → filtros → ações
- **Redução de 50%** em elementos visuais no header

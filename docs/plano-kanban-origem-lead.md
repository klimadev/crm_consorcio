# Plano: Identificação Visual de Origem no Kanban

## Objetivo
Adicionar indicadores visuais no Kanban para identificar rapidamente a origem de cada lead:
- **📢 Anúncio (AD)** - Leads gerados por anúncios CTWA (Click to WhatsApp Ad)
- **💬 WhatsApp** - Leads de conversas normais no WhatsApp  
- **✏️ Manual** - Leads adicionados manualmente

---

## Análise do Estado Atual

### Campo `origem` existente (schema.prisma):
```prisma
origem String @default("MANUAL")
```

### Valores já utilizados:
- `"MANUAL"` - criado manualmente via formulário
- `"SINCRONIZACAO_WHATSAPP"` - sincronizado do WhatsApp

### Desafio identificado:
- O lead só sabe que veio do WhatsApp após a primeira sincronização
- Não há diferenciação entre "WhatsApp normal" vs "Anúncio CTWA"
- A informação do anúncio está na **primeira mensagem** (`externalAdReply`)

---

## Estratégia de Implementação

### 1. Adicionar novos valores de origem

```prisma
// schema.prisma - расширення
origem String @default("MANUAL")
// MANUAL, SINCRONIZACAO_WHATSAPP, ANUNCIO_CTWA
```

### 2. Detecção de Anúncio na Sincronização

No `leads-sync-whatsapp.ts`, ao processar a primeira mensagem:

```typescript
// Pseudocódigo
const primeiraMensagem = mensagensOrdenadas[0];
const dadosAd = extrairDadosAd(primeiraMensagem);

if (dadosAd && dadosAd.titulo) {
  origem = "ANUNCIO_CTWA";
  // Salvar dados do anúncio no lead
} else {
  origem = "SINCRONIZACAO_WHATSAPP";
}
```

### 3. Dados do Anúncio para Exibição

Criar campo adicional para guardar informações do anúncio:

```prisma
// No modelo Lead
dados_anuncio Json?  // { titulo, descricao, thumbnailUrl, sourceUrl }
```

### 4. Kanban - Indicadores Visuais

#### Opção A: Badge/Etiqueta Colorida
```
┌─────────────────────────────┐
│ 📢 [AD] João Silva          │  ← Badge roxo para Anúncio
│       (11) 99999-9999       │
│       R$ 80.000            │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 💬 Maria Santos             │  ← Badge verde para WhatsApp
│       (11) 88888-8888       │
│       R$ 50.000            │
└─────────────────────────────┘

┌─────────────────────────────┐
│ ✏️ Pedro Oliveira           │  ← Badge azul para Manual
│       (11) 77777-7777       │
│       R$ 100.000           │
└─────────────────────────────┘
```

#### Opção B: Ícone no Avatar/Nome
- Anúncio: 🎯 ou 📢
- WhatsApp: 💬 
- Manual: ✏️

#### Opção C: Barra Colorida Lateral
- Anúncio: Borda roxa (purple-500)
- WhatsApp: Borda verde (emerald-500)  
- Manual: Borda azul (blue-500)

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `prisma/schema.prisma` | Adicionar `dados_anuncio` Json |
| `src/lib/leads-sync-whatsapp.ts` | Detectar AD na primeira mensagem |
| `src/modules/kanban/types.ts` | Adicionar tipos para origem e dadosAd |
| `src/modules/kanban/components/lead-card.tsx` | Adicionar Badge/ícone visual |
| `src/app/api/leads/route.ts` | Manter origem MANUAL |

---

## Fluxo de Detecção

```
1. Usuário inicia conversa via anúncio no WhatsApp
         ↓
2. Evolution API recebe mensagem com externalAdReply
         ↓
3. Sync WhatsApp é executado
         ↓
4. Para cada conversa:
   a. Buscar todas mensagens
   b. Ordenar por timestamp (mais antiga primeiro)
   c. Verificar se primeira mensagem tem externalAdReply
         ↓
   SIM → origem = "ANUNCIO_CTWA"
         dados_anuncio = { titulo, descricao, sourceUrl }
         ↓
   NÃO → origem = "SINCRONIZACAO_WHATSAPP"
         (pode ter sido uma pessoa que viu o número em outro lugar)
         ↓
5. Kanban exibe com base no valor de origem
```

---

## Detecção Eficiente (1 chamada por instância)

Conforme já implementado no `buscarTodasMensagensDaInstancia()`:

```typescript
// Uma chamada por instância retorna TODAS as conversas
const todasMensagens = await buscarTodasMensagensDaInstancia(instancia);

// Agrupar por remoteJid
const porContato = new Map<string, EvolutionMensagem[]>();
for (const msg of todasMensagens) {
  const key = msg.key.remoteJid || msg.key.remoteJidAlt;
  if (!porContato.has(key)) porContato.set(key, []);
  porContato.get(key)!.push(msg);
}

// Para cada contato, verificar se a primeira mensagem tem AD
for (const [telefone,msgs] of porContato) {
  const primeira = msgs.sort((a,b) => a.key.timestamp - b.key.timestamp)[0];
  const dadosAd = extrairDadosAd(primeira);
  
  // Se tem dadosAd.titulo → é ANUNCIO_CTWA
  // Se não → é SINCRONIZACAO_WHATSAPP
}
```

**Complexidade**: O(1) chamadas API por instância (já otimizado)

---

## Considerações

1. **Leads manuais existentes**: Vão permanecer como "MANUAL" (valor padrão)
2. **Migration necessária**: Adicionar coluna `dados_anuncio` nullable
3. **Dados de anúncioremanescentes**:即使 o lead mude de estágio, mantemos os dados do anúncio
4. **Filtro no Kanban**: Opcionalmente, adicionar filtro por origem

---

## Próximos Passos (se aprovado)

1. Executar migration para adicionar campo `dados_anuncio`
2. Atualizar `leads-sync-whatsapp.ts` para detectar e salvar dados do anúncio
3. Atualizar tipos em `kanban/types.ts`
4. Adicionar componente visual de origem no Lead Card
5. Testar com dados reais

---

## Alternativas Consideradas

| Alternativa | Prós | Contras |
|-------------|------|---------|
| **Nova coluna + tipos (proposto)** | Completo, persistente, flexível | Requer migration |
| **Apenas frontend (badge)** | Sem DB change | Não persiste, não filtra |
| **JSONB para tudo** | Flexível | Mais complexo |

**Recomendado**: Abordagem híbrida - salvar no banco para persistência + UI responsiva.

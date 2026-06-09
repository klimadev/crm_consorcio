## Context

O CRM possui um módulo Laboratório com o WhatsApp Exporter, que já extrai conversas completas da Evolution API e as formata em dump de texto plano. Este exporter é usado por operadores de consórcio que gerenciam dezenas a centenas de leads via WhatsApp.

Atualmente:
- As conversas são exportadas como texto cru — sem análise, sem priorização
- Não há suporte a LLM/AI no projeto (nenhum SDK instalado)
- O sistema de automação existente (`whatsapp-automations.ts`) é baseado em templates fixos com variáveis `{{lead_nome}}` — sem personalização real
- Recharts já está disponível para visualizações
- Evolution API já tem função `enviarMensagemTexto()` pronta para envio

Restrições técnicas:
- SQLite como banco (sem JSONB, sem arrays nativos — dados estruturados em string JSON)
- Next.js 16 App Router com Server Components e API Routes
- Prisma ORM
- O provider de IA deve ser configurável (OpenAI-compatible) para ambientes com proxy, Azure, ou LLM local

## Goals / Non-Goals

**Goals:**
- Criar submódulo `ai-agent` dentro do laboratório ao lado do `whatsapp-exporter`
- Implementar provider de IA configurável (baseURL, API key, modelo) com fallback para env global
- Pipeline de análise: enviar dump completo das conversas → LLM → JSON estruturado com análise por lead
- Relatório visual com cards de prioridade, gráfico de sentimentos (Recharts), preview de follow-up e rationale
- Botão de envio direto do follow-up via WhatsApp para cada lead analisado
- Persistir configuração do provider por empresa no banco SQLite

**Non-Goals:**
- Não substituir o sistema de automações existente (`whatsapp-automations.ts`) — o AI Agent é uma ferramenta de análise pontual, não um substituo para automações contínuas
- Não implementar streaming de resposta do LLM (análise é síncrona em 1 turno)
- Não implementar webhook/recebimento de respostas do lead após envio do follow-up
- Não implementar cache de análise (cada análise é fresh)
- Não implementar rate limiting interno além do básico (pode ser adicionado depois)

## Decisions

### 1. SDK: Vercel AI SDK (`ai`) com `@ai-sdk/openai`

**Escolha**: `ai` (Vercel AI SDK) + `@ai-sdk/openai`

**Alternativas consideradas**:
- `openai` SDK direto → mais baixo nível, sem `generateObject()`, sem schema validation automática
- LangChain → overhead de abstração desnecessário para um pipeline single-turn
- OpenCodeSDK → muito específico do ecossistema OpenCode, sem suporte a structured output nativo

**Rationale**: O Vercel AI SDK é o mais moderno para Next.js (mesmo time), tem suporte nativo a `generateObject()` com schema Zod (elimina parsing manual de JSON), provider-agnóstico (troca de provider = troca o pacote `@ai-sdk/*`), e funciona perfeitamente com API Routes do Next.js.

### 2. Provider configurável por empresa

**Escolha**: Configuração salva no banco (`LaboratorioAiConfig`) + cache via variável de ambiente como fallback global

**Alternativas**:
- `.env.local` apenas → não permite que cada empresa tenha seu próprio provider/proxy
- `next.config` → imutável em runtime

**Rationale**: Empresas diferentes podem ter contratos com provedores diferentes. O schema guarda `base_url`, `api_key`, `model` + `enabled` por empresa. Se não configurado, usa `OPENAI_API_KEY` do ambiente como fallback.

### 3. Provider-agnóstico via OpenAI-compatible API

**Escolha**: Usar o provider `@ai-sdk/openai` com `baseURL` customizável — qualquer endpoint compatível com `/v1/chat/completions` funciona

**Rationale**: O `@ai-sdk/openai` permite custom `baseURL`, então suporta OpenAI direto, Azure OpenAI (via `baseURL` + deployment name como model), LiteLLM proxy, vLLM, Ollama (via proxy compatível), e qualquer outro servidor que implemente a spec de Chat Completions da OpenAI.

### 4. Análise em lote single-turn (não lead por lead)

**Escolha**: Enviar o dump completo de TODAS as conversas em uma única chamada ao LLM.

**Alternativa**: Chamar o LLM N vezes (uma por lead) → mais caro, mais lento, sem contexto comparativo entre leads.

**Rationale**: O LLM consegue processar centenas de leads em paralelo dentro de uma única chamada (contexto grande), e a comparação relativa entre leads melhora a qualidade da priorização. Um lead "quente" é quente em relação aos outros — contexto global é essencial.

### 5. JSON estruturado via `generateObject()` com schema Zod

**Escolha**: Usar `generateObject()` do AI SDK que retorna um objeto tipado validado contra schema Zod.

**Alternativa**: Usar `generateText()` + `JSON.parse()` → frágil, propenso a erros de parsing.

**Rationale**: `generateObject()` usa a funcionalidade `response_format: { type: "json_object" }` da API OpenAI + validação Zod no client. Se o JSON não bater com o schema, retorna erro claro. Zero parsing manual.

### 6. Configuração do provider no painel (não em página separada)

**Escolha**: Incluir a configuração do provider (baseURL, API key, modelo) como uma seção expansível dentro da própria página do WhatsApp Exporter / AI Agent.

**Alternativa**: Página separada de configurações → mais navegação, maior atrito.

**Rationale**: O provider é parte do workflow de análise. Ter a configuração no mesmo local que a ferramenta reduz fricção. Uma seção "Configuração do Provider IA" com input de baseURL, API key (mascarada), modelo, e botão "Testar Conexão" / "Listar Modelos".

## Data Model

```prisma
model LaboratorioAiConfig {
  id         String   @id @default(uuid())
  id_empresa String   @unique
  base_url   String   @default("https://api.openai.com/v1")
  api_key    String?
  model      String   @default("gpt-4o")
  enabled    Boolean  @default(false)
  criado_em  DateTime @default(now())
  atualizado_em DateTime @now() @updatedAt
}
```

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| **Custo de API**: Análise de centenas de conversas gasta tokens (input + output) | Exibir estimativa de custo antes de executar; mostrar contagem de mensagens; limite de 500 chats/config |
| **Latência**: LLM pode demorar 10-30s para processar muitas conversas | Timeout de 120s no fetch; botão com loading state; análise é assíncrona do ponto de vista do usuário |
| **API key exposta no banco SQLite**: Chave do provider salva em texto plano no banco | SQLite tem permissão de arquivo restrita; chave é mascarada na UI; considerar criptografia futura |
| **Modelo incompatível**: Usuário seleciona modelo que não suporta `response_format: json_object` | O provider `@ai-sdk/openai` com `generateObject()` já usa `json_object` mode; modelos antigos podem falhar — capturar erro e mostrar mensagem clara |
| **Dados sensíveis**: Conversas de leads enviadas para LLM externo | Provider configurável permite usar LLM local (Ollama/vLLM) para dados sensíveis; usuário escolhe |
| **Erro de análise parcial**: LLM pode pular alguns leads se o prompt for muito grande | Schema Zod valida que todos os leads esperados estão presentes; log de warnings |

## Open Questions

- Devemos criptografar a `api_key` no banco? (Simples: usar SQLite Encryption Extension; Médio: criptografia na aplicação com chave mestra do .env)
- Devemos limitar o número de análises por dia por empresa? (Para evitar abuso de custo)
- O prompt do sistema deve ser editável pelo usuário avançado? (Pode vir em versão futura)

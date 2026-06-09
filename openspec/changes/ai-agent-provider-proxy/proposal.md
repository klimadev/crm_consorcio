## Why

O módulo WhatsApp Exporter do Laboratório já extrai conversas completas com sucesso, mas os dados são entregues como texto bruto — sem análise, sem priorização, sem ação. O time precisa de um agente de IA integrado ao painel que analise as conversas em lote, identifique leads prontos para follow-up, e gere uma mensagem altamente personalizada para cada um — sem depender de templates genéricos ou de um provedor de IA fixo. A necessidade de suportar proxies/providers OpenAI-compatíveis (como Azure, LiteLLM, Ollama, ou modelos locais) é requisito de primeira classe para ambientes com restrição de dados ou que já possuem contratos com outros provedores.

## What Changes

- **Novo submódulo `ai-agent`** dentro do laboratório, ao lado do `whatsapp-exporter`
- **Provider configurável** no painel do exportador: URL base, chave API, modelo (com listagem consultável de modelos disponíveis mas sem restrição obrigatória ao modelo escolhido)
- **Pipeline de análise em lote**: pega o dump completo das conversas → envia em 1 turno para o LLM → recebe JSON estruturado com análise de cada lead
- **Relatório visual**: dashboard com cards de prioridade, gráfico de sentimentos (Recharts), e preview do follow-up personalizado com rationale
- **Botão de envio direto**: cada follow-up pode ser disparado via WhatsApp (Evolution API) com 1 clique
- **Provider-agnóstico**: usa API compatível com OpenAI Chat Completions (`/v1/chat/completions`), suportando qualquer provedor (OpenAI, Azure, Anthropic via proxy, LiteLLM, vLLM, Ollama, etc.)
- **Configuração persistida**: as credenciais do provider são salvas por empresa no banco via uma nova tabela/configuração

## Capabilities

### New Capabilities

- `ai-agent`: Agente de IA que analisa conversas WhatsApp em lote, retorna análise estruturada de leads com priorização e gera follow-ups personalizados, com provider LLN configurável
- `provider-config`: Tela/configuração no painel do laboratório para definir baseURL, API key, modelo, e consultar modelos disponíveis do provider

### Modified Capabilities

Nenhuma — não existem specs anteriores para modificar, e as capacidades existentes (whatsapp-exporter, evolution-api) não têm requisitos alterados.

## Impact

- **Novas dependências**: `ai`, `@ai-sdk/openai` (SDKs — instalados via npm)
- **Nova variável de ambiente**: `OPENAI_API_KEY` (fallback global quando não configurado por empresa)
- **Novo modelo Prisma**: `LaboratorioAiConfig` (store de configuração do provider por empresa)
- **Novas APIs**:
  - `POST /api/dev/laboratorio/ai-agent/analyze` — análise das conversas
  - `POST /api/dev/laboratorio/ai-agent/send` — envio de follow-up
  - `POST /api/dev/laboratorio/ai-agent/models` — listagem de modelos (opcional — consulta o provider)
- **Novos componentes UI**: módulo `ai-agent` completo com componentes, hooks, tipos
- **Modificação no laboratório**: o `use-laboratorio.ts` ganha nova feature entry; o `whatsapp-exporter` ganha seção de configuração do provider

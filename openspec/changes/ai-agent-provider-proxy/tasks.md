## 1. Setup: Dependências e Modelo de Dados

- [x] 1.1 Instalar pacotes npm: `ai`, `@ai-sdk/openai`, `openai`
- [x] 1.2 Adicionar variável `OPENAI_API_KEY` ao `.env.development` como fallback global
- [x] 1.3 Criar migration Prisma com modelo `LaboratorioAiConfig` (id, id_empresa, base_url, api_key, model, enabled, timestamps)
- [x] 1.4 Executar `prisma migrate dev` para gerar a tabela no banco
- [x] 1.5 Criar estrutura de diretórios: `src/modules/laboratorio/ai-agent/` com subpastas `api/`, `components/`, `hooks/`, `lib/`

## 2. Provider Config (Configuração do Provedor IA)

- [x] 2.1 Implementar lib `src/modules/laboratorio/ai-agent/lib/ai-client.ts`:
  - [x] 2.1.1 Função `createAiProvider(opts: { baseUrl, apiKey, model }): { model: AíSdkModel }`
  - [x] 2.1.2 Função `getAiConfig(idEmpresa: string): Promise<{ baseUrl, apiKey, model }>` que busca no banco ou fallback para env
  - [x] 2.1.3 Função `listProviderModels(baseUrl, apiKey): Promise<string[]>` que consulta `GET {baseUrl}/models`
  - [x] 2.1.4 Função `testProviderConnection(baseUrl, apiKey, model): Promise<boolean>` que faz chamada simples de teste
- [x] 2.2 Criar API `POST /api/dev/laboratorio/ai-agent/config/save` — salva configuração do provider
- [x] 2.3 Criar API `GET /api/dev/laboratorio/ai-agent/config` — retorna configuração atual (api_key mascarada)
- [x] 2.4 Criar API `POST /api/dev/laboratorio/ai-agent/config/test` — testa conexão com o provider
- [x] 2.5 Criar API `POST /api/dev/laboratorio/ai-agent/config/models` — lista modelos disponíveis
- [x] 2.6 Criar componente `provider-config-section.tsx`:
  - Seção collapsible "Configuração do Provedor IA"
  - Campos: Base URL, API Key (password/mascarado), Modelo (text input)
  - Botão "Consultar Modelos" → preenche sugestões sem restringir
  - Botão "Testar Conexão" → badge verde/amarelo indicando status
  - Botão "Salvar Configuração"

## 3. AI Agent Core (Análise de Conversas)

- [x] 3.1 Criar schemas Zod em `types.ts`:
  - [x] 3.1.1 `LeadAnalysisSchema` (leadName, phoneNumber, remoteJid?, messageCount, sentiment, interesse, painPoints, buyingSignals, objecoes, perfil, prioridade, recommendedAction, followUpMessage, rationale)
  - [x] 3.1.2 `AnalysisResultSchema` (analysis: array de LeadAnalysis, summary com totalLeads/urgentes/quentes/frios)
  - [x] 3.1.3 `AnalyzeRequestSchema` (instanceIds, chatLimit, messagesPerChat)
- [x] 3.2 Criar o system prompt em `lib/prompts.ts`:
  - Prompt que instrui o LLM a analisar o dump completo
  - Regras anti-AI-slop (sem frases genéricas, referenciar fatos específicos)
  - Instrução de formato JSON estruturado
  - Regras de honestidade (não forçar follow-up se lead não demonstrou interesse)
- [x] 3.3 Criar API `POST /api/dev/laboratorio/ai-agent/analyze`:
  - [x] 3.3.1 Autenticação via `exigirSessao()`
  - [x] 3.3.2 Validação do body com Zod
  - [x] 3.3.3 Buscar contatos + mensagens (reusa `buscarContatos()` e `buscarMensagensPorChat()` da evolution-api)
  - [x] 3.3.4 Construir dump formatado (reusa lógica de `formatarDumpWhatsapp()` do exporter)
  - [x] 3.3.5 Obter config do provider (função `getAiConfig()`)
  - [x] 3.3.6 Chamar `generateObject()` do AI SDK com schema `AnalysisResultSchema`
  - [x] 3.3.7 Retornar JSON validado ou erro descritivo
- [x] 3.4 Criar Hook `hooks/use-ai-agent.ts`:
  - Estado: config, analyzing, result, error
  - Funções: analyze(), saveConfig(), testConnection(), listModels()
  - Reaproveita `useWhatsappExporter` para lógica de instâncias

## 4. Relatório Visual (UI de Resultados)

- [x] 4.1 Criar componente `sentiment-chart.tsx`:
  - Gráfico donut/pizza (Recharts) com distribuição de sentimentos
  - Cores: CALOR=#22c55e, MORNO=#eab308, FRIO=#3b82f6, INDEFINIDO=gray
  - Tooltip com contagem e percentual
  - Estado vazio quando não há dados
- [x] 4.2 Criar componente `lead-insight-card.tsx`:
  - Card com prioridade (🔥⏳❄️), nome, sentimento, interesse, painPoints
  - Preview da followUpMessage com destaque
  - Rationale em texto menor
  - Botões: "Enviar WhatsApp" e "Copiar"
  - Estados: normal (dados carregados), sending (loading), sent (desabilitado), erro
- [x] 4.3 Criar componente `follow-up-preview.tsx`:
  - Área de destaque para a mensagem de follow-up
  - Badge "Personalizado" com tooltip explicando que foi gerado por IA
  - Se followUpMessage vazia: "Nenhum follow-up sugerido — lead frio"
- [x] 4.4 Criar componente `analysis-report.tsx`:
  - Orquestra sentiment-chart + lista de lead-insight-cards
  - Ordenação por prioridade (🔥 → ⚡ → ⏳ → ❄️)
  - Summary header com contagens totais
  - Estados: loading (skeleton), empty, error, success
- [x] 4.5 Criar página `page.tsx` do ai-agent:
  - Instância selector (reusa existente)
  - Provider config section (collapsible)
  - Config de exportação (chatLimit, messagesPerChat)
  - Botão "Analisar com IA"
  - Analysis report (quando concluído)

## 5. Envio de Follow-up via WhatsApp

- [x] 5.1 Criar API `POST /api/dev/laboratorio/ai-agent/send`:
  - [x] 5.1.1 Autenticação + validação
  - [x] 5.1.2 Resolver instância do lead via `resolverInstanciaDoLead()`
  - [x] 5.1.3 Enviar via `enviarMensagemTexto()` da evolution-api
  - [x] 5.1.4 Log da mensagem no banco via `upsertMensagensNoBanco()`
  - [x] 5.1.5 Retornar sucesso/erro
- [x] 5.2 Integrar botão "Enviar WhatsApp" no `lead-insight-card.tsx` com chamada à API de send
- [x] 5.3 Estados de envio no card: idle → sending → sent (disabled) / error (retry)

## 6. Integração com o Módulo Laboratório

- [x] 6.1 Adicionar feature `ai-agent` no `use-laboratorio.ts` (lista de features)
- [x] 6.2 Exportar `AiAgentPage` no `index.ts` do módulo
- [x] 6.3 Adicionar entrada no `ModuloLaboratorio` em `page.tsx` (ao lado do WhatsAppExporterPage)
- [x] 6.4 Verificar sidebar/navegação se necessário

## 7. Testes e Finalização

- [ ] 7.1 Testar fluxo completo: configurar provider → selecionar instâncias → analisar → ver relatório → enviar follow-up
- [ ] 7.2 Testar fallback para env `OPENAI_API_KEY` sem config no banco
- [ ] 7.3 Testar listagem de modelos (OpenAI + proxy sem endpoint /models)
- [ ] 7.4 Testar caso de erro: provider inválido, instância offline, lead sem follow-up
- [ ] 7.5 Verificar build: `npm run build` sem erros

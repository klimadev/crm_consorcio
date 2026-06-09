## ADDED Requirements

### Requirement: Análise de conversas em lote

O sistema SHALL permitir que o usuário selecione instâncias WhatsApp e execute uma análise de IA em lote sobre as conversas exportadas, recebendo um JSON estruturado com a avaliação de cada lead.

#### Scenario: Análise bem-sucedida de múltiplos leads
- **WHEN** o usuário seleciona instâncias WhatsApp, configura chatLimit (padrão 500) e messagesPerChat (padrão 30), e clica em "Analisar com IA"
- **THEN** o sistema exporta as conversas, envia o dump completo para o LLM configurado em 1 único turno, e retorna um array de objetos `LeadAnalysis` com: leadName, phoneNumber, messageCount, sentiment, interesse, painPoints, buyingSignals, objecoes, perfil, prioridade, recommendedAction, followUpMessage e rationale

#### Scenario: Nenhum lead a analisar
- **WHEN** o usuário inicia a análise mas não há conversas nas instâncias selecionadas
- **THEN** o sistema retorna uma resposta vazia com `analysis: []` e mensagem "Nenhuma conversa encontrada para analisar"

#### Scenario: Erro comunicação com o provider LLM
- **WHEN** o provider LLM retorna erro (timeout, 401, 429) durante a análise
- **THEN** o sistema retorna erro 502 com mensagem descritiva do problema e sugere verificar a configuração do provider

---

### Requirement: Prompt anti-AI-slop

O sistema SHALL utilizar um system prompt projetado para evitar mensagens genéricas, garantindo que cada follow-up gerado seja factualmente baseado na conversa e não contenha frases-feitas de vendas.

#### Scenario: Follow-up referencia fato específico da conversa
- **WHEN** o LLM gera um follow-upMessage para um lead que mencionou "o valor das parcelas está alto"
- **THEN** a mensagem gerada DEVE conter referência direta a este fato (ex: "você mencionou que as parcelas pesaram...")
- **AND** a mensagem NÃO DEVE conter frases como "gostaria de saber", "venho através de", "conforme conversamos", "segue", "espero que", "para dar continuidade"

#### Scenario: Lead sem interesse é marcado corretamente
- **WHEN** o lead não demonstrou interesse real na conversa (respostas curtas, não respondeu perguntas, disse "não" claramente)
- **THEN** o sistema marca prioridade como "❄️ FRIA" e a followUpMessage pode ser vazia ou sugerir não enviar mensagem

---

### Requirement: Relatório visual com gráficos

O sistema SHALL exibir um relatório visual com cards de prioridade ordenados e pelo menos um gráfico de distribuição de sentimentos utilizando Recharts.

#### Scenario: Relatório exibe cards ordenados por prioridade
- **WHEN** a análise é concluída com leads de diferentes prioridades
- **THEN** os leads são exibidos em cards ordenados por prioridade (🔥 URGENTE → ⚡ ALTA → ⏳ MEDIA → ❄️ FRIA)
- **AND** cada card mostra: nome, sentimento, interesse, resumo dos pain points, preview do follow-up, rationale, botão "Enviar WhatsApp" e botão "Copiar"

#### Scenario: Gráfico de distribuição de sentimentos
- **WHEN** a análise é concluída com 2 ou mais leads
- **THEN** o sistema renderiza um gráfico donut/pizza (Recharts) mostrando a distribuição de sentimentos (CALOR, MORNO, FRIO, INDEFINIDO) com cores distintas

---

### Requirement: Envio direto do follow-up via WhatsApp

O sistema SHALL permitir que o usuário envie a mensagem de follow-up gerada diretamente para o lead via WhatsApp com 1 clique, utilizando a Evolution API já integrada.

#### Scenario: Envio bem-sucedido
- **WHEN** o usuário clica em "Enviar WhatsApp" em um card de lead
- **THEN** o sistema envia a followUpMessage para o número do lead via Evolution API (`enviarMensagemTexto`)
- **AND** exibe toast de sucesso com "Mensagem enviada para [nome]"
- **AND** desabilita o botão de envio para aquele lead (previne duplicidade)

#### Scenario: Envio com falha
- **WHEN** o envio WhatsApp falha (instância offline, número inválido)
- **THEN** o sistema exibe toast de erro com a descrição do problema
- **AND** mantém o botão de envio habilitado para retentativa

#### Scenario: Lead não tem followUpMessage
- **WHEN** o lead tem prioridade "❄️ FRIA" e followUpMessage vazia/nula
- **THEN** o botão "Enviar WhatsApp" fica desabilitado com tooltip "Lead frio — sem follow-up sugerido"

## ADDED Requirements

### Requirement: Configuração de provider LLM no painel

O sistema SHALL exibir uma seção de configuração do provider de IA dentro da página do WhatsApp Exporter / AI Agent, permitindo que o usuário defina a URL base, chave de API, e modelo a ser utilizado.

#### Scenario: Exibição da seção de configuração
- **WHEN** o usuário acessa a página do WhatsApp Exporter / AI Agent
- **THEN** há uma seção expansível (collapsible) intitulada "Configuração do Provedor IA"
- **AND** a seção contém: campo "Base URL" (placeholder: "https://api.openai.com/v1"), campo "API Key" (type=password, mascarado), campo "Modelo" (text input, valor padrão "gpt-4o")

#### Scenario: Salvar configuração com sucesso
- **WHEN** o usuário preenche os campos e clica em "Salvar Configuração"
- **THEN** o sistema persiste os dados no banco (tabela `LaboratorioAiConfig`) associados à empresa do usuário
- **AND** exibe toast de sucesso

#### Scenario: API Key não é reenviada se já salva
- **WHEN** o usuário abre a configuração e a API key já está salva no banco
- **THEN** o campo API Key aparece preenchido com valor mascarado (asteriscos)
- **AND** se o usuário não alterar o campo, a key existente é mantida

---

### Requirement: Fallback para variável de ambiente

O sistema SHALL utilizar a variável de ambiente `OPENAI_API_KEY` como fallback global quando a empresa não tiver configurado seu próprio provider.

#### Scenario: Sem configuração de empresa usa variável de ambiente
- **WHEN** a empresa não possui registro em `LaboratorioAiConfig` ou `enabled = false`
- **THEN** o sistema utiliza `process.env.OPENAI_API_KEY` como chave de API
- **AND** utiliza "https://api.openai.com/v1" como baseURL e "gpt-4o" como modelo padrão

---

### Requirement: Listagem de modelos do provider

O sistema SHALL oferecer um botão "Consultar Modelos" que faz uma requisição ao provider para listar os modelos disponíveis, exibindo-os como sugestão — sem restringir o campo de modelo a apenas os listados.

#### Scenario: Consulta de modelos com sucesso
- **WHEN** o usuário clica em "Consultar Modelos" e o provider é OpenAI-compatible com endpoint `/v1/models`
- **THEN** o sistema consulta o endpoint `GET {baseURL}/models` com a API key configurada
- **AND** exibe os modelos disponíveis em uma lista clicável
- **AND** ao clicar em um modelo, ele preenche o campo "Modelo"

#### Scenario: Consulta de modelos sem suporte
- **WHEN** o provider não possui endpoint `/v1/models` (ex: proxy customizado)
- **THEN** o sistema retorna mensagem "Não foi possível listar modelos — use o campo manual"
- **AND** mantém o campo de modelo editável

---

### Requirement: Indicador visual de configuração válida

O sistema SHALL exibir um badge/indicador visual quando uma configuração de provider válida estiver ativa e operacional.

#### Scenario: Provider configurado e funcional
- **WHEN** o provider está configurado e o botão "Testar Conexão" retorna sucesso (chamada simples ao modelo)
- **THEN** exibe um badge verde "Provedor configurado: [modelo]"
- **AND** habilita o botão "Analisar com IA"

#### Scenario: Provider não configurado
- **WHEN** não há configuração de provider salva nem variável de ambiente
- **THEN** exibe um badge amarelo "Provedor não configurado"
- **AND** desabilita o botão "Analisar com IA" com tooltip "Configure um provedor de IA primeiro"

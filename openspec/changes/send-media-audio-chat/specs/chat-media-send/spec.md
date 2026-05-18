## ADDED Requirements

### Requirement: Usuario pode selecionar e enviar imagem pelo chat
O sistema DEVE permitir que o usuario selecione uma imagem do dispositivo e a envie pelo chat, com preview antes do envio.

#### Scenario: Selecao de imagem valida
- **WHEN** usuario clica no botao de anexo (📎) e seleciona uma imagem (jpg, png, webp) de ate 10MB
- **THEN** o sistema exibe thumbnail de preview com nome do arquivo e campo opcional de legenda

#### Scenario: Arquivo grande rejeitado no cliente
- **WHEN** usuario seleciona uma imagem maior que 10MB
- **THEN** o sistema exibe mensagem de erro "Arquivo muito grande. Limite: 10MB" e nao prossegue

#### Scenario: Envio de imagem com sucesso
- **WHEN** usuario confirma o envio da imagem (com ou sem legenda)
- **THEN** o sistema envia via Evolution API `/message/sendMedia/{instance}`, mostra mensagem otimista com thumbnail no chat, e substitui pela resposta do servidor quando disponivel

#### Scenario: Envio de imagem com WhatsApp offline
- **WHEN** usuario tenta enviar imagem mas a instancia WhatsApp esta offline
- **THEN** o sistema exibe erro "WhatsApp desconectado" e mantem a mensagem no estado ERROR com opcao de reenvio

#### Scenario: Envio de imagem com PDV sem instancia
- **WHEN** usuario tenta enviar imagem mas o PDV do lead nao tem instancia WhatsApp configurada
- **THEN** o sistema exibe o estado bloqueado com mensagem e link para configuracao, se o usuario tiver permissao

### Requirement: Usuario pode selecionar e enviar documento pelo chat
O sistema DEVE permitir que o usuario selecione um documento do dispositivo e o envie pelo chat.

#### Scenario: Selecao de documento valido
- **WHEN** usuario clica no botao de anexo (📎) e seleciona um documento (pdf, doc, xlsx, etc.) de ate 100MB
- **THEN** o sistema exibe chip de preview com nome do arquivo, tamanho e tipo

#### Scenario: Envio de documento com sucesso
- **WHEN** usuario confirma o envio do documento
- **THEN** o sistema envia via Evolution API `/message/sendMedia/{instance}` com `mediatype: "document"`, mostra chip otimista no chat, e substitui pela resposta do servidor

#### Scenario: Formato de arquivo nao suportado
- **WHEN** usuario seleciona um arquivo com extensao bloqueada (.exe, .sh, etc.)
- **THEN** o sistema rejeita e exibe "Formato de arquivo nao suportado"

### Requirement: Validacao de tamanho de arquivo no servidor
O sistema DEVE rejeitar arquivos que excedam os limites de tamanho no servidor, independente da validacao do cliente.

#### Scenario: Imagem acima do limite no servidor
- **WHEN** a API recebe um payload com imagem base64 maior que 10MB
- **THEN** retorna 400 com mensagem "Arquivo muito grande. Limite: 10MB"

#### Scenario: Documento acima do limite no servidor
- **WHEN** a API recebe um payload com documento base64 maior que 100MB
- **THEN** retorna 400 com mensagem "Arquivo muito grande. Limite: 100MB"

### Requirement: Suporte a legenda em imagens
O sistema DEVE permitir que o usuario adicione uma legenda de texto ao enviar uma imagem.

#### Scenario: Envio de imagem com legenda
- **WHEN** usuario preenche o campo de legenda com texto e envia a imagem
- **THEN** a legenda e enviada como `caption` no payload da Evolution API e exibida abaixo da imagem no chat

#### Scenario: Envio de imagem sem legenda
- **WHEN** usuario envia imagem sem preencher a legenda
- **THEN** a imagem e enviada sem caption e exibida normalmente no chat

### Requirement: Persistencia de mensagens de midia no banco
O sistema DEVE persistir mensagens de midia enviadas no banco de dados com o tipo correto.

#### Scenario: Persistencia de imagem enviada
- **WHEN** uma imagem e enviada com sucesso
- **THEN** um registro em `WhatsappMensagem` e criado com `tipo: "imageMessage"` e `conteudo: "[Imagem]"` (ou legenda, se houver)

#### Scenario: Persistencia de documento enviado
- **WHEN** um documento e enviado com sucesso
- **THEN** um registro em `WhatsappMensagem` e criado com `tipo: "documentMessage"` e `conteudo` contendo o nome do arquivo

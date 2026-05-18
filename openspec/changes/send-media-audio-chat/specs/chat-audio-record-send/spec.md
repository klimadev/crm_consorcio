## ADDED Requirements

### Requirement: Usuario pode gravar audio pelo microfone
O sistema DEVE permitir que o usuario grave audio usando o microfone do dispositivo, com feedback visual durante a gravacao.

#### Scenario: Inicio da gravacao
- **WHEN** usuario clica no botao de microfone (🎤) e o navegador suporta `MediaRecorder`
- **THEN** o sistema solicita permissao de microfone, inicia a gravacao, e exibe timer crescente + animacao de waveform

#### Scenario: Gravacao em andamento
- **WHEN** a gravacao esta ativa
- **THEN** o sistema exibe timer (MM:SS), waveform animada ou indicador de volume, e botoes "Parar" e "Cancelar"

#### Scenario: Parar e revisar gravacao
- **WHEN** usuario clica em "Parar" durante a gravacao
- **THEN** o sistema finaliza a gravacao, exibe a duracao final, e mostra botoes "Enviar" e "Cancelar"

#### Scenario: Cancelar gravacao antes de enviar
- **WHEN** usuario clica em "Cancelar" (durante ou apos a gravacao)
- **THEN** o sistema descarta o audio gravado e retorna ao estado normal do input

#### Scenario: Envio de audio gravado com sucesso
- **WHEN** usuario clica em "Enviar" apos gravar
- **THEN** o sistema codifica o audio como base64, envia via Evolution API `/message/sendWhatsAppAudio/{instance}`, mostra mensagem otimista com player de audio no chat, e substitui pela resposta do servidor

### Requirement: Feedback de gravacao com timer e waveform
O sistema DEVE fornecer feedback visual claro durante a gravacao de audio.

#### Scenario: Exibicao do timer
- **WHEN** a gravacao esta em andamento
- **THEN** o sistema exibe a duracao no formato `MM:SS` atualizando a cada segundo

#### Scenario: Exibicao de waveform ou indicador de volume
- **WHEN** a gravacao esta em andamento
- **THEN** o sistema exibe uma representacao visual do audio (waveform animada ou barras de volume)

#### Scenario: Limite de duracao
- **WHEN** a gravacao atinge 5 minutos (300 segundos)
- **THEN** o sistema para automaticamente e exibe a opcao de enviar ou cancelar

### Requirement: Tratamento de navegador sem suporte a gravacao
O sistema DEVE tratar graciosamente navegadores que nao suportam `MediaRecorder`.

#### Scenario: Navegador sem suporte
- **WHEN** usuario clica no microfone em um navegador sem `MediaRecorder`
- **THEN** o sistema exibe mensagem "Seu navegador nao suporta gravacao de audio. Use Chrome ou Edge."

#### Scenario: Permissao de microfone negada
- **WHEN** usuario nega a permissao de microfone
- **THEN** o sistema exibe mensagem "Permissao de microfone necessaria para gravar audio. Verifique as configuracoes do navegador."

### Requirement: Persistencia de audio enviado no banco
O sistema DEVE persistir audios enviados com o tipo e duracao corretos.

#### Scenario: Persistencia de audio enviado
- **WHEN** um audio e enviado com sucesso
- **THEN** um registro em `WhatsappMensagem` e criado com `tipo: "audioMessage"` e metadados de duracao no `payload_json`

### Requirement: Envio de audio funciona em ambos os chats
O sistema DEVE suportar gravacao e envio de audio tanto no chat da pagina `/chat` quanto no chat do drawer do kanban.

#### Scenario: Gravacao no chat principal
- **WHEN** usuario grava e envia audio pelo chat em `/chat`
- **THEN** o audio e enviado e exibido como bolha de audio no chat

#### Scenario: Gravacao no chat do kanban
- **WHEN** usuario grava e envia audio pelo chat dentro do drawer de detalhes do lead no kanban
- **THEN** o audio e enviado e exibido como bolha de audio no chat

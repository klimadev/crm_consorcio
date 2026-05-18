## ADDED Requirements

### Requirement: Imagens recebidas sao exibidas como thumbnails inline
O sistema DEVE exibir imagens recebidas via WhatsApp como thumbnails visiveis diretamente no chat, substituindo o label textual `[Imagem]`.

#### Scenario: Exibicao de imagem recebida
- **WHEN** uma mensagem recebida tem `kind: "image"` e o chat esta visivel
- **THEN** o sistema exibe um thumbnail da imagem (carregado sob demanda do endpoint `/api/whatsapp/chat/media`) com proporcoes adequadas (max-width 280px, altura automatica)

#### Scenario: Carregamento de thumbnail com loading state
- **WHEN** o thumbnail da imagem esta sendo buscado da API
- **THEN** o sistema exibe um placeholder com shimmer/skeleton animation e o texto "Carregando imagem..."

#### Scenario: Erro ao carregar imagem
- **WHEN** a busca da imagem falha (timeout, midia nao encontrada)
- **THEN** o sistema exibe um estado de erro com icone de alerta e mensagem "Nao foi possivel carregar a imagem"

#### Scenario: Cache de imagem
- **WHEN** uma imagem ja foi carregada e exibida nos ultimos 5 minutos
- **THEN** o sistema reutiliza a imagem em cache em vez de buscar novamente da API

### Requirement: Lightbox para visualizacao ampliada de imagens
O sistema DEVE permitir que o usuario clique em uma imagem para ve-la em tamanho ampliado (lightbox).

#### Scenario: Abertura do lightbox
- **WHEN** usuario clica em um thumbnail de imagem no chat
- **THEN** o sistema abre um overlay/lightbox exibindo a imagem em tamanho maior, com botao de fechar (X) e clique fora para fechar

#### Scenario: Fechamento do lightbox
- **WHEN** usuario clica no botao X, clica fora da imagem, ou pressiona ESC
- **THEN** o lightbox fecha e retorna a visualizacao normal do chat

### Requirement: Videos recebidos sao exibidos com thumbnail
O sistema DEVE exibir videos recebidos como thumbnails clicaveis.

#### Scenario: Exibicao de video recebido
- **WHEN** uma mensagem recebida tem `kind: "video"`
- **THEN** o sistema exibe um thumbnail do video com icone de play sobreposto e a duracao (se disponivel)

#### Scenario: Reproducao de video
- **WHEN** usuario clica no thumbnail de video
- **THEN** o sistema abre o video em lightbox com player nativo HTML5 para reproducao

### Requirement: Documentos recebidos sao exibidos como chips de download
O sistema DEVE exibir documentos recebidos como chips informativos com opcao de download, substituindo o label textual `[Arquivo: nome.pdf]`.

#### Scenario: Exibicao de documento recebido
- **WHEN** uma mensagem recebida tem `kind: "document"`
- **THEN** o sistema exibe um chip com icone do tipo de arquivo, nome do documento, tamanho (se disponivel), e botao de download

#### Scenario: Download de documento
- **WHEN** usuario clica no botao de download no chip de documento
- **THEN** o sistema busca o documento do endpoint `/api/whatsapp/chat/media` e inicia o download no navegador

### Requirement: Indicacao de tipo de mensagem nao-textual
O sistema DEVE indicar claramente quando uma mensagem nao e de texto, usando icones apropriados.

#### Scenario: Bolha de imagem propria (enviada)
- **WHEN** o usuario envia uma imagem
- **THEN** a bolha exibe o thumbnail da imagem com indicador de status (enviado/entregue/lido) e a legenda (se houver), no lado direito do chat

#### Scenario: Bolha de imagem de terceiro (recebida)
- **WHEN** o lead envia uma imagem
- **THEN** a bolha exibe o thumbnail da imagem no lado esquerdo do chat, com o estilo de mensagem recebida

### Requirement: Fallback textual para tipos de midia nao suportados
O sistema DEVE manter fallback textual para tipos de midia que nao possuem renderizacao inline implementada.

#### Scenario: Sticker recebido
- **WHEN** uma mensagem recebida tem `kind: "sticker"`
- **THEN** o sistema exibe "🎯 Sticker" como fallback textual (mantendo comportamento atual)

#### Scenario: Mensagem de localizacao recebida
- **WHEN** uma mensagem recebida tem `kind: "location"`
- **THEN** o sistema exibe "📍 Localizacao" como fallback textual

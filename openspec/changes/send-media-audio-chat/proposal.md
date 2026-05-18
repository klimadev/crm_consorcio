## Why

Atualmente o chat do CRM suporta apenas envio e recebimento de texto. Os botões de anexo (📎) e microfone (🎤) no input de mensagens são placeholders sem funcionalidade. Imagens, documentos e áudios recebidos do WhatsApp são detectados mas exibidos apenas como labels textuais (`[Imagem]`, `[Vídeo]`). Vendedores e gerentes precisam compartilhar fotos de propostas, documentos, e enviar notas de voz — funcionalidades essenciais para um CRM de vendas que usa WhatsApp como canal principal de comunicação com leads.

## What Changes

- **Envio de imagens e documentos**: Botão de anexo (📎) ganha funcionalidade — abre seletor de arquivos, preview antes de enviar, envio via Evolution API com optimistic UI
- **Envio de áudio com gravação**: Botão de microfone (🎤) ganha funcionalidade — grava áudio do microfone (tap-to-toggle), preview com timer e cancelamento, envio via Evolution API
- **Exibição inline de mídia recebida**: Imagens, vídeos e documentos recebidos passam de labels textuais para visualização inline (thumbnails, lightbox para imagens, chip de download para documentos)
- **Suporte generoso a tamanho de arquivo**: Limite configurado compatível com os limites do WhatsApp (imagens até 5MB, áudio até 16MB, documentos até 100MB)
- **Ambos os chats contemplados**: Funcionalidade disponível tanto no `/chat` quanto no chat por lead dentro do `/kanban` (compartilham os mesmos componentes e hook)

## Capabilities

### New Capabilities

- `chat-media-send`: Envio de imagens e documentos pelo chat via Evolution API, com preview, optimistic UI e tratamento de erros
- `chat-audio-record-send`: Gravação de áudio pelo microfone do navegador e envio como nota de voz via Evolution API
- `chat-media-display`: Exibição inline de imagens, vídeos e documentos recebidos no chat (thumbnails, lightbox, download)

### Modified Capabilities

_Nenhuma — todas as mudanças são aditivas. Nenhum comportamento existente é alterado._

## Impact

- **API Routes**: 2 novas rotas (`/api/whatsapp/chat/send-media`, `/api/whatsapp/chat/send-audio`)
- **Evolution API**: 2 novos wrappers em `evolution-api.ts` (`sendMedia`, `sendWhatsAppAudio`) e em `whatsapp-chat.ts`
- **Frontend Hook**: `useWhatsappChat` ganha `sendMedia()` e `sendAudio()`
- **Frontend Components**: `WhatsappMessageInput` atualizado, novos componentes `ImageMessageBubble`, `MediaPicker`, `AudioRecorder`
- **API Client**: `@/lib/api/whatsapp.ts` ganha `enviarMidiaWhatsapp()` e `enviarAudioWhatsapp()`
- **Validação**: Novos schemas Zod em `validacoes.ts`
- **Body Size Limit**: Configuração do Next.js para aceitar payloads maiores (até 100MB para documentos)
- **Banco de Dados**: Nenhuma alteração de schema — `WhatsappMensagem.tipo` já suporta todos os tipos necessários

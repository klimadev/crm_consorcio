## 1. Backend Foundation — Evolution API & Helpers

- [ ] 1.1 Adicionar `enviarMidiaEvolution()` em `src/lib/evolution-api.ts` — wrapper para `POST /message/sendMedia/{instance}` com parâmetros `number`, `mediatype`, `media` (base64), `fileName`, `caption?`
- [ ] 1.2 Adicionar `enviarAudioEvolution()` em `src/lib/evolution-api.ts` — wrapper para `POST /message/sendWhatsAppAudio/{instance}` com parâmetros `number`, `audio` (base64)
- [ ] 1.3 Adicionar `enviarMidiaWhatsapp()` e `enviarAudioWhatsapp()` em `src/lib/whatsapp-chat.ts` — funções de alto nível com normalização de telefone, chamada Evolution, e retorno da resposta bruta
- [ ] 1.4 Adicionar constantes de limite de tamanho de arquivo em `src/lib/whatsapp-utils.ts`: `LIMITES_ARQUIVO` com `IMAGEM: 10MB`, `AUDIO: 20MB`, `DOCUMENTO: 100MB` (em bytes)

## 2. API Routes — Endpoints de Envio

- [ ] 2.1 Criar `src/app/api/whatsapp/chat/send-media/route.ts` — POST que valida sessão, permissão do lead, resolve instância, chama `enviarMidiaWhatsapp()`, persiste via `prisma.$transaction`, retorna mensagem mapeada. Configurar `maxDuration = 120`
- [ ] 2.2 Criar `src/app/api/whatsapp/chat/send-audio/route.ts` — POST que valida sessão, permissão do lead, resolve instância, chama `enviarAudioWhatsapp()`, persiste via `prisma.$transaction`, retorna mensagem mapeada. Configurar `maxDuration = 120`

## 3. Validação — Schemas Zod

- [ ] 3.1 Adicionar `esquemaWhatsappChatSendMedia` em `src/lib/validacoes.ts` — valida `leadId`, `mediaBase64` (string, min 1, max por tipo), `mimeType`, `fileName`, `caption?`, `clientTempId`
- [ ] 3.2 Adicionar `esquemaWhatsappChatSendAudio` em `src/lib/validacoes.ts` — valida `leadId`, `audioBase64` (string, min 1), `mimeType`, `duration?`, `clientTempId`
- [ ] 3.3 Adicionar validação de tamanho máximo no Zod usando `.refine()` para verificar tamanho do base64 decodificado contra os limites definidos

## 4. API Client — Funções de Fetch no Frontend

- [ ] 4.1 Adicionar `enviarMidiaWhatsapp()` em `src/lib/api/whatsapp.ts` — cliente HTTP para `POST /api/whatsapp/chat/send-media`, com tipagem de resposta e tratamento de erro
- [ ] 4.2 Adicionar `enviarAudioWhatsapp()` em `src/lib/api/whatsapp.ts` — cliente HTTP para `POST /api/whatsapp/chat/send-audio`, com tipagem de resposta e tratamento de erro

## 5. Hook — useWhatsappChat (sendMedia e sendAudio)

- [ ] 5.1 Adicionar `sendMedia()` em `src/modules/whatsapp/hooks/use-whatsapp-chat.ts` — recebe `{ file: File, caption?: string }`, cria mensagem otimista (`kind: "image"` ou `"document"`), lê arquivo como base64 via `FileReader`, chama `enviarMidiaWhatsapp()`, substitui otimista pela resposta
- [ ] 5.2 Adicionar `sendAudio()` em `src/modules/whatsapp/hooks/use-whatsapp-chat.ts` — recebe `{ blob: Blob, duration: number }`, cria mensagem otimista (`kind: "audio"`), lê blob como base64, chama `enviarAudioWhatsapp()`, substitui otimista pela resposta
- [ ] 5.3 Retornar `sendMedia` e `sendAudio` do hook (junto com `sendMessage`, `retryMessage`, etc.)
- [ ] 5.4 Atualizar tipagem `WhatsappChatMessage` em `types.ts` para incluir campos opcionais `fileName`, `mimeType`, `mediaDuration`, `caption` para mensagens de mídia

## 6. UI — Input de Mensagens (Media Picker + Audio Recorder)

- [ ] 6.1 Criar `src/modules/whatsapp/components/chat/media-picker.tsx` — componente com `<input type="file">` oculto, preview de imagem (thumbnail + nome + tamanho), preview de documento (chip com ícone + nome + tamanho), campo de legenda opcional, validação de tamanho e formato no cliente, botão enviar/cancelar
- [ ] 6.2 Criar `src/modules/whatsapp/components/chat/audio-recorder.tsx` — componente com estado de gravação (idle → recording → review), timer MM:SS, waveform animada ou barras de volume, botões Parar/Cancelar durante gravação, botões Enviar/Cancelar após parar, detecção de suporte a `MediaRecorder`, tratamento de permissão negada, limite de 5 minutos
- [ ] 6.3 Atualizar `src/modules/whatsapp/components/chat/whatsapp-message-input.tsx` — conectar botão 📎 ao `MediaPicker`, conectar botão 🎤 ao `AudioRecorder`, alternar entre modo texto e modo mídia/áudio, receber callbacks `onSendMedia` e `onSendAudio` via props
- [ ] 6.4 Atualizar `src/modules/whatsapp/components/chat/whatsapp-chat-panel.tsx` — passar `onSendMedia` e `onSendAudio` do hook para `WhatsappMessageInput`

## 7. UI — Exibição de Mídia nas Mensagens

- [ ] 7.1 Criar `src/modules/whatsapp/components/chat/image-message-bubble.tsx` — componente que recebe `WhatsappChatMessage` com `kind: "image"`, busca mídia do endpoint `/api/whatsapp/chat/media` (mesmo padrão do `AudioMessageBubble`: fetch + cache Map + retry + loading/error states), renderiza thumbnail com dimensões responsivas (max 280px)
- [ ] 7.2 Criar `src/modules/whatsapp/components/chat/document-message-chip.tsx` — componente que recebe `WhatsappChatMessage` com `kind: "document"`, exibe chip com ícone (por tipo de arquivo), nome, tamanho, e botão de download (fetch mídia → criar blob → disparar download)
- [ ] 7.3 Criar `src/modules/whatsapp/components/chat/media-lightbox.tsx` — overlay/dialog para visualização ampliada de imagens, backdrop com clique para fechar, botão X, tecla ESC, transição suave
- [ ] 7.4 Atualizar `src/modules/whatsapp/components/chat/whatsapp-message-bubble.tsx` — renderizar `ImageMessageBubble` para `kind: "image"`, `DocumentMessageChip` para `kind: "document"`, `AudioMessageBubble` (existente) para `kind: "audio"` (tanto incoming quanto outgoing), fallback textual para tipos não suportados
- [ ] 7.5 Atualizar `WhatsappChatMessage.kind` em `types.ts` para incluir `"document"` (já existe `"image"`, `"audio"`, `"video"`, `"document"` no tipo `MessageKind` — verificar alinhamento)

## 8. Integração — Ambos os Chats

- [ ] 8.1 Verificar que `chat-messages-panel.tsx` (usado pelo `/chat`) repassa os novos callbacks `onSendMedia` e `onSendAudio` do hook
- [ ] 8.2 Verificar que `lead-details-drawer.tsx` (usado pelo `/kanban`) repassa os novos callbacks do hook para `WhatsappChatPanel`
- [ ] 8.3 Testar envio de imagem em ambos os chats (`/chat` e `/kanban`)
- [ ] 8.4 Testar gravação e envio de áudio em ambos os chats
- [ ] 8.5 Testar exibição de mídia recebida (imagens, documentos) em ambos os chats

## 9. Validação & Polimento

- [ ] 9.1 Rodar `pnpm lint` e corrigir erros
- [ ] 9.2 Rodar `pnpm build` (ou `pnpm typecheck`) e corrigir erros de tipo
- [ ] 9.3 Testar cenários de erro: WhatsApp offline, PDV sem instância, arquivo grande demais, formato inválido, timeout de upload
- [ ] 9.4 Testar optimistic UI: mensagem aparece imediatamente, spinner/loading aparece durante envio, mensagem é substituída pela resposta do servidor
- [ ] 9.5 Testar em navegador Chromium (gravação de áudio) e verificar mensagem de fallback em navegadores sem suporte

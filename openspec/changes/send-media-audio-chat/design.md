## Context

O CRM possui dois chats que compartilham componentes via `@/modules/whatsapp/`: a página `/chat` (layout 3 colunas) e o drawer de detalhes do lead no kanban (`/kanban`). Ambos usam `useWhatsappChat` (hook) e `WhatsappChatPanel` (componente). O envio de mensagens de texto já funciona via Evolution API (`/message/sendText/{instance}`), com optimistic UI e SSE streaming. O input de mensagens tem três botões-placeholder: emoji, anexo (📎) e microfone (🎤) — nenhum funciona.

O recebimento de mídia já é detectado (tipos `imageMessage`, `videoMessage`, `audioMessage`, `documentMessage` são extraídos de payloads Evolution), mas a exibição é apenas textual (`[Imagem]`, `[Vídeo]`). Áudio recebido tem player completo via `AudioMessageBubble`. A busca de mídia binária (base64) já funciona via `GET /api/whatsapp/chat/media` → Evolution `/chat/getBase64FromMediaMessage/{instance}`.

O banco de dados (`WhatsappMensagem.tipo`) já suporta todos os tipos necessários — não há alteração de schema.

## Goals / Non-Goals

**Goals:**
- Permitir envio de imagens e documentos pelo chat (seleção de arquivo → preview → envio)
- Permitir gravação e envio de áudio pelo chat (tap-to-toggle, timer, cancelar)
- Exibir imagens, vídeos e documentos recebidos inline (thumbnails, lightbox, chips)
- Funcionar em ambos os chats (`/chat` e `/kanban`) sem duplicação de código
- Suportar arquivos grandes (imagens até 10MB, áudio até 20MB, documentos até 100MB)
- Manter o padrão de optimistic UI e tratamento de erros existente
- Tratar edge cases: WhatsApp offline, PDV sem instância, arquivo grande demais, formato não suportado

**Non-Goals:**
- Suporte a vídeo no envio (pode ser adicionado depois — WhatsApp comprime e é raro em CRM)
- Gravação de vídeo
- Envio de stickers
- Emoji picker funcional (placeholder existente permanece)
- Upload com progresso de barra (a complexidade não se justifica para o caso de uso)
- Armazenamento local de mídia (já buscada sob demanda da Evolution API)

## Decisions

### 1. Base64 em JSON como único formato de envio

**Escolha**: Todos os tipos de mídia (imagem, áudio, documento) são enviados como base64 dentro do corpo JSON.

**Alternativa considerada**: FormData/multipart para documentos grandes.

**Razão**: 
- Consistência com o padrão JSON existente no projeto (texto já usa JSON)
- Evolution API aceita base64 nativamente em `/message/sendMedia` e `/message/sendWhatsAppAudio`
- Simplifica o código — único caminho de serialização/validação
- WhatsApp comprime mídia: imagens ~1-2MB, áudio ~500KB-3MB, documentos raramente passam de 30MB reais
- O overhead de base64 (+33%) é aceitável para os tamanhos reais de arquivo no WhatsApp
- Para self-hosted Next.js, `request.json()` não impõe limite de corpo além da memória disponível
- Configuramos `maxDuration = 120` em cada rota para tolerar uploads grandes

### 2. Size limits generosos com validação em duas camadas

| Tipo | Limite Cliente | Limite Servidor (Zod) | Limite WhatsApp |
|------|---------------|----------------------|-----------------|
| Imagem | 10MB | 10MB base64 (≈7.5MB raw) | 5MB |
| Áudio | 20MB | 20MB base64 (≈15MB raw) | 16MB |
| Documento | 100MB | 100MB base64 (≈75MB raw) | 100MB |

**Razão**: Limites no servidor são maiores que os do WhatsApp para evitar falsos rejeitos (o base64 infla o tamanho, e a validação ocorre antes da compressão). O WhatsApp rejeitará no momento do envio se o arquivo real for grande demais — o erro é propagado ao usuário. Limites no cliente são para UX (evitar uploads claramente impossíveis).

### 3. Tap-to-toggle para gravação de áudio

**Escolha**: Usuário toca 🎤 → UI de gravação aparece → timer roda → toca "Parar" para finalizar → toca "Enviar" ou "Cancelar".

**Alternativa considerada**: Hold-to-record estilo WhatsApp nativo (pressiona para gravar, solta para enviar, desliza para cancelar).

**Razão**: 
- Mais simples de implementar (não requer touch events complexos, detecção de slide)
- Mais acessível (funciona com mouse/teclado, não apenas touch)
- Permite revisão antes de enviar (evita envios acidentais)
- Usuários de CRM desktop preferem clique a gestos de touch

### 4. Preview inline de imagens antes do envio

**Escolha**: Após selecionar imagem, mostrar thumbnail + campo de legenda opcional + botão enviar. O arquivo só é lido como base64 no momento do envio (não no momento da seleção).

**Razão**: Evita consumo de memória desnecessário. Permite trocar de arquivo antes de enviar. Campo de legenda é opcional mas adiciona valor (WhatsApp suporta caption em imagens).

### 5. Componente ImageMessageBubble com lazy load e cache

**Escolha**: Mesmo padrão do `AudioMessageBubble` — fetch sob demanda do endpoint `/api/whatsapp/chat/media`, cache em memória (Map com TTL de 5min), retry com backoff.

**Alternativa considerada**: Embed thumbnail na mensagem (armazenar no banco).

**Razão**: O endpoint de mídia já existe e funciona. Armazenar no banco duplicaria dados da Evolution API. Cache em memória é suficiente (os chats raramente têm dezenas de imagens simultâneas). O TTL de 5min alinha com o tempo típico de visualização de um chat.

### 6. Documentos exibidos como chips (não preview inline)

**Escolha**: Documentos (PDFs, etc.) são exibidos como chips com ícone, nome do arquivo, tamanho e botão de download/abrir. Sem preview inline.

**Razão**: Preview de PDF/Office é complexo e de pouco valor para o caso de uso. O WhatsApp também não faz preview inline de documentos. O chip é suficiente para identificar o documento e permitir download.

### 7. maxDuration = 120s nas novas rotas

**Escolha**: Configurar `export const maxDuration = 120` nas rotas de send-media e send-audio.

**Razão**: Uploads de documentos grandes (até 100MB) podem levar tempo. 120 segundos é generoso mas evita timeouts infinitos. O Next.js self-hosted respeita esta configuração.

## Risks / Trade-offs

- **[Risco] Memória do servidor com uploads grandes**: Um documento de 100MB base64 → ~133MB de string JSON → ~400MB de memória durante parsing (objeto JS temporário). Em múltiplos uploads simultâneos, pode pressionar o servidor.
  - **Mitigação**: Limite de 100MB no servidor. Cenário real: documentos WhatsApp raramente passam de 30MB. Monitorar uso de memória em produção.

- **[Risco] Timeout no upload**: Conexões lentas podem timeout antes de completar upload de 100MB.
  - **Mitigação**: `maxDuration = 120` na rota, com timeout de fetch de 30s no cliente. O usuário vê feedback claro de erro e pode reenviar.

- **[Trade-off] Base64 infla payload em 33%**: Comparado a FormData binário, há overhead.
  - **Aceito**: Simplicidade do código supera o overhead. WhatsApp comprime tudo, então o tamanho real transmitido pela Evolution API é o mesmo.

- **[Risco] MediaRecorder não suportado em todos os navegadores**: Safari tem suporte limitado (só mp4/aac, sem opus).
  - **Mitigação**: Detectar suporte e mostrar mensagem "Navegador não suporta gravação". Usuários de CRM tipicamente usam Chrome/Edge (Chromium), onde funciona perfeitamente.

- **[Risco] Arquivo selecionado mas não enviado fica em memória**: Se o usuário seleciona um arquivo e navega para outro chat.
  - **Mitigação**: Limpar estado do picker quando o leadId muda (já é o comportamento natural com a troca de hook).

## Migration Plan

1. Deploy sem necessidade de migração de banco (schema inalterado)
2. Novas rotas são aditivas — rotas existentes não são alteradas
3. Rollback: remover novas rotas e reverter componentes ao estado anterior. Mensagens de mídia já enviadas continuam funcionando (já são persistidas com `tipo` correto).
4. Nenhum downtime necessário.

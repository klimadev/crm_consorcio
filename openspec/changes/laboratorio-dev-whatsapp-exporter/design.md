## Context

O CRM Consórcio é uma aplicação Next.js 15 multi-tenant com três perfis (EMPRESA, GERENTE, COLABORADOR). Atualmente o sidebar possui três seções (GERAL, OPERAÇÃO, SISTEMA) com itens condicionados por perfil. Não existe espaço para funcionalidades experimentais ou de diagnóstico.

O projeto já possui integração completa com a Evolution API (WhatsApp Baileys bridge) em `src/lib/evolution-api.ts`, com suporte a múltiplas instâncias por PDV. As funções existentes cobrem criação de instância, QR code, envio de mensagem, chat em tempo real e busca de contatos — mas não cobrem busca de histórico de mensagens por chat específico.

O design segue o padrão MVVM modular: rotas em `src/app/` delegam para módulos em `src/modules/`, que usam hooks como ViewModel e componentes como View.

## Goals / Non-Goals

**Goals:**
- Adicionar seção "DESENVOLVIMENTO" no sidebar, visualmente distinta, com item "Laboratório" protegido por senha
- Exigir senha (validada client-side via `NEXT_PUBLIC_DEV_PASSWORD`) ao clicar no item; estado não persiste entre F5
- Criar rota `/laboratorio` que renderiza o módulo do laboratório (acessível a qualquer perfil autenticado após senha)
- Implementar WhatsApp Exporter como primeira feature do laboratório:
  - Seleção de múltiplas instâncias WhatsApp com cards e checkboxes
  - Parâmetros configuráveis: limite de chats (1-1000) e mensagens por chat (1-100)
  - Export via API route, consultando a Evolution API diretamente (sem depender do banco local)
  - Resultado: dump de texto formatado por instância, com stats e botões copiar/download
- Adicionar função `buscarMensagensPorChat` ao cliente Evolution API existente
- Adicionar schema Zod `esquemaExportarWhatsapp` para validação

**Non-Goals:**
- Análise com IA (V2)
- Persistência do unlock do laboratório entre recarregamentos
- Streaming ou progresso em tempo real do export
- Cache de mensagens no banco local para o export
- Rate limiting no endpoint de export
- Pipeline animation visual (simplificado comparado ao chamalead, mas funcional)

## Decisions

### 1. Senha client-side vs server-side

**Decisão:** Client-side via `NEXT_PUBLIC_DEV_PASSWORD`.

**Alternativa considerada:** API route `POST /api/dev/validate` com validação server-side.

**Razão:** O usuário explicitamente pediu "simples". A área é de desenvolvimento, não requer segurança de produção. Uma variável de ambiente com prefixo `NEXT_PUBLIC_` é suficiente. A senha fica exposta no bundle? Sim, mas é uma feature dev com propósito claro.

### 2. Item do sidebar: seção separada vs item existente

**Decisão:** Nova seção "DESENVOLVIMENTO" com tratamento visual distinto.

**Alternativa considerada:** Adicionar como item dentro de SISTEMA.

**Razão:** O usuário quer que seja "semanticamente evidente que é do dev". Uma seção separada com cor âmbar (`text-amber-500`) e badge "DEV" destoa visualmente do slate/emerald padrão, tornando impossível confundir com features de produção. O `ItemMenu` existente já suporta `badge` — estendemos com suporte a cor customizada.

### 3. Seleção de instâncias: dropdown único vs multi-select

**Decisão:** Grid de cards com checkbox (multi-select).

**Alternativa considerada:** Dropdown com instância única.

**Razão:** O CRM tem múltiplas instâncias por empresa (uma por PDV). O usuário quer exportar várias de uma vez. Cards com checkbox são mais informativos que dropdown (mostram foto, telefone, status) e a seleção múltipla é intuitiva.

### 4. Origem dos dados: Evolution API vs banco local

**Decisão:** Evolution API diretamente (sem usar `WhatsappMensagem` do banco).

**Alternativa considerada:** Buscar do banco local `WhatsappMensagem`.

**Razão:** O usuário pediu "direto na evo". O banco local contém apenas mensagens que passaram pelo chat do CRM, enquanto a Evolution API tem o histórico completo do WhatsApp. Para um dump de auditoria, o histórico completo é essencial.

### 5. Nova função no evolution-api.ts: dedicada vs reuso

**Decisão:** Nova função `buscarMensagensPorChat(instanceName, remoteJid, limite)`.

**Alternativa considerada:** Adaptar `buscarConversasEvolution` (que é search-based e exige termo).

**Razão:** As funções existentes não cobrem o caso de uso. `buscarConversasEvolution` usa filtro OR com termo de busca. `buscarMensagens` retorna contatos agregados, não mensagens individuais. Precisamos de uma função que busque o histórico de mensagens de um JID específico — um endpoint padrão da Evolution API (`POST /chat/findMessages/{name}` com `where.key.remoteJid`).

### 6. Formato do dump: mesmo do chamalead vs customizado

**Decisão:** Mesmo formato do chamalead (headers, `--- Chat: Nome | N mensagens ---`, timestamps `[AAAA-MM-DD HH:MM:SS]`).

**Razão:** Consistência com a referência. O formato é limpo, otimizado para leitura por LLM, e já validado em produção.

### 7. Estrutura de arquivos: submódulo vs módulo independente

**Decisão:** Módulo `laboratorio/` com submódulo `whatsapp-exporter/`.

**Alternativa considerada:** Módulo `whatsapp-exporter/` independente.

**Razão:** O laboratório terá múltiplas features experimentais no futuro. Estruturar com um módulo pai e submódulos por feature segue o padrão MVVM e evita poluição no `src/modules/`. A página principal (`page.tsx`) serve como shell/roteador interno do laboratório.

## Risks / Trade-offs

**[Risco] Export pesado com muitas instâncias pode exceder timeout da API route**
→ Mitigação: Limites configuráveis (máx 1000 chats, máx 100 msgs/chat). O usuário controla o volume. Erro de timeout é tratado com mensagem clara sugerindo reduzir limites.

**[Risco] Senha exposta no bundle JS (NEXT_PUBLIC_DEV_PASSWORD)**
→ Trade-off aceito: é uma feature dev, não de segurança. O valor de DX supera o risco.

**[Risco] API route bloqueia a thread do Node.js durante export sequencial de múltiplas instâncias**
→ Mitigação V1: limites baixos por padrão (500 chats, 30 msgs/chat). V2 pode usar streaming ou processamento assíncrono.

**[Trade-off] Sem IA na V1**
→ O usuário escolheu adiar. O dump de texto puro já entrega valor para auditoria, debug e preparação para IA futura.

## Open Questions

Nenhuma. Todas as decisões de design foram resolvidas durante a fase de exploração.

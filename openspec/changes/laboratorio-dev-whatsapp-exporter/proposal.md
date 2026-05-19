## Why

O CRM não possui um espaço reservado para funcionalidades experimentais ou ferramentas de diagnóstico que estão em desenvolvimento. A primeira necessidade concreta desse espaço é um exportador de histórico de conversas do WhatsApp, capaz de gerar um dump de texto formatado a partir de múltiplas instâncias conectadas à Evolution API — útil para auditoria, debug e futura integração com IA.

## What Changes

- Nova seção "DESENVOLVIMENTO" no sidebar, visível para todos os perfis (EMPRESA, GERENTE, COLABORADOR)
- Item "Laboratório" com badge "DEV" e tratamento visual distinto (âmbar), que ao ser clicado exige senha via modal
- Senha validada client-side via variável de ambiente `NEXT_PUBLIC_DEV_PASSWORD`; estado não persiste entre recarregamentos
- Rota `/laboratorio` protegida por sessão (acessível a qualquer perfil autenticado após senha)
- Módulo WhatsApp Exporter (primeira feature do laboratório):
  - Seleção de múltiplas instâncias WhatsApp (cards com checkbox)
  - Configuração de limite de chats e mensagens por chat
  - Export via API route dedicada que consulta a Evolution API por instância
  - Resultados exibidos como dump de texto formatado por instância, com botões de copiar e download
- Nova função `buscarMensagensPorChat` no cliente Evolution API para buscar histórico de mensagens de um chat específico
- Novo schema Zod `esquemaExportarWhatsapp` para validação do payload de exportação

## Capabilities

### New Capabilities

- `dev-lab-access`: Seção de desenvolvimento no sidebar com acesso controlado por senha, visível para todos os perfis
- `whatsapp-chat-exporter`: Exportação de histórico de conversas do WhatsApp em formato texto, com seleção de múltiplas instâncias e limites configuráveis

### Modified Capabilities

<!-- Nenhum spec existente é modificado -->

## Impact

- **Sidebar**: Adição de uma nova seção e item no `sidebar-principal.tsx` (sem quebrar seções existentes)
- **Evolution API**: Adição da função `buscarMensagensPorChat` em `src/lib/evolution-api.ts` (extensão, não modificação)
- **Validações**: Novo schema Zod em `src/lib/validacoes.ts`
- **Novas rotas**: `/laboratorio` (página), `/api/dev/whatsapp-exporter` (API route)
- **Novo módulo MVVM**: `src/modules/laboratorio/` com submódulo `whatsapp-exporter/`
- **Novo componente**: `modal-senha-dev.tsx` em `src/components/`
- **Dependência**: Nenhuma nova dependência externa; reutiliza Evolution API existente

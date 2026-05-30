## Why

A chave do canal SSE de conversas no `/chat` não inclui o identificador do usuário (`id_usuario`), causando reuso do mesmo canal entre usuários diferentes da mesma empresa. Como o snapshot carregado captura a sessão do primeiro assinante na closure, os demais usuários recebem dados filtrados pela sessão errada — um colaborador pode ver leads alheios e um gerente pode ver leads de apenas um colaborador em vez do PDV inteiro.

## What Changes

- Incluir `id_usuario` na chave do canal SSE de conversas, isolando cada usuário em seu próprio canal e eliminando o vazamento de dados entre perfis distintos.

## Capabilities

### New Capabilities

- `chat-sse-isolamento-usuario`: O stream SSE de conversas do chat deve isolar cada usuário em um canal independente, garantindo que a filtragem por perfil (COLABORADOR, GERENTE, EMPRESA) aplicada no servidor seja respeitada para todos os assinantes do stream.

### Modified Capabilities

<!-- Nenhuma. A filtragem de leads por perfil no backend (`whereLeadsPorPerfil`, `obterSnapshotConversas`) já existe e não muda. -->

## Impact

- `src/lib/whatsapp-chat-realtime.ts` — `criarChaveConversasStream` (linha 525): adicionar parâmetro `idUsuario` e compor a chave
- `src/app/api/whatsapp/chat/conversations/stream/route.ts` (linha 16): passar `sessao.id_usuario` na chamada
